"""Git 模块业务逻辑（迁自旧 src/services/git_service.py + git_registry_service.py）。

安全约束保持不变：
- subprocess 参数列表执行（shell=False）+ 超时；
- 所有仓库路径限定在 KNOWLEDGE_ROOT 内（拒绝绝对路径/``..``/符号链接逃逸）；
- 单仓库 asyncio.Lock 串行执行；
- 动作审计写 git_actions，失败也记录。
"""

from __future__ import annotations

import asyncio
import os
import re
import subprocess
import uuid
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.git.models import GitRepoModel
from app.api.v1.git.repository import GitRepository
from app.api.v1.git.schemas import (
    GitActionOut,
    GitCommitOut,
    GitConflict,
    GitCounts,
    GitFile,
    GitRepoOut,
)
from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError

CONFLICT_CODES = {"DD", "AU", "UD", "UA", "DU", "AA", "UU"}
_BRANCH_AHEAD = re.compile(r"ahead (\d+)")
_BRANCH_BEHIND = re.compile(r"behind (\d+)")


class GitStatusResult:
    def __init__(
        self,
        branch: str,
        upstream: str | None,
        ahead: int,
        behind: int,
        merging: bool,
        files: list[GitFile],
    ) -> None:
        self.branch = branch
        self.upstream = upstream
        self.ahead = ahead
        self.behind = behind
        self.merging = merging
        self.files = files

    @property
    def conflicts(self) -> list[GitFile]:
        return [item for item in self.files if item.conflict]


