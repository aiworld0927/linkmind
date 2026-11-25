from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings
from utils.response import success_response, error_response
from middleware.exception_handler import register_exception_handlers
from routes.health import health_router
from routes.note import note_router
from routes.link import link_router
from routes.markdown_import import markdown_router
from routes.graph import graph_router
from routes.expand import expand_router
from routes.search import search_router
from routes.cluster import cluster_router
from routes.fs import fs_router
from routes.git import git_router
from database.init_indexes import init_database_indexes
from database.neo4j_connection import close_driver
from database.pg import close_pg, init_pg
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库索引；数据库未就绪时降级运行，不阻塞服务启动
    try:
        await init_database_indexes()
    except Exception as exc:  # noqa: BLE001
        logger.warning("数据库索引初始化失败，服务将以降级模式启动: %s", exc)
    # PostgreSQL 是主数据存储；不可用时降级启动，由具体接口返回明确错误
    try:
        await init_pg()
    except Exception as exc:  # noqa: BLE001
        logger.warning("PostgreSQL 初始化失败，服务将以降级模式启动: %s", exc)
    yield
    try:
        await close_driver()
    except Exception as exc:  # noqa: BLE001
        logger.warning("关闭 Neo4j 连接失败: %s", exc)
    try:
        await close_pg()
    except Exception as exc:  # noqa: BLE001
        logger.warning("关闭 PostgreSQL 连接失败: %s", exc)


app = FastAPI(
    title="LinkMind API",
    description="LinkMind Backend API Documentation",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(note_router, prefix="/api/v1", tags=["Notes"])
app.include_router(link_router, prefix="/api/v1", tags=["Links"])
app.include_router(markdown_router, prefix="/api/v1", tags=["Import"])
app.include_router(graph_router, prefix="/api/v1", tags=["Graph"])
app.include_router(expand_router, prefix="/api/v1", tags=["Expand"])
app.include_router(search_router, prefix="/api/v1", tags=["Search"])
app.include_router(cluster_router, prefix="/api/v1/cluster", tags=["Cluster"])
app.include_router(fs_router, prefix="/api/v1", tags=["Filesystem"])
app.include_router(git_router, prefix="/api/v1", tags=["Git"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


@app.get("/api/")
async def api_root():
    return success_response(data={"message": "LinkMind API is running"})


if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:

    @app.get("/")
    async def root():
        return success_response(
            data={
                "message": "LinkMind API is running",
                "frontend": "前端静态资源未构建，请执行 npm run build 生成 frontend/dist",
            }
        )


if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )