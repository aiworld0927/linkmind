"""PostgreSQL 主数据存储连接管理。

使用 SQLAlchemy 2.x 异步引擎 + asyncpg。数据库不可用时服务仍可启动，
由各业务模块在真正访问数据时返回明确错误。
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from config.settings import settings

logger = logging.getLogger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    """所有 ORM 模型的声明式基类。"""


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DB_ECHO,
            pool_pre_ping=True,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI 依赖：每个请求一个会话，请求结束自动关闭。"""

    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_pg() -> None:
    """初始化连接池并验证连通性；失败时抛出异常由调用方决定是否降级。"""

    engine = get_engine()
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("PostgreSQL 连接初始化完成")


async def close_pg() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
    _session_factory = None


async def test_pg_connection() -> dict:
    """返回主库连通性，供健康检查使用。"""

    try:
        engine = get_engine()
        async with engine.connect() as conn:
            value = (await conn.execute(text("SELECT 1"))).scalar_one()
        if value == 1:
            return {"connected": True, "message": "PostgreSQL connection successful"}
        return {"connected": False, "message": "PostgreSQL query failed"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("PostgreSQL 健康检查失败: %s", exc)
        return {"connected": False, "message": f"PostgreSQL connection error: {exc}"}
