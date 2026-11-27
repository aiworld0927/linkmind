"""模块 E：属性与文档编辑路由（E-1～E-3）。"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.schemas.maps import TreeNodePropOut
from app.api.v1.mindmap.schemas.props import PropCreateIn, PropUpdateIn
from app.api.v1.mindmap.service import PropsService
from app.core.deps import get_current_user, get_db
from app.core.response import ApiResponse, RemovedOut, ok

props_router = APIRouter(
    prefix="/maps/{map_id}/nodes/{node_id}/props", tags=["Props"]
)


def _service(session: AsyncSession) -> PropsService:
    return PropsService(session)


@props_router.post("", response_model=ApiResponse[TreeNodePropOut])
async def create_prop(
    map_id: uuid.UUID,
    node_id: str,
    payload: PropCreateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """E-1 新增属性（node_id='ROOT' 表示地图级属性）。"""
    return ok(await _service(session).create_prop(map_id, node_id, payload), msg="创建成功")


@props_router.put("/{prop_id}", response_model=ApiResponse[TreeNodePropOut])
async def update_prop(
    map_id: uuid.UUID,
    node_id: str,
    prop_id: str,
    payload: PropUpdateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """E-2 编辑属性（prop_id 为稳定主键）。"""
    data = await _service(session).update_prop(map_id, node_id, prop_id, payload)
    return ok(data, msg="更新成功")


@props_router.delete("/{prop_id}", response_model=ApiResponse[RemovedOut])
async def delete_prop(
    map_id: uuid.UUID,
    node_id: str,
    prop_id: str,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """E-3 删除属性。"""
    await _service(session).delete_prop(map_id, node_id, prop_id)
    return ok(RemovedOut(), msg="已删除属性")
