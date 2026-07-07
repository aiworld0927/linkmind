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
from database.init_indexes import init_database_indexes
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库索引
    await init_database_indexes()
    yield
    # 关闭时清理资源


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

frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "dist")
frontend_dev_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend")

if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
else:
    app.mount("/", StaticFiles(directory=frontend_dev_path, html=True), name="frontend")

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/")
async def api_root():
    return success_response(data={"message": "LinkMind API is running"})


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )