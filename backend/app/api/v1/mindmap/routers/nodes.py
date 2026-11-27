"""模块 D：脑图节点编辑路由（D-1～D-3）。"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.schemas.maps import MapOut, TreeNodeOut
from app.api.v1.mindmap.schemas.nodes import NodeCreateIn, NodeRenameIn
from app.api.v1.mindmap.service import NodesService
from app.core.deps import get_current_user, get_db
from app.core.response import ApiResponse, RemovedOut, ok

nodes_router = APIRouter(prefix="/maps/{map_id}/nodes", tags=["Nodes"])


def _service(session: AsyncSession) -> NodesService:
    return NodesService(session)


@nodes_router.post("", response_model=ApiResponse[TreeNodeOut])
async def create_node(
    map_id: uuid.UUID,
    payload: NodeCreateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """D-1 新增子节点（parent_id='ROOT' 表示挂地图根级）。"""
    return ok(await _service(session).create_node(map_id, payload), msg="创建成功")


@nodes_router.put("/{node_id}", response_model=ApiResponse[TreeNodeOut | MapOut])
async def rename_node(
    map_id: uuid.UUID,
    node_id: str,
    payload: NodeRenameIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """D-2 重命名节点（node_id='ROOT' 时改地图标题，返回 TreeMap）。"""
    data = await _service(session).rename_node(map_id, node_id, payload)
    return ok(data, msg="重命名成功")


@nodes_router.delete("/{node_id}", response_model=ApiResponse[RemovedOut])
async def delete_node(
    map_id: uuid.UUID,
    node_id: str,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """D-3 删除节点（级联删除子节点与属性）。"""
    await _service(session).delete_node(map_id, node_id)
    return ok(RemovedOut(), msg="已删除节点")
