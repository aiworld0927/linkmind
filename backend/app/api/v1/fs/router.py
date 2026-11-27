"""文件系统 REST API（B-1 GET /fs/dirs、B-2 GET /fs/tree、F-3 GET /docs/content）。"""

from fastapi import APIRouter, Depends, Query

from app.api.v1.fs.schemas import DocContentOut, FsDirListingOut, FsTreeNodeOut
from app.api.v1.fs.service import directory_tree, doc_content, list_dirs
from app.core.deps import get_current_user
from app.core.response import ApiResponse, ok

fs_router = APIRouter(tags=["Filesystem"])


@fs_router.get("/fs/dirs", response_model=ApiResponse[FsDirListingOut])
async def list_directories(
    path: str = Query("", description="相对知识库根目录的路径，空串表示根目录"),
    _user=Depends(get_current_user),
):
    """B-1 列出知识库子目录。"""
    return ok(await list_dirs(path))


@fs_router.get("/fs/tree", response_model=ApiResponse[FsTreeNodeOut])
async def directory_tree_endpoint(
    path: str = Query("", description="相对知识库根目录的路径"),
    _user=Depends(get_current_user),
):
    """B-2 扫描目录生成知识树。"""
    return ok(await directory_tree(path))


@fs_router.get("/docs/content", response_model=ApiResponse[DocContentOut])
async def document_content(
    path: str = Query(..., description="文档相对知识库根目录的路径"),
    _user=Depends(get_current_user),
):
    """F-3 读取文档全文（fs/tree 截断的兜底通道）。"""
    return ok(await doc_content(path))
