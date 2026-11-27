"""模块 E：属性与文档编辑业务逻辑（node_id='ROOT' → 地图级属性）。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.repository import MindmapRepository
from app.api.v1.mindmap.schemas.props import PropCreateIn, PropUpdateIn
from app.api.v1.mindmap.service.common import (
    clean_name,
    prop_out,
    require_map,
    require_prop,
    resolve_node_ref,
)


class PropsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = MindmapRepository(session)

    # ------------------------------------------------------------- E-1
    async def create_prop(
        self, map_id: uuid.UUID, node_id: str, payload: PropCreateIn
    ):
        await require_map(self.repo, map_id)
        node = await resolve_node_ref(self.repo, map_id, node_id)
        label = clean_name(payload.label)
        row = await self.repo.create_prop(
            map_id=map_id,
            node_id=node.id if node is not None else None,
            label=label,
            note_content=payload.note.c or "",
            note_tags=list(payload.note.t or []),
            note_remark=payload.note.r or "",
        )
        await self.session.commit()
        return prop_out(row)

    # ------------------------------------------------------------- E-2
    async def update_prop(
        self, map_id: uuid.UUID, node_id: str, prop_id: str, payload: PropUpdateIn
    ):
        await require_map(self.repo, map_id)
        prop = await require_prop(self.repo, map_id, node_id, prop_id)
        prop.label = clean_name(payload.label)
        prop.note_content = payload.note.c or ""
        prop.note_tags = list(payload.note.t or [])
        prop.note_remark = payload.note.r or ""
        await self.session.commit()
        return prop_out(prop)

    # ------------------------------------------------------------- E-3
    async def delete_prop(self, map_id: uuid.UUID, node_id: str, prop_id: str) -> None:
        await require_map(self.repo, map_id)
        prop = await require_prop(self.repo, map_id, node_id, prop_id)
        await self.repo.delete_prop(prop.id)
        await self.session.commit()
