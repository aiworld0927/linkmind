"""Git 仓库注册表与操作编排。

职责：
- 校验仓库路径必须位于 KNOWLEDGE_ROOT 内；
- 组合 GitService（真实 Git）与 GitRepository（PostgreSQL 登记/审计）；
- 每个仓库一个 asyncio.Lock，Git 操作串行执行。
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from config.settings import settings
from models.git import (
    GitActionView,
    GitCounts,
    GitRepoView,
)
from repositories.git_repository import GitRepository
from services.git_service import GitService
from utils.errors import BusinessError, ConflictError, GitError, NotFoundError

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
            raise GitError(400, f"仓库路径越界: {fs_path}")
        candidate = (base / rel).resolve()
    if not candidate.is_relative_to(base):
        raise GitError(400, f"仓库路径越界: {fs_path}")
    return candidate


def validate_repo_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise GitError(400, "仓库名称不能为空")
    if len(cleaned) > 120:
        raise GitError(400, "仓库名称不能超过 120 个字符")
    return cleaned


def to_relative_fs_path(path: Path) -> str:
    relative = path.resolve().relative_to(knowledge_root())
    return "" if str(relative) == "." else relative.as_posix()


class GitRegistryService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = GitRepository(session)

    # ------------------------------------------------------------- 查询
    async def list_repos(self) -> list[GitRepoView]:
        rows = await self.repository.list_repos()
        return [await self._build_view(row) for row in rows]

    async def get_repo(self, repo_id: uuid.UUID) -> GitRepoView:
        row = await self._require(repo_id)
        return await self._build_view(row)

    # ------------------------------------------------------------- 登记
    async def create_repo(
        self,
        *,
        name: str,
        fs_path: str,
        init: bool,
        remote_url: str | None,
    ) -> GitRepoView:
        cleaned = validate_repo_name(name)
        if await self.repository.get_by_name(cleaned):
            raise ConflictError("仓库名称已存在")

        path = resolve_repo_path(fs_path)
        if not path.exists():
            raise GitError(404, f"目录不存在: {fs_path or '/'}")
        if not path.is_dir():
            raise GitError(400, f"不是目录: {fs_path or '/'}")
        relative = to_relative_fs_path(path)
        if await self.repository.get_by_path(relative):
            raise ConflictError("该目录已登记为知识仓库")

        service = GitService(path)
        if not await run_in_threadpool(service.is_repo):
            if not init:
                raise GitError(400, "目标目录不是 Git 仓库，请勾选「初始化仓库」后重试")
            await run_in_threadpool(service.init)
        if remote_url:
            await run_in_threadpool(service.ensure_remote, remote_url)

        row = await self.repository.create(
            name=cleaned,
            fs_path=relative,
            git_remote=remote_url,
            default_branch="main",
        )
        await self.session.commit()
        return await self._build_view(row)

    async def delete_repo(self, repo_id: uuid.UUID) -> None:
        row = await self._require(repo_id)
        await self.repository.remove(row)
        await self.session.commit()

    # ------------------------------------------------------------- 操作
    async def commit(
        self,
        repo_id: uuid.UUID,
        *,
        message: str,
        paths: list[str] | None,
        all_changes: bool,
    ) -> tuple[GitRepoView, str]:
        return await self._execute(
            repo_id,
            action="commit",
            files=paths if not all_changes else None,
            fn=lambda service: service.commit(message, paths, all_changes),
        )

    async def pull(self, repo_id: uuid.UUID) -> tuple[GitRepoView, str]:
        return await self._execute(repo_id, action="pull", fn=lambda service: service.pull())

    async def push(self, repo_id: uuid.UUID) -> tuple[GitRepoView, str]:
        return await self._execute(repo_id, action="push", fn=lambda service: service.push())

    async def resolve_conflict(
        self,
        repo_id: uuid.UUID,
        *,
        path: str,
        strategy: str,
        content: str | None,
    ) -> tuple[GitRepoView, str]:
        return await self._execute(
            repo_id,
            action="resolve",
            files=[path],
            fn=lambda service: service.resolve_conflict(path, strategy, content),
        )

    async def continue_merge(self, repo_id: uuid.UUID) -> tuple[GitRepoView, str]:
        return await self._execute(
            repo_id, action="merge-continue", fn=lambda service: service.continue_merge()
        )

    async def abort_merge(self, repo_id: uuid.UUID) -> tuple[GitRepoView, str]:
        return await self._execute(
            repo_id, action="merge-abort", fn=lambda service: service.abort_merge()
        )

    # ------------------------------------------------------------- 内部
    async def _execute(
        self,
        repo_id: uuid.UUID,
        *,
        action: str,
        fn: Callable[[GitService], str],
        files: list[str] | None = None,
    ) -> tuple[GitRepoView, str]:
        row = await self._require(repo_id)
        path = self._repo_path(row.fs_path)
        service = GitService(path)

        async with _lock_for(repo_id):
            try:
                message = await run_in_threadpool(fn, service)
            except BusinessError as exc:
                await self.repository.add_action(
                    repository_id=row.id,
                    action=action,
                    message=exc.message,
                    files=files,
                    ok=False,
                    detail=exc.message,
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

    async def _require(self, repo_id: uuid.UUID):
        row = await self.repository.get(repo_id)
        if row is None:
            raise NotFoundError("知识仓库不存在")
        return row

    def _repo_path(self, fs_path: str) -> Path:
        path = resolve_repo_path(fs_path)
        if not path.exists() or not path.is_dir():
            raise NotFoundError("知识仓库目录不存在，请检查挂载路径")
        return path

    async def _build_view(self, row) -> GitRepoView:
        actions = await self.repository.list_actions(row.id, 60)
        action_views = [
            GitActionView(
                id=item.id,
                ts=self._format_time(item.created_at),
                action=item.action,
                message=item.message,
                files=list(item.files or []),
                ok=item.ok,
            )
            for item in actions
        ]

        try:
            path = self._repo_path(row.fs_path)
            service = GitService(path)
            status = await run_in_threadpool(service.status)
            service_status = status
        except BusinessError:
            return GitRepoView(
                id=row.id,
                name=row.name,
                path=str(Path(settings.KNOWLEDGE_ROOT) / row.fs_path),
                fs_path=row.fs_path,
                branch="不可用",
                remote=row.git_remote,
                actions=action_views,
                counts=GitCounts(),
            )

        conflicts = []
        if service_status.conflicts:
            conflicts = await run_in_threadpool(service.conflicts)
        log = await run_in_threadpool(service.log, 20)
        remote = await run_in_threadpool(service.remote_url)

        counts = GitCounts()
        for item in service_status.files:
            counts.total += 1
            if item.conflict:
                counts.conflict += 1
            elif item.state == "untracked":
                counts.untracked += 1
            elif item.staged:
                counts.staged += 1
            else:
                counts.unstaged += 1

        return GitRepoView(
            id=row.id,
            name=row.name,
            path=str(path),
            fs_path=row.fs_path,
            branch=service_status.branch,
            upstream=service_status.upstream,
            ahead=service_status.ahead,
            behind=service_status.behind,
            remote=remote or row.git_remote,
            merging=service_status.merging,
            files=service_status.files,
            conflicts=conflicts,
            counts=counts,
            log=log,
            actions=action_views,
        )

    @staticmethod
    def _format_time(value: datetime) -> str:
        return value.strftime("%Y-%m-%d %H:%M:%S")