class GitService:
    """真实 Git 操作（只依赖标准库与 git CLI，方法均为同步，调用方走线程池）。"""

    def __init__(self, repo_path: Path) -> None:
        self.repo_path = repo_path.resolve()
        self.timeout = settings.GIT_OPERATION_TIMEOUT
        self.max_file_bytes = settings.GIT_MAX_FILE_BYTES
        self.author_name = settings.GIT_AUTHOR_NAME
        self.author_email = settings.GIT_AUTHOR_EMAIL

    # ------------------------------------------------------------------ 基础
    def _env(self) -> dict[str, str]:
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        env["GIT_AUTHOR_NAME"] = self.author_name
        env["GIT_AUTHOR_EMAIL"] = self.author_email
        env["GIT_COMMITTER_NAME"] = self.author_name
        env["GIT_COMMITTER_EMAIL"] = self.author_email
        return env

    def _base_cmd(self) -> list[str]:
        return [
            "git",
            "-c",
            f"user.name={self.author_name}",
            "-c",
            f"user.email={self.author_email}",
        ]

    def _run(self, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        cmd = [*self._base_cmd(), *args]
        try:
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                env=self._env(),
                capture_output=True,
                text=True,
                errors="replace",
                timeout=self.timeout,
                shell=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise BadRequestError(f"Git 操作超时（>{self.timeout}s）") from exc
        except FileNotFoundError as exc:
            raise BadRequestError("服务器未安装 git") from exc

        if check and result.returncode != 0:
            message = (result.stderr or result.stdout or "Git 操作失败").strip()
            raise BadRequestError(
                message.splitlines()[-1] if message else "Git 操作失败"
            )
        return result

    def is_repo(self) -> bool:
        result = self._run("rev-parse", "--is-inside-work-tree", check=False)
        return result.returncode == 0 and result.stdout.strip() == "true"

    def init(self, default_branch: str = "main", initial_commit: bool = True) -> None:
        self.repo_path.mkdir(parents=True, exist_ok=True)
        if self.is_repo():
            return
        self._run("init", "-b", default_branch)
        if initial_commit:
            self._run("add", "-A")
            staged = self._run("diff", "--cached", "--quiet", check=False)
            if staged.returncode != 0:
                self._run("commit", "-m", "初始化知识仓库")

    # ------------------------------------------------------------------ 状态
    def status(self) -> GitStatusResult:
        result = self._run("status", "--porcelain=v1", "-z", "--branch")
        tokens = result.stdout.split("\0")
        branch = ""
        upstream: str | None = None
        ahead = 0
        behind = 0
        files: list[GitFile] = []

        index = 0
        while index < len(tokens):
            token = tokens[index]
            index += 1
            if not token:
                continue
            if token.startswith("## "):
                branch, upstream, ahead, behind = self._parse_branch(token[3:])
                continue
            if len(token) < 3:
                continue
            code = token[:2]
            path = token[3:]
            if "R" in code or "C" in code:
                # -z 模式下重命名/复制记录后面紧跟原路径，跳过
                if index < len(tokens):
                    index += 1
            files.append(
                GitFile(
                    path=path,
                    code=code,
                    state=self._map_state(code),
                    staged=code[0] not in (" ", "?") and code not in CONFLICT_CODES,
                    conflict=code in CONFLICT_CODES,
                )
            )

        return GitStatusResult(
            branch=branch or "HEAD",
            upstream=upstream,
            ahead=ahead,
            behind=behind,
            merging=(self.repo_path / ".git" / "MERGE_HEAD").exists(),
            files=files,
        )

    @staticmethod
    def _parse_branch(text: str) -> tuple[str, str | None, int, int]:
        branch_part = text.split(" [", 1)[0].strip()
        if "..." in branch_part:
            branch, upstream = branch_part.split("...", 1)
        else:
            branch, upstream = branch_part, None
        if branch.startswith("No commits yet on "):
            branch = branch.replace("No commits yet on ", "", 1)
        branch = branch.replace("HEAD (no branch)", "HEAD").strip()
        ahead_match = _BRANCH_AHEAD.search(text)
        behind_match = _BRANCH_BEHIND.search(text)
        return (
            branch.strip(),
            upstream.strip() if upstream else None,
            int(ahead_match.group(1)) if ahead_match else 0,
            int(behind_match.group(1)) if behind_match else 0,
        )

    @staticmethod
    def _map_state(code: str) -> str:
        if code == "??":
            return "untracked"
        if code in CONFLICT_CODES:
            return "conflict"
        if "R" in code:
            return "renamed"
        if "C" in code:
            return "copied"
        if "A" in code:
            return "added"
        if "D" in code:
            return "deleted"
        if "M" in code or "T" in code:
            return "modified"
        return "changed"

    # ------------------------------------------------------------------ 冲突
    def conflicts(self) -> list[GitConflict]:
        conflicts: list[GitConflict] = []
        for item in self.status().conflicts:
            conflicts.append(
                GitConflict(
                    path=item.path,
                    ours=self._show_stage(2, item.path),
                    theirs=self._show_stage(3, item.path),
                    working=self._read_working(item.path),
                )
            )
        return conflicts

    def _show_stage(self, stage: int, path: str) -> str:
        self._safe_rel(path)
        result = self._run("show", f":{stage}:{path}", check=False)
        if result.returncode != 0:
            return ""
        return self._truncate(result.stdout)

    def _read_working(self, path: str) -> str:
        abs_path = self._abs_path(path)
        if not abs_path.exists() or not abs_path.is_file():
            return ""
        try:
            data = abs_path.read_bytes()[: self.max_file_bytes]
            return self._truncate(data.decode("utf-8", errors="replace"))
        except OSError:
            return ""

    def _truncate(self, content: str) -> str:
        raw = content.encode("utf-8", errors="replace")
        if len(raw) <= self.max_file_bytes:
            return content
        return raw[: self.max_file_bytes].decode("utf-8", errors="ignore") + "\n...（内容已截断）"

    # ------------------------------------------------------------------ 历史
    _LOG_FORMAT = "%H%x09%h%x09%an%x09%aI%x09%s"  # aI = 严格 ISO8601（P5）

    def log_page(self, page: int = 1, page_size: int = 20) -> tuple[int, list[GitCommitOut]]:
        """分页提交历史：返回 (total, items)。"""
        count = self._run("rev-list", "--count", "HEAD", check=False)
        total = int(count.stdout.strip() or 0) if count.returncode == 0 else 0
        if total == 0:
            return 0, []
        offset = (max(1, page) - 1) * page_size
        result = self._run(
            "log",
            f"--skip={offset}",
            f"-n{page_size}",
            "--pretty=format:" + self._LOG_FORMAT,
            check=False,
        )
        return total, self._parse_log(result.stdout)

    def log(self, limit: int = 20) -> list[GitCommitOut]:
        result = self._run(
            "log",
            f"-n{max(1, min(limit, 100))}",
            "--pretty=format:" + self._LOG_FORMAT,
            check=False,
        )
        return self._parse_log(result.stdout)

    def _parse_log(self, stdout: str) -> list[GitCommitOut]:
        commits: list[GitCommitOut] = []
        for line in stdout.splitlines():
            parts = line.split("\t", 4)
            if len(parts) != 5:
                continue
            try:
                date = datetime.fromisoformat(parts[3])
            except ValueError:
                continue
            commits.append(
                GitCommitOut(
                    hash=parts[0],
                    short_hash=parts[1],
                    author=parts[2],
                    date=date,
                    subject=parts[4],
                )
            )
        return commits

    # ------------------------------------------------------------------ 提交
    def commit(self, message: str, paths: list[str] | None, all_changes: bool) -> str:
        status = self.status()
        if status.conflicts:
            raise BadRequestError("存在未解决的冲突，请先解决后再提交")
        if all_changes:
            self._run("add", "-A")
        else:
            safe_paths = [self._safe_rel(path) for path in (paths or [])]
            if not safe_paths:
                raise BadRequestError("请选择要提交的文件")
            self._run("add", "--", *safe_paths)

        staged = self._run("diff", "--cached", "--quiet", check=False)
        if staged.returncode == 0:
            raise BadRequestError("没有可提交的变更")
        self._run("commit", "-m", message)
        return "提交完成"

    # ------------------------------------------------------------------ 同步
    def pull(self) -> str:
        upstream = self._upstream()
        self._run("fetch", "--prune")
        merge = self._run("merge", "--no-edit", upstream, check=False)
        if merge.returncode == 0:
            if "Already up to date" in merge.stdout or "Already up-to-date" in merge.stdout:
                return "已是最新版本"
            return "拉取完成"
        status = self.status()
        if status.conflicts:
            return "拉取产生冲突，请解决后完成合并"
        message = (merge.stderr or merge.stdout or "拉取失败").strip()
        raise BadRequestError(message.splitlines()[-1] if message else "拉取失败")

    def push(self) -> str:
        self._upstream()
        result = self._run("push", check=False)
        if result.returncode == 0:
            return "推送完成"
        message = (result.stderr or result.stdout or "推送失败").strip()
        last_line = message.splitlines()[-1] if message else "推送失败"
        if "non-fast-forward" in message or "fetch first" in message or "rejected" in message:
            raise BadRequestError("远端有新提交，请先拉取")
        raise BadRequestError(last_line)

    def _upstream(self) -> str:
        result = self._run(
            "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}", check=False
        )
        upstream = result.stdout.strip()
        if result.returncode != 0 or not upstream:
            raise BadRequestError("当前分支未设置上游分支，请先在仓库中配置")
        return upstream

    # ------------------------------------------------------------------ 冲突处理
    def resolve_conflict(self, path: str, strategy: str, content: str | None) -> str:
        safe = self._safe_rel(path)
        conflict_paths = {item.path for item in self.status().conflicts}
        if safe not in conflict_paths:
            raise BadRequestError(f"{safe} 不是当前冲突文件")

        if strategy in ("ours", "theirs"):
            stage = 2 if strategy == "ours" else 3
            exists = self._run("cat-file", "-e", f":{stage}:{safe}", check=False)
            if exists.returncode != 0:
                self._run("rm", "-f", "--", safe, check=False)
            else:
                self._run("checkout", f"--{strategy}", "--", safe)
            self._run("add", "--", safe)
            return "已保留本地版本" if strategy == "ours" else "已保留远端版本"

        if strategy == "content":
            if content is None:
                raise BadRequestError("缺少合并内容")
            if len(content.encode("utf-8")) > self.max_file_bytes:
                raise BadRequestError("合并内容超过大小限制")
            abs_path = self._abs_path(safe)
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.write_text(content, encoding="utf-8")
            self._run("add", "--", safe)
            return "已保存合并结果"

        raise BadRequestError("不支持的冲突处理方式")

    def continue_merge(self) -> str:
        if not (self.repo_path / ".git" / "MERGE_HEAD").exists():
            raise BadRequestError("当前没有可继续的合并")
        if self.status().conflicts:
            raise BadRequestError("仍有未解决的冲突")
        self._run("commit", "--no-edit")
        return "合并完成"

    def abort_merge(self) -> str:
        if not (self.repo_path / ".git" / "MERGE_HEAD").exists():
            raise BadRequestError("当前没有可放弃的合并")
        self._run("merge", "--abort")
        return "已放弃合并"

    # ------------------------------------------------------------------ 工具
    def remote_url(self) -> str | None:
        result = self._run("remote", "get-url", "origin", check=False)
        if result.returncode != 0:
            return None
        return result.stdout.strip() or None

    def ensure_remote(self, url: str) -> None:
        target = (url or "").strip()
        if not target:
            return
        if self.remote_url() is None:
            self._run("remote", "add", "origin", target)
        else:
            self._run("remote", "set-url", "origin", target)

    def _safe_rel(self, raw: str) -> str:
        if not raw or raw.startswith("-"):
            raise BadRequestError(f"非法文件路径: {raw!r}")
        rel = Path(raw)
        if rel.is_absolute() or any(part == ".." for part in rel.parts):
            raise BadRequestError(f"文件路径越界: {raw}")
        if rel.parts and rel.parts[0] == ".git":
            raise BadRequestError("不允许直接操作 .git 目录")
        abs_path = self._abs_path(str(rel))
        if not abs_path.is_relative_to(self.repo_path):
            raise BadRequestError(f"文件路径越界: {raw}")
        return rel.as_posix()

    def _abs_path(self, rel: str) -> Path:
        return (self.repo_path / rel).resolve()


# ==========================================================================
# 仓库登记与操作编排
# ==========================================================================

_LOCKS: dict[str, asyncio.Lock] = {}


def _lock_for(repo_id: uuid.UUID) -> asyncio.Lock:
    key = str(repo_id)
    if key not in _LOCKS:
        _LOCKS[key] = asyncio.Lock()
    return _LOCKS[key]


def knowledge_root() -> Path:
    return Path(settings.KNOWLEDGE_ROOT).resolve()


def resolve_repo_path(fs_path: str, root: Path | None = None) -> Path:
    """把登记的相对路径解析为 KNOWLEDGE_ROOT 内的真实目录。

    拒绝绝对路径、``..`` 越界与符号链接逃逸。
    """
    base = (root or knowledge_root()).resolve()
    raw = (fs_path or "").strip()
    if raw in ("", "."):
        candidate = base
    else:
        rel = Path(raw)
        if rel.is_absolute() or any(part == ".." for part in rel.parts):
            raise BadRequestError(f"仓库路径越界: {fs_path}")
        candidate = (base / rel).resolve()
    if not candidate.is_relative_to(base):
        raise BadRequestError(f"仓库路径越界: {fs_path}")
    return candidate


def validate_repo_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise BadRequestError("仓库名称不能为空")
    if len(cleaned) > 120:
        raise BadRequestError("仓库名称不能超过 120 个字符")
    return cleaned


def to_relative_fs_path(path: Path) -> str:
    relative = path.resolve().relative_to(knowledge_root())
    return "" if str(relative) == "." else relative.as_posix()


class GitRegistryService:
    """组合 GitService（真实 Git）与 GitRepository（登记/审计）。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = GitRepository(session)

    # ------------------------------------------------------------- 查询
    async def list_repos(self) -> list[GitRepoOut]:
        rows = await self.repository.list_repos()
        return [await self._build_view(row) for row in rows]

    async def get_repo(self, repo_id: uuid.UUID) -> GitRepoOut:
        row = await self._require(repo_id)
        return await self._build_view(row)

    # ------------------------------------------------------------- 登记
    async def create_repo(
        self, *, name: str, fs_path: str, init: bool, remote_url: str | None
    ) -> GitRepoOut:
        cleaned = validate_repo_name(name)
        if await self.repository.get_by_name(cleaned):
            raise BadRequestError("仓库名称已存在")

        path = resolve_repo_path(fs_path)
        if not path.exists():
            raise NotFoundError(f"目录不存在: {fs_path or '/'}")
        if not path.is_dir():
            raise BadRequestError(f"不是目录: {fs_path or '/'}")
        relative = to_relative_fs_path(path)
        if await self.repository.get_by_path(relative):
            raise BadRequestError("该目录已登记为知识仓库")

        service = GitService(path)
        if not await asyncio.to_thread(service.is_repo):
            if not init:
                raise BadRequestError("目标目录不是 Git 仓库，请勾选「初始化仓库」后重试")
            await asyncio.to_thread(service.init)
        if remote_url:
            await asyncio.to_thread(service.ensure_remote, remote_url)

        row = await self.repository.create(
            name=cleaned, fs_path=relative, remote_url=remote_url
        )
        await self.session.commit()
        return await self._build_view(row)

    async def delete_repo(self, repo_id: uuid.UUID) -> None:
        row = await self._require(repo_id)
        await self.repository.remove(row)
        await self.session.commit()

    # ------------------------------------------------------------- 操作
    async def commit(
        self, repo_id: uuid.UUID, *, message: str, paths: list[str] | None, all_changes: bool
    ) -> tuple[GitRepoOut, str]:
        return await self._execute(
            repo_id,
            action="commit",
            files=paths if not all_changes else None,
            fn=lambda service: service.commit(message, paths, all_changes),
        )

    async def pull(self, repo_id: uuid.UUID) -> tuple[GitRepoOut, str]:
        return await self._execute(repo_id, action="pull", fn=lambda service: service.pull())

    async def push(self, repo_id: uuid.UUID) -> tuple[GitRepoOut, str]:
        return await self._execute(repo_id, action="push", fn=lambda service: service.push())

    async def resolve_conflict(
        self, repo_id: uuid.UUID, *, path: str, strategy: str, content: str | None
    ) -> tuple[GitRepoOut, str]:
        return await self._execute(
            repo_id,
            action="resolve",
            files=[path],
            fn=lambda service: service.resolve_conflict(path, strategy, content),
        )

    async def continue_merge(self, repo_id: uuid.UUID) -> tuple[GitRepoOut, str]:
        return await self._execute(
            repo_id, action="merge-continue", fn=lambda service: service.continue_merge()
        )

    async def abort_merge(self, repo_id: uuid.UUID) -> tuple[GitRepoOut, str]:
        return await self._execute(
            repo_id, action="merge-abort", fn=lambda service: service.abort_merge()
        )

    # ------------------------------------------------------------- 历史/审计
    async def log_page(
        self, repo_id: uuid.UUID, *, page: int, page_size: int
    ) -> tuple[int, list[GitCommitOut]]:
        row = await self._require(repo_id)
        service = GitService(self._repo_path(row.fs_path))
        return await asyncio.to_thread(service.log_page, page, page_size)

    async def actions_page(
        self, repo_id: uuid.UUID, *, page: int, page_size: int
    ) -> tuple[int, list[GitActionOut]]:
        await self._require(repo_id)
        total = await self.repository.count_actions(repo_id)
        rows = await self.repository.list_actions_page(
            repo_id, offset=(page - 1) * page_size, limit=page_size
        )
        return total, [self._action_view(item) for item in rows]

    # ------------------------------------------------------------- 内部
    async def _execute(
        self,
        repo_id: uuid.UUID,
        *,
        action: str,
        fn: Callable[[GitService], str],
        files: list[str] | None = None,
    ) -> tuple[GitRepoOut, str]:
        row = await self._require(repo_id)
        path = self._repo_path(row.fs_path)
        service = GitService(path)

        async with _lock_for(repo_id):
            try:
                message = await asyncio.to_thread(fn, service)
            except BadRequestError as exc:
                await self.repository.add_action(
                    repository_id=row.id,
                    action=action,
                    message=exc.msg,
                    files=files,
                    ok=False,
                )
                await self.session.commit()
                raise
            ok = "冲突" not in message
            await self.repository.add_action(
                repository_id=row.id,
                action=action,
                message=message,
                files=files,
                ok=ok,
            )
            await self.session.commit()

        return await self._build_view(row), message

    async def _require(self, repo_id: uuid.UUID) -> GitRepoModel:
        row = await self.repository.get(repo_id)
        if row is None:
            raise NotFoundError("知识仓库不存在")
        return row

    def _repo_path(self, fs_path: str) -> Path:
        path = resolve_repo_path(fs_path)
        if not path.exists() or not path.is_dir():
            raise NotFoundError("知识仓库目录不存在，请检查挂载路径")
        return path

    @staticmethod
    def _action_view(item) -> GitActionOut:
        return GitActionOut(
            id=item.id,
            ts=item.ts,
            action=item.action,
            message=item.message,
            files=list(item.files or []),
            ok=item.ok,
        )

    async def _build_view(self, row: GitRepoModel) -> GitRepoOut:
        actions = await self.repository.list_actions(row.id, 60)
        action_views = [self._action_view(item) for item in actions]

        try:
            path = self._repo_path(row.fs_path)
            service = GitService(path)
            status = await asyncio.to_thread(service.status)
        except BadRequestError:
            return GitRepoOut(
                id=row.id,
                name=row.name,
                path=str(Path(settings.KNOWLEDGE_ROOT) / row.fs_path),
                fs_path=row.fs_path,
                branch="不可用",
                remote=row.remote_url,
                actions=action_views,
                counts=GitCounts(),
            )

        conflicts: list[GitConflict] = []
        if status.conflicts:
            conflicts = await asyncio.to_thread(service.conflicts)
        _, log = await asyncio.to_thread(service.log_page, 1, 20)
        remote = await asyncio.to_thread(service.remote_url)

        counts = GitCounts()
        for item in status.files:
            counts.total += 1
            if item.conflict:
                counts.conflict += 1
            elif item.state == "untracked":
                counts.untracked += 1
            elif item.staged:
                counts.staged += 1
            else:
                counts.unstaged += 1

        return GitRepoOut(
            id=row.id,
            name=row.name,
            path=str(path),
            fs_path=row.fs_path,
            branch=status.branch,
            upstream=status.upstream,
            ahead=status.ahead,
            behind=status.behind,
            remote=remote or row.remote_url,
            merging=status.merging,
            files=status.files,
            conflicts=conflicts,
            counts=counts,
            log=log,
            actions=action_views,
        )
