"""LinkMind API v1 路由汇总（prefix=/api/v1）。"""

from fastapi import APIRouter

from app.api.v1.fs.router import fs_router
from app.api.v1.git.router import git_router
from app.api.v1.health.router import health_router
from app.api.v1.mindmap.routers.maps import maps_router
from app.api.v1.mindmap.routers.nodes import nodes_router
from app.api.v1.mindmap.routers.notes import notes_router
from app.api.v1.mindmap.routers.props import props_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(git_router, tags=["Git"])
api_router.include_router(fs_router, tags=["Filesystem"])
api_router.include_router(maps_router, tags=["Maps"])
api_router.include_router(nodes_router, tags=["Nodes"])
api_router.include_router(props_router, tags=["Props"])
api_router.include_router(notes_router, tags=["Notes"])
