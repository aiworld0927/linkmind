"""知识地图聚合域数据访问（全部 AsyncSession + SQLAlchemy 2.0 风格）。"""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.git.models import GitRepoModel
from app.api.v1.mindmap.models import MapModel, NodeModel, PropModel


class MindmapRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------- maps
    async def list_maps(self, keyword: str | None = None) -> list[MapModel]:
        stmt = select(MapModel).order_by(MapModel.created_at)
        if keyword:
            stmt = stmt.where(MapModel.title.ilike(f"%{keyword}%"))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_map(self, map_id: uuid.UUID) -> MapModel | None:
        return await self.session.get(MapModel, map_id)

    async def get_map_by_title(self, title: str) -> MapModel | None:
        result = await self.session.execute(
            select(MapModel).where(MapModel.title == title)
        )
        return result.scalar_one_or_none()

    async def node_counts(self) -> dict[uuid.UUID, int]:
        result = await self.session.execute(
            select(NodeModel.map_id, func.count()).group_by(NodeModel.map_id)
        )
        return {row[0]: int(row[1]) for row in result.all()}

    async def prop_counts(self) -> dict[uuid.UUID, int]:
        result = await self.session.execute(
            select(PropModel.map_id, func.count()).group_by(PropModel.map_id)
        )
        return {row[0]: int(row[1]) for row in result.all()}

    async def create_map(
        self, *, title: str, desc: str, repo_id: uuid.UUID | None = None
    ) -> MapModel:
        row = MapModel(title=title, desc=desc, repo_id=repo_id)
        self.session.add(row)
        await self.session.flush()
        return row

    async def delete_map(self, map_id: uuid.UUID) -> None:
        await self.session.execute(delete(MapModel).where(MapModel.id == map_id))

    # ------------------------------------------------------------- git repo ref
    async def get_git_repo(self, repo_id: uuid.UUID) -> GitRepoModel | None:
        return await self.session.get(GitRepoModel, repo_id)

    # ------------------------------------------------------------- nodes
    async def list_nodes(self, map_id: uuid.UUID) -> list[NodeModel]:
        result = await self.session.execute(
            select(NodeModel)
            .where(NodeModel.map_id == map_id)
            .order_by(NodeModel.sort_order, NodeModel.created_at)
        )
        return list(result.scalars().all())

    async def get_node(self, map_id: uuid.UUID, node_id: uuid.UUID) -> NodeModel | None:
        result = await self.session.execute(
            select(NodeModel).where(
                NodeModel.map_id == map_id, NodeModel.id == node_id
            )
        )
        return result.scalar_one_or_none()

    async def find_sibling(
        self,
        map_id: uuid.UUID,
        parent_id: uuid.UUID | None,
        name: str,
        exclude_id: uuid.UUID | None = None,
    ) -> NodeModel | None:
        stmt = select(NodeModel).where(
            NodeModel.map_id == map_id, NodeModel.name == name
        )
        stmt = stmt.where(
            NodeModel.parent_id.is_(None)
            if parent_id is None
            else NodeModel.parent_id == parent_id
        )
        if exclude_id is not None:
            stmt = stmt.where(NodeModel.id != exclude_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def next_sort_order(
        self, map_id: uuid.UUID, parent_id: uuid.UUID | None
    ) -> int:
        stmt = select(func.max(NodeModel.sort_order)).where(NodeModel.map_id == map_id)
        stmt = stmt.where(
            NodeModel.parent_id.is_(None)
            if parent_id is None
            else NodeModel.parent_id == parent_id
        )
        current = (await self.session.execute(stmt)).scalar_one()
        return (current or 0) + 1

    async def create_node(
        self,
        *,
        map_id: uuid.UUID,
        parent_id: uuid.UUID | None,
        name: str,
        sort_order: int,
        node_id: uuid.UUID | None = None,
    ) -> NodeModel:
        row = NodeModel(
            map_id=map_id,
            parent_id=parent_id,
            name=name,
            sort_order=sort_order,
        )
        if node_id is not None:
            row.id = node_id
        self.session.add(row)
        await self.session.flush()
        return row

    async def delete_node(self, node_id: uuid.UUID) -> None:
        await self.session.execute(delete(NodeModel).where(NodeModel.id == node_id))

    async def delete_nodes_by_map(self, map_id: uuid.UUID) -> None:
        """整树重建用：删除全部节点（props 由 FK CASCADE 级联删除）。"""
        await self.session.execute(delete(NodeModel).where(NodeModel.map_id == map_id))

    # ------------------------------------------------------------- props
    async def list_props(self, map_id: uuid.UUID) -> list[PropModel]:
        result = await self.session.execute(
            select(PropModel)
            .where(PropModel.map_id == map_id)
            .order_by(PropModel.created_at)
        )
        return list(result.scalars().all())

    async def get_prop(self, map_id: uuid.UUID, prop_id: uuid.UUID) -> PropModel | None:
        result = await self.session.execute(
            select(PropModel).where(
                PropModel.map_id == map_id, PropModel.id == prop_id
            )
        )
        return result.scalar_one_or_none()

    async def create_prop(
        self,
        *,
        map_id: uuid.UUID,
        node_id: uuid.UUID | None,
        label: str,
        note_content: str,
        note_tags: list[str],
        note_remark: str,
        doc: bool = False,
        doc_path: str | None = None,
        prop_id: uuid.UUID | None = None,
    ) -> PropModel:
        row = PropModel(
            map_id=map_id,
            node_id=node_id,
            label=label,
            note_content=note_content,
            note_tags=note_tags,
            note_remark=note_remark,
            doc=doc,
            doc_path=doc_path,
        )
        if prop_id is not None:
            row.id = prop_id
        self.session.add(row)
        await self.session.flush()
        return row

    async def delete_prop(self, prop_id: uuid.UUID) -> None:
        await self.session.execute(delete(PropModel).where(PropModel.id == prop_id))
