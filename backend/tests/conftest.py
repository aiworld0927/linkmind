"""pytest fixtures：独立测试库 linkmind_test + ASGI 客户端 + 临时知识库根目录。

注意：DATABASE_URL 环境变量必须在导入 app 模块之前设置。
"""

import asyncio
import os

TEST_DATABASE_URL = "postgresql+asyncpg://linkmind:linkmind@localhost:5432/linkmind_test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest
import pytest_asyncio
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# 注册全部 ORM 表，否则会话夹具建表时 metadata 为空
import app.api.v1.git.models  # noqa: F401
import app.api.v1.mindmap.models  # noqa: F401

# 建库/建表用独立引擎：pytest-asyncio 的会话循环与 asyncio.run 循环互不共享连接池


@pytest.fixture(scope="session", autouse=True)
def _prepare_database():
    """会话开始：建测试库与 5 张表；会话结束：drop_all。"""

    async def _setup():
        admin = create_async_engine(
            "postgresql+asyncpg://linkmind:linkmind@localhost:5432/linkmind",
            isolation_level="AUTOCOMMIT",
        )
        async with admin.connect() as conn:
            exists = (
                await conn.execute(
                    sa.text("SELECT 1 FROM pg_database WHERE datname = 'linkmind_test'")
                )
            ).scalar()
            if not exists:
                await conn.execute(sa.text("CREATE DATABASE linkmind_test"))
        await admin.dispose()

        eng = create_async_engine(TEST_DATABASE_URL)
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await eng.dispose()

    async def _teardown():
        eng = create_async_engine(TEST_DATABASE_URL)
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await eng.dispose()

    asyncio.run(_setup())
    yield
    asyncio.run(_teardown())


@pytest_asyncio.fixture(autouse=True)
async def _clean_tables():
    """每个用例结束后清空全部表（子表在前）。"""
    yield
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(sa.delete(table))


@pytest_asyncio.fixture
async def client():
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
def knowledge_root(tmp_path, monkeypatch):
    """临时知识库根目录：含 md 文档与子目录，供 fs/git 用例使用。"""
    root = tmp_path / "知识库"
    product = root / "产品研发"
    product.mkdir(parents=True)
    (product / "需求.md").write_text("# 需求\n\n- 功能A\n", encoding="utf-8")
    arch = product / "架构"
    arch.mkdir()
    (arch / "设计.md").write_text("# 设计\n\n- 模块化\n", encoding="utf-8")
    (root / "总览.md").write_text("# 总览\n", encoding="utf-8")
    monkeypatch.setattr(settings, "KNOWLEDGE_ROOT", str(root))
    return root


@pytest_asyncio.fixture
async def map_id(client):
    """预置一张地图，返回 id。"""
    r = await client.post("/api/v1/maps", json={"title": "测试地图", "desc": "d"})
    assert r.status_code == 200
    return r.json()["data"]["id"]
