"""模块 F：文档内容编辑模式路由（F-1/F-2）。"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.schemas.notes import NoteOut, NoteUpdateIn
from app.api.v1.mindmap.schemas.props import PropOut
from app.api.v1.mindmap.service import NotesService
from app.core.deps import get_current_user, get_db
from app.core.response import ApiResponse, ok

notes_router = APIRouter(
    prefix="/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note", tags=["Notes"]
)


def _service(session: AsyncSession) -> NotesService:
    return NotesService(session)


@notes_router.get("", response_model=ApiResponse[NoteOut])
async def get_note(
    map_id: uuid.UUID,
    node_id: str,
    prop_id: str,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """F-1 读取笔记内容（node_id='ROOT' 支持根级属性）。"""
    return ok(await _service(session).get_note(map_id, node_id, prop_id))


@notes_router.put("", response_model=ApiResponse[PropOut])
async def update_note(
    map_id: uuid.UUID,
    node_id: str,
    prop_id: str,
    payload: NoteUpdateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """F-2 保存笔记内容（Markdown 全文 + 标签/备注）。"""
    data = await _service(session).update_note(map_id, node_id, prop_id, payload)
    return ok(data, msg="保存成功")
