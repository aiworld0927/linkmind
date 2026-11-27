"""健康检查：保留 /health、/health/neo4j、/health/postgres 语义（docs/18 决策 4）。"""

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.response import ApiResponse, ok
from app.db.session import engine

health_router = APIRouter()


@health_router.get("/health", response_model=ApiResponse[dict])
async def health_check():
    return ok({"status": "healthy"})


@health_router.get("/health/postgres", response_model=ApiResponse[dict])
async def postgres_health_check():
    try:
        async with engine.connect() as conn:
            value = (await conn.execute(text("SELECT 1"))).scalar_one()
        if value == 1:
            return ok({"connected": True, "message": "PostgreSQL connection successful"})
        return ok({"connected": False, "message": "PostgreSQL query failed"})
    except Exception as exc:  # noqa: BLE001
        return ok({"connected": False, "message": f"PostgreSQL connection error: {exc}"})


@health_router.get("/health/neo4j", response_model=ApiResponse[dict])
async def neo4j_health_check():
    try:
        from neo4j import AsyncGraphDatabase  # 延迟导入：派生图索引未迁移，仅健康检查用

        async def _probe() -> None:
            driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                connection_timeout=3,
            )
            try:
                await driver.verify_connectivity()
            finally:
                # AsyncDriver.close() 为协程，必须 await，否则连接不会真正释放
                await driver.close()

        await _probe()
        return ok({"connected": True, "message": "Neo4j connection successful"})
    except Exception as exc:  # noqa: BLE001
        return ok({"connected": False, "message": f"Neo4j connection error: {exc}"})
