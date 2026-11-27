"""知识仓库登记与 Git 动作审计的数据访问。"""

import uuid

from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.git.models import GitActionModel, GitRepoModel


class GitRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_repos(self) -> list[GitRepoModel]:
        result = await self.session.execute(
            select(GitRepoModel).order_by(GitRepoModel.created_at)
        )
        return list(result.scalars().all())

    async def get(self, repo_id: uuid.UUID) -> GitRepoModel | None:
        return await self.session.get(GitRepoModel, repo_id)

    async def get_by_name(self, name: str) -> GitRepoModel | None:
        result = await self.session.execute(
            select(GitRepoModel).where(GitRepoModel.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_path(self, fs_path: str) -> GitRepoModel | None:
        result = await self.session.execute(
            select(GitRepoModel).where(GitRepoModel.fs_path == fs_path)
        )
        return result.scalar_one_or_none()

    async def create(
        self, *, name: str, fs_path: str, remote_url: str | None
    ) -> GitRepoModel:
        row = GitRepoModel(name=name, fs_path=fs_path, remote_url=remote_url)
        self.session.add(row)
        await self.session.flush()
        return row

    async def remove(self, row: GitRepoModel) -> None:
        await self.session.execute(
            delete(GitRepoModel).where(GitRepoModel.id == row.id)
        )

    # ------------------------------------------------------------- 审计
    async def add_action(
        self,
        *,
        repository_id: uuid.UUID,
        action: str,
        message: str,
        files: list[str] | None = None,
        ok: bool = True,
    ) -> GitActionModel:
        row = GitActionModel(
            repo_id=repository_id,
            action=action,
            message=message,
            files=files or [],
            ok=ok,
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_actions(
        self, repository_id: uuid.UUID, limit: int = 60
    ) -> list[GitActionModel]:
        result = await self.session.execute(
            select(GitActionModel)
            .where(GitActionModel.repo_id == repository_id)
            .order_by(desc(GitActionModel.ts))
            .limit(max(1, min(limit, 200)))
        )
        return list(result.scalars().all())

    async def count_actions(self, repository_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(GitActionModel).where(
                GitActionModel.repo_id == repository_id
            )
        )
        return int(result.scalar_one())

    async def list_actions_page(
        self, repository_id: uuid.UUID, *, offset: int, limit: int
    ) -> list[GitActionModel]:
        result = await self.session.execute(
            select(GitActionModel)
            .where(GitActionModel.repo_id == repository_id)
            .order_by(desc(GitActionModel.ts))
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())
