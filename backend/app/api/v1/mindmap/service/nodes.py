"""模块 D：脑图节点编辑业务逻辑（'ROOT' 语义：重命名=改地图标题，不可删除）。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.mindmap.repository import MindmapRepository
from app.api.v1.mindmap.schemas.maps import TreeNodeOut
from app.api.v1.mindmap.schemas.nodes import NodeCreateIn, NodeRenameIn
from app.api.v1.mindmap.service.common import (
    assert_sibling_unique,
    build_map_out,
    clean_name,
    parse_node_ref,
    prop_out,
    require_map,
)
from app.core.constants import NODE_ROOT_ID
from app.core.exceptions import BadRequestError, NotFoundError


class NodesService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = MindmapRepository(session)

    # ------------------------------------------------------------- D-1
    async def create_node(self, map_id: uuid.UUID, payload: NodeCreateIn) -> TreeNodeOut:
        await require_map(self.repo, map_id)
        name = clean_name(payload.name)
        parent_id: uuid.UUID | None = None
        if payload.parent_id != NODE_ROOT_ID:
            parent_id = parse_node_ref(payload.parent_id)
            if parent_id is None or await self.repo.get_node(map_id, parent_id) is None:
                raise NotFoundError("父节点不存在")
        await assert_sibling_unique(self.repo, map_id, parent_id, name)
        sort_order = await self.repo.next_sort_order(map_id, parent_id)
        row = await self.repo.create_node(
            map_id=map_id, parent_id=parent_id, name=name, sort_order=sort_order
        )
        await self.session.commit()
        return TreeNodeOut(id=str(row.id), name=row.name, props=[], children=[])

    # ------------------------------------------------------------- D-2
    async def rename_node(
        self, map_id: uuid.UUID, node_id: str, payload: NodeRenameIn
    ) -> TreeNodeOut | dict:
        map_row = await require_map(self.repo, map_id)
        name = clean_name(payload.name)
        if node_id == NODE_ROOT_ID:
            # 重命名 ROOT 等价于更新地图标题
            existing = await self.repo.get_map_by_title(name)
            if existing is not None and existing.id != map_row.id:
                raise BadRequestError("地图名称已存在")
            map_row.title = name
            await self.session.commit()
            nodes = await self.repo.list_nodes(map_row.id)
            props = await self.repo.list_props(map_row.id)
            repo_name = None
            if map_row.repo_id is not None:
                git_repo = await self.repo.get_git_repo(map_row.repo_id)
                repo_name = git_repo.name if git_repo else None
            return build_map_out(map_row, nodes, props, repo_name)

        node_id_uuid = parse_node_ref(node_id)
        node = await self.repo.get_node(map_id, node_id_uuid)  # type: ignore[arg-type]
        if node is None:
            raise NotFoundError("节点不存在")
        await assert_sibling_unique(
            self.repo, map_id, node.parent_id, name, exclude_id=node.id
        )
        node.name = name
        await self.session.commit()
        props = await self.repo.list_props(map_row.id)
        own = [prop_out(p) for p in props if p.node_id == node.id]
        return TreeNodeOut(id=str(node.id), name=node.name, props=own, children=[])

    # ------------------------------------------------------------- D-3
    async def delete_node(self, map_id: uuid.UUID, node_id: str) -> None:
        await require_map(self.repo, map_id)
        if node_id == NODE_ROOT_ID:
            raise BadRequestError("根节点不可删除")
        nid = parse_node_ref(node_id)
        node = await self.repo.get_node(map_id, nid)  # type: ignore[arg-type]
        if node is None:
            raise NotFoundError("节点不存在")
        # 子节点与属性由 FK ondelete CASCADE 级联删除
        await self.repo.delete_node(node.id)
        await self.session.commit()
