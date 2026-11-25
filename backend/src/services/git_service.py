"""真实 Git 操作服务。

只依赖标准库与 git CLI，不依赖 FastAPI / SQLAlchemy，便于单元测试。
所有命令均以参数列表方式执行（``shell=False``），并限制在仓库目录内。
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

from config.settings import settings
from models.git import GitCommit, GitConflict, GitFile, GitFileState
from utils.errors import ConflictError, GitError

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
            raise GitError(408, f"Git 操作超时（>{self.timeout}s）") from exc
        except FileNotFoundError as exc:
            raise GitError(500, "服务器未安装 git") from exc

        if check and result.returncode != 0:
            message = (result.stderr or result.stdout or "Git 操作失败").strip()
            raise GitError(400, message.splitlines()[-1] if message else "Git 操作失败")
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
    def _map_state(code: str) -> GitFileState:
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
        status = self.status()
        conflicts: list[GitConflict] = []
        for item in status.conflicts:
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
    def log(self, limit: int = 20) -> list[GitCommit]:
        result = self._run(
            "log",
            f"-n{max(1, min(limit, 100))}",
            "--date=format-local:%Y-%m-%d %H:%M",
            "--pretty=format:%H%x09%h%x09%an%x09%ad%x09%s",
            check=False,
        )
        if result.returncode != 0:
            return []
        commits: list[GitCommit] = []
        for line in result.stdout.splitlines():
            parts = line.split("\t", 4)
            if len(parts) != 5:
                continue
            commits.append(
                GitCommit(
                    hash=parts[0],
                    short_hash=parts[1],
                    author=parts[2],
                    date=parts[3],
                    subject=parts[4],
                )
            )
        return commits

    # ------------------------------------------------------------------ 提交
    def commit(self, message: str, paths: list[str] | None, all_changes: bool) -> str:
        status = self.status()
        if status.conflicts:
            raise ConflictError("存在未解决的冲突，请先解决后再提交")
        if all_changes:
            self._run("add", "-A")
        else:
            safe_paths = [self._safe_rel(path) for path in (paths or [])]
            if not safe_paths:
                raise GitError(400, "请选择要提交的文件")
            self._run("add", "--", *safe_paths)

        staged = self._run("diff", "--cached", "--quiet", check=False)
        if staged.returncode == 0:
            raise GitError(400, "没有可提交的变更")
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
        raise GitError(400, message.splitlines()[-1] if message else "拉取失败")

    def push(self) -> str:
        self._upstream()
        result = self._run("push", check=False)
        if result.returncode == 0:
            return "推送完成"
        message = (result.stderr or result.stdout or "推送失败").strip()
        last_line = message.splitlines()[-1] if message else "推送失败"
        if "non-fast-forward" in message or "fetch first" in message or "rejected" in message:
            raise ConflictError("远端有新提交，请先拉取")
        raise GitError(400, last_line)

    def _upstream(self) -> str:
        result = self._run("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}", check=False)
        upstream = result.stdout.strip()
        if result.returncode != 0 or not upstream:
            raise GitError(400, "当前分支未设置上游分支，请先在仓库中配置")
        return upstream

    # ------------------------------------------------------------------ 冲突处理
    def resolve_conflict(self, path: str, strategy: str, content: str | None) -> str:
        safe = self._safe_rel(path)
        conflict_paths = {item.path for item in self.status().conflicts}
        if safe not in conflict_paths:
            raise GitError(400, f"{safe} 不是当前冲突文件")

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
                raise GitError(400, "缺少合并内容")
            if len(content.encode("utf-8")) > self.max_file_bytes:
                raise GitError(400, "合并内容超过大小限制")
            abs_path = self._abs_path(safe)
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.write_text(content, encoding="utf-8")
            self._run("add", "--", safe)
            return "已保存合并结果"

        raise GitError(400, "不支持的冲突处理方式")

    def continue_merge(self) -> str:
        if not (self.repo_path / ".git" / "MERGE_HEAD").exists():
            raise GitError(400, "当前没有可继续的合并")
        if self.status().conflicts:
            raise ConflictError("仍有未解决的冲突")
        self._run("commit", "--no-edit")
        return "合并完成"

    def abort_merge(self) -> str:
        if not (self.repo_path / ".git" / "MERGE_HEAD").exists():
            raise GitError(400, "当前没有可放弃的合并")
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
            raise GitError(400, f"非法文件路径: {raw!r}")
        rel = Path(raw)
        if rel.is_absolute() or any(part == ".." for part in rel.parts):
            raise GitError(400, f"文件路径越界: {raw}")
        if rel.parts and rel.parts[0] == ".git":
            raise GitError(400, "不允许直接操作 .git 目录")
        abs_path = self._abs_path(str(rel))
        if not abs_path.is_relative_to(self.repo_path):
            raise GitError(400, f"文件路径越界: {raw}")
        return rel.as_posix()

    def _abs_path(self, rel: str) -> Path:
        return (self.repo_path / rel).resolve()
