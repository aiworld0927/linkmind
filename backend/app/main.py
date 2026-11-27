"""FastAPI 入口：CORS、路由注册、全局异常处理、lifespan。"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.response import ok
from app.db.session import engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    # 数据库未就绪时降级启动（与旧结构一致），由具体接口返回明确错误
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("PostgreSQL 连接初始化完成")
    except Exception as exc:  # noqa: BLE001
        logger.warning("PostgreSQL 初始化失败，服务将以降级模式启动: %s", exc)
    yield
    await engine.dispose()


app = FastAPI(
    title="LinkMind API",
    description="LinkMind 知识地图后端（接口契约见 docs/15_API接口列表.md）",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/api/", include_in_schema=False)
async def api_root():
    return ok({"message": "LinkMind API is running"})


@app.get("/", include_in_schema=False)
async def root():
    return ok({"message": "LinkMind API is running", "docs": "/docs"})
