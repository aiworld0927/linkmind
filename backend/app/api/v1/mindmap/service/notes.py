"""模块 F：文档内容编辑模式业务逻辑（笔记结构化读写，Q13）。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.repository import MindmapRepository
from app.api.v1.mindmap.schemas.notes import NoteOut
from app.api.v1.mindmap.schemas.props import PropOut
from app.api.v1.mindmap.service.common import (
    prop_out,
    require_map,
    require_prop,
)


class NotesService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = MindmapRepository(session)

    async def _node_path(self, map_row, node_id: uuid.UUID | None) -> str:
        """所属节点层级路径（' > ' 分隔）；地图级属性返回地图标题。"""
        if node_id is None:
            return map_row.title
        names: list[str] = []
        current = await self.repo.get_node(map_row.id, node_id)
        while current is not None:
            names.append(current.name)
            if current.parent_id is None:
                break
            current = await self.repo.get_node(map_row.id, current.parent_id)
        names.reverse()
        return " > ".join([map_row.title, *names])

    # ------------------------------------------------------------- F-1
    async def get_note(
        self, map_id: uuid.UUID, node_id: str, prop_id: str
    ) -> NoteOut:
        map_row = await require_map(self.repo, map_id)
        prop = await require_prop(self.repo, map_id, node_id, prop_id)
        return NoteOut(
            label=prop.label,
            node_path=await self._node_path(map_row, prop.node_id),
            content=prop.note_content,
            tags=list(prop.note_tags or []),
            remark=prop.note_remark,
            doc=prop.doc,
            doc_path=prop.doc_path,
        )

    # ------------------------------------------------------------- F-2
    async def update_note(
        self, map_id: uuid.UUID, node_id: str, prop_id: str, payload
    ) -> PropOut:
        map_row = await require_map(self.repo, map_id)
        prop = await require_prop(self.repo, map_id, node_id, prop_id)
        prop.note_content = payload.content
        if payload.tags is not None:
            prop.note_tags = list(payload.tags)
        if payload.remark is not None:
            prop.note_remark = payload.remark
        await self.session.commit()
        return prop_out(prop)
