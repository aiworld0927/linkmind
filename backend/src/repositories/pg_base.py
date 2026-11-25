"""PostgreSQL 仓储基类。

约定：
- 仓储只接收 ``AsyncSession``，不创建会话、不提交事务；
- 事务边界由服务层控制；
- 仓储方法只做数据访问，不包含业务规则。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def flush(self) -> None:
        await self.session.flush()

    async def refresh(self, instance: object) -> None:
        await self.session.refresh(instance)
