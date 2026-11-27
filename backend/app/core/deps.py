"""公共依赖：数据库会话、分页参数、当前用户。"""

from dataclasses import dataclass

from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.db.session import SessionLocal


async def get_db() -> AsyncSession:
    """每个请求一个会话，异常自动回滚，请求结束关闭。"""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@dataclass
class Pagination:
    """统一分页参数：page/page_size（评审 P3）。"""

    page: int = Query(1, ge=1, description="页码，从 1 开始")
    page_size: int = Query(20, ge=1, le=100, description="每页条数，上限 100")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


__all__ = ["get_db", "Pagination", "CurrentUser", "get_current_user"]
