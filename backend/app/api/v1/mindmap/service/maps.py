"""模块 C：知识地图业务逻辑。"""

import uuid
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.fs.service import directory_tree
from app.api.v1.mindmap.repository import MindmapRepository
from app.api.v1.mindmap.schemas.maps import (
    MapCreateIn,
    MapExportOut,
    MapImportIn,
    MapOut,
    MapSummaryOut,
    MapUpdateIn,
    NotePayloadIn,
    TreeNodeIn,
    TreeNodePropIn,
    TreeSaveIn,
)
from app.api.v1.mindmap.service.common import (
    build_map_out,
    clean_name,
    insert_prop,
    insert_tree,
    require_map,
    validate_tree_nodes,
)
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.pagination import Page


class MapsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = MindmapRepository(session)

    # ------------------------------------------------------------- C-1
    async def list_maps(self, keyword: str | None, page: int, page_size: int) -> Page[MapSummaryOut]:
        rows = await self.repo.list_maps(keyword.strip() if keyword else None)
        total = len(rows)
        node_counts, prop_counts = await self._counts()
        items: list[MapSummaryOut] = []
        for row in rows:
            repo_ref = None
            if row.repo_id is not None:
                git_repo = await self.repo.get_git_repo(row.repo_id)
                repo_ref = (
                    {"id": str(row.repo_id), "name": git_repo.name}
                    if git_repo
                    else {"id": str(row.repo_id), "name": ""}
                )
            items.append(
                MapSummaryOut(
                    id=str(row.id),
                    title=row.title,
                    desc=row.desc,
                    node_count=node_counts.get(row.id, 0),
                    prop_count=prop_counts.get(row.id, 0),
                    repo=repo_ref,
                )
            )
        offset = (page - 1) * page_size
        return Page(total=total, items=items[offset : offset + page_size])

    async def _counts(self) -> tuple[dict, dict]:
        import asyncio

        node_counts, prop_counts = await asyncio.gather(
            self.repo.node_counts(), self.repo.prop_counts()
        )
        return node_counts, prop_counts

    # ------------------------------------------------------------- C-2
    async def create_map(self, payload: MapCreateIn) -> MapOut:
        title = clean_name(payload.title)
        if await self.repo.get_map_by_title(title):
            raise BadRequestError("地图名称已存在")
        row = await self.repo.create_map(title=title, desc=payload.desc or "")
        await self.session.commit()
        return await self.get_tree(row.id)

    # ------------------------------------------------------------- C-3
    async def update_map(self, map_id: uuid.UUID, payload: MapUpdateIn) -> MapOut:
        map_row = await require_map(self.repo, map_id)
        if payload.title is not None:
            title = clean_name(payload.title)
            existing = await self.repo.get_map_by_title(title)
            if existing is not None and existing.id != map_row.id:
                raise BadRequestError("地图名称已存在")
            map_row.title = title
        if payload.desc is not None:
            map_row.desc = payload.desc
        if payload.repo is not None:
            git_repo = await self.repo.get_git_repo(payload.repo.id)
            if git_repo is None:
                raise NotFoundError("知识仓库不存在")
            map_row.repo_id = git_repo.id
        await self.session.commit()
        return await self.get_tree(map_row.id)

    # ------------------------------------------------------------- C-4
    async def delete_map(self, map_id: uuid.UUID) -> None:
        await require_map(self.repo, map_id)
        await self.repo.delete_map(map_id)
        await self.session.commit()

    # ------------------------------------------------------------- C-5
    async def get_tree(self, map_id: uuid.UUID) -> MapOut:
        map_row = await require_map(self.repo, map_id)
        nodes = await self.repo.list_nodes(map_row.id)
        props = await self.repo.list_props(map_row.id)
        repo_name = None
        if map_row.repo_id is not None:
            git_repo = await self.repo.get_git_repo(map_row.repo_id)
            repo_name = git_repo.name if git_repo else None
        return build_map_out(map_row, nodes, props, repo_name)

    # ------------------------------------------------------------- C-6
    async def save_tree(self, map_id: uuid.UUID, payload: TreeSaveIn) -> MapOut:
        """整树批量同步：重建全部节点（地图级属性保持不变）。"""
        map_row = await require_map(self.repo, map_id)
        validate_tree_nodes(payload.nodes)
        await self.repo.delete_nodes_by_map(map_row.id)
        await insert_tree(
            self.repo,
            map_row.id,
            payload.nodes,
            used_node_ids=set(),
            used_prop_ids=set(),
        )
        await self.session.commit()
        return await self.get_tree(map_row.id)

    # ------------------------------------------------------------- C-7
    async def import_map(self, payload: MapImportIn) -> MapOut:
        if payload.nodes is not None:
            # 直接提交转换后的 TreeMap
            title = clean_name(payload.title or "")
            tree_nodes = payload.nodes
            map_props = payload.props or []
            repo_id = payload.repo_id
            if repo_id is not None and await self.repo.get_git_repo(repo_id) is None:
                raise NotFoundError("知识仓库不存在")
        else:
            # 目录导入：path（可选绑定 repo_id），后端扫描知识树
            repo_row = None
            if payload.repo_id is not None:
                repo_row = await self.repo.get_git_repo(payload.repo_id)
                if repo_row is None:
                    raise NotFoundError("知识仓库不存在")
            fs_tree = await directory_tree(payload.path or "")
            tree_nodes = [_tree_node_from_fs(fs_tree)]
            map_props = []
            repo_id = payload.repo_id
            title = payload.title or _title_from_path(
                payload.path or "", repo_row.name if repo_row else ""
            )

        title = title[:30]
        if await self.repo.get_map_by_title(title):
            raise BadRequestError("已存在同名地图，不能重复导入")
        map_row = await self.repo.create_map(title=title, desc=payload.desc or "", repo_id=repo_id)
        used_prop_ids: set[uuid.UUID] = set()
        for prop in map_props:
            await insert_prop(self.repo, map_row.id, None, prop, used_prop_ids)
        await insert_tree(self.repo, map_row.id, tree_nodes, set(), used_prop_ids)
        await self.session.commit()
        return await self.get_tree(map_row.id)

    # ------------------------------------------------------------- C-8
    async def export_maps(self) -> MapExportOut:
        rows = await self.repo.list_maps()
        maps: list[MapOut] = []
        for row in rows:
            maps.append(await self.get_tree(row.id))
        return MapExportOut(maps=maps)


def _title_from_path(path: str, fallback: str) -> str:
    name = Path(path).name if path else ""
    return (name or fallback or "导入地图")[:30]


def _tree_node_from_fs(fs_node) -> TreeNodeIn:
    """fs/tree 结果 → TreeNodeIn：目录 → 节点，md 文档 → 文档属性。"""
    props: list[TreeNodePropIn] = []
    for prop in fs_node.props or []:
        props.append(
            TreeNodePropIn(
                label=(prop.label or "未命名")[:30],
                note=NotePayloadIn(c=prop.content or "", t=[], r=prop.path or ""),
                doc=True,
                path=prop.path,
            )
        )
    return TreeNodeIn(
        name=(fs_node.name or "未命名")[:30],
        props=props,
        children=[_tree_node_from_fs(child) for child in fs_node.children or []],
    )
