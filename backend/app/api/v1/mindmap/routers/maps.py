"""模块 C：知识地图路由（C-1～C-8）。"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.schemas.maps import (
    MapCreateIn,
    MapExportOut,
    MapImportIn,
    MapOut,
    MapSummaryOut,
    MapUpdateIn,
    TreeSaveIn,
)
from app.api.v1.mindmap.service import MapsService
from app.core.deps import Pagination, get_current_user, get_db
from app.core.pagination import Page
from app.core.response import ApiResponse, RemovedOut, ok

maps_router = APIRouter(prefix="/maps", tags=["Maps"])


def _service(session: AsyncSession) -> MapsService:
    return MapsService(session)


@maps_router.get("", response_model=ApiResponse[Page[MapSummaryOut]])
async def list_maps(
    keyword: str | None = Query(None, max_length=30, description="按地图名称模糊搜索"),
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-1 地图列表（分页 Page：{total, items}）。"""
    return ok(await _service(session).list_maps(keyword, pagination.page, pagination.page_size))


@maps_router.post("/import", response_model=ApiResponse[MapOut])
async def import_map(
    payload: MapImportIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-7 地图导入落库（目录来源或直接提交 TreeMap）。"""
    return ok(await _service(session).import_map(payload), msg="导入成功")


@maps_router.get("/export", response_model=ApiResponse[MapExportOut])
async def export_maps(
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-8 地图导出（服务端聚合全部地图）。"""
    return ok(await _service(session).export_maps())


@maps_router.post("", response_model=ApiResponse[MapOut])
async def create_map(
    payload: MapCreateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-2 创建地图。"""
    return ok(await _service(session).create_map(payload), msg="创建成功")


@maps_router.put("/{map_id}", response_model=ApiResponse[MapOut])
async def update_map(
    map_id: uuid.UUID,
    payload: MapUpdateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-3 更新地图元信息（title/desc/repo）。"""
    return ok(await _service(session).update_map(map_id, payload), msg="更新成功")


@maps_router.delete("/{map_id}", response_model=ApiResponse[RemovedOut])
async def delete_map(
    map_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-4 删除地图（级联删除节点与属性）。"""
    await _service(session).delete_map(map_id)
    return ok(RemovedOut(), msg="已删除地图")


@maps_router.get("/{map_id}/tree", response_model=ApiResponse[MapOut])
async def get_tree(
    map_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-5 查询整棵地图树。"""
    return ok(await _service(session).get_tree(map_id))


@maps_router.put("/{map_id}/tree", response_model=ApiResponse[MapOut])
async def save_tree(
    map_id: uuid.UUID,
    payload: TreeSaveIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """C-6 整树批量保存（画布批量操作后的同步通道）。"""
    return ok(await _service(session).save_tree(map_id, payload), msg="保存成功")
