"""知识仓库登记与 Git 动作审计的数据访问。"""

from __future__ import annotations

import uuid

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.db_models import GitAction, KnowledgeRepository
from repositories.pg_base import BaseRepository


class GitRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def list_repos(self) -> list[KnowledgeRepository]:
        result = await self.session.execute(select(KnowledgeRepository).order_by(KnowledgeRepository.created_at))
        return list(result.scalars().all())

    async def get(self, repo_id: uuid.UUID) -> KnowledgeRepository | None:
        return await self.session.get(KnowledgeRepository, repo_id)

    async def get_by_name(self, name: str) -> KnowledgeRepository | None:
        result = await self.session.execute(
            select(KnowledgeRepository).where(KnowledgeRepository.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_path(self, fs_path: str) -> KnowledgeRepository | None:
        result = await self.session.execute(
            select(KnowledgeRepository).where(KnowledgeRepository.fs_path == fs_path)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        name: str,
        fs_path: str,
        git_remote: str | None,
        default_branch: str,
    ) -> KnowledgeRepository:
        row = KnowledgeRepository(
            name=name,
            fs_path=fs_path,
            git_remote=git_remote,
            default_branch=default_branch,
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def remove(self, row: KnowledgeRepository) -> None:
        await self.session.execute(
            delete(KnowledgeRepository).where(KnowledgeRepository.id == row.id)
        )

    async def add_action(
        self,
        *,
        repository_id: uuid.UUID,
        action: str,
        message: str,
        files: list[str] | None = None,
        ok: bool = True,
        detail: str | None = None,
    ) -> GitAction:
        row = GitAction(
            repository_id=repository_id,
            action=action,
            message=message,
            files=files or [],
            ok=ok,
            detail=detail,
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_actions(self, repository_id: uuid.UUID, limit: int = 60) -> list[GitAction]:
        result = await self.session.execute(
            select(GitAction)
            .where(GitAction.repository_id == repository_id)
            .order_by(desc(GitAction.created_at), desc(GitAction.id))
            .limit(max(1, min(limit, 200)))
        )
        return list(result.scalars().all())
