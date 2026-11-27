"""mindmap service 公共工具：定位/校验/树组装。"""

import uuid

from app.api.v1.mindmap.models import MapModel, NodeModel, PropModel
from app.api.v1.mindmap.repository import MindmapRepository
from app.api.v1.mindmap.schemas.maps import (
    MapOut,
    NotePayloadOut,
    RepoRefOut,
    TreeNodeIn,
    TreeNodeOut,
    TreeNodePropIn,
    TreeNodePropOut,
)
from app.core.constants import NODE_ROOT_ID
from app.core.exceptions import BadRequestError, NotFoundError

MAX_TREE_DEPTH = 20


async def require_map(repo: MindmapRepository, map_id: uuid.UUID) -> MapModel:
    map_row = await repo.get_map(map_id)
    if map_row is None:
        raise NotFoundError("知识地图不存在")
    return map_row


def parse_node_ref(node_id: str) -> uuid.UUID | None:
    """前端虚拟根 'ROOT' → None（地图级）；否则解析 uuid（非法 → 400）。"""
    if node_id == NODE_ROOT_ID:
        return None
    try:
        return uuid.UUID(node_id)
    except ValueError as exc:
        raise BadRequestError(f"非法节点 id: {node_id}") from exc


def parse_prop_ref(prop_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(prop_id)
    except ValueError as exc:
        raise BadRequestError(f"非法属性 id: {prop_id}") from exc


async def resolve_node_ref(
    repo: MindmapRepository, map_id: uuid.UUID, node_id: str
) -> NodeModel | None:
    """node_id → 节点行；'ROOT' 返回 None。"""
    nid = parse_node_ref(node_id)
    if nid is None:
        return None
    node = await repo.get_node(map_id, nid)
    if node is None:
        raise NotFoundError("节点不存在")
    return node


async def require_prop(
    repo: MindmapRepository, map_id: uuid.UUID, node_id: str, prop_id: str
) -> PropModel:
    """属性必须存在且归属（map, node 上下文），否则 404。"""
    node = await resolve_node_ref(repo, map_id, node_id)
    pid = parse_prop_ref(prop_id)
    prop = await repo.get_prop(map_id, pid)
    expected_node_id = node.id if node is not None else None
    if prop is None or prop.node_id != expected_node_id:
        raise NotFoundError("属性不存在或不在该节点下")
    return prop


def clean_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise BadRequestError("名称不能为空")
    return cleaned


async def assert_sibling_unique(
    repo: MindmapRepository,
    map_id: uuid.UUID,
    parent_id: uuid.UUID | None,
    name: str,
    exclude_id: uuid.UUID | None = None,
) -> None:
    if await repo.find_sibling(map_id, parent_id, name, exclude_id=exclude_id):
        raise BadRequestError(f"同级已存在同名节点: {name}")


# ------------------------------------------------------------------ 组装输出
def prop_out(row: PropModel) -> TreeNodePropOut:
    return TreeNodePropOut(
        prop_id=str(row.id),
        label=row.label,
        note=NotePayloadOut(
            c=row.note_content, t=list(row.note_tags or []), r=row.note_remark
        ),
        doc=row.doc,
        path=row.doc_path,
    )


def _node_out(
    node: NodeModel,
    children_by_parent: dict[uuid.UUID | None, list[NodeModel]],
    props_by_node: dict[uuid.UUID | None, list[PropModel]],
) -> TreeNodeOut:
    return TreeNodeOut(
        id=str(node.id),
        name=node.name,
        props=[prop_out(p) for p in props_by_node.get(node.id, [])],
        children=[
            _node_out(child, children_by_parent, props_by_node)
            for child in children_by_parent.get(node.id, [])
        ],
    )


def build_map_out(
    map_row: MapModel,
    nodes: list[NodeModel],
    props: list[PropModel],
    repo_name: str | None,
) -> MapOut:
    """把扁平节点/属性行组装为 TreeMap 结构。"""
    children_by_parent: dict[uuid.UUID | None, list[NodeModel]] = {}
    for node in nodes:
        children_by_parent.setdefault(node.parent_id, []).append(node)
    # 查询已按 sort_order 排序，同级保持稳定顺序
    props_by_node: dict[uuid.UUID | None, list[PropModel]] = {}
    for prop in props:
        props_by_node.setdefault(prop.node_id, []).append(prop)

    repo_ref = None
    if map_row.repo_id is not None:
        repo_ref = RepoRefOut(id=str(map_row.repo_id), name=repo_name or "")

    return MapOut(
        id=str(map_row.id),
        title=map_row.title,
        desc=map_row.desc,
        props=[prop_out(p) for p in props_by_node.get(None, [])],
        nodes=[
            _node_out(node, children_by_parent, props_by_node)
            for node in children_by_parent.get(None, [])
        ],
        repo=repo_ref,
    )


# ------------------------------------------------------------------ 整树写入
def validate_tree_nodes(nodes: list[TreeNodeIn], depth: int = 0) -> None:
    """整树保存/导入前置校验：同级不重名 + 深度上限。"""
    if depth > MAX_TREE_DEPTH:
        raise BadRequestError(f"树层级超过上限（{MAX_TREE_DEPTH}）")
    seen: set[str] = set()
    for item in nodes:
        name = clean_name(item.name)
        if name in seen:
            raise BadRequestError(f"同级已存在同名节点: {name}")
        seen.add(name)
        validate_tree_nodes(item.children, depth + 1)


async def insert_prop(
    repo: MindmapRepository,
    map_id: uuid.UUID,
    node_id: uuid.UUID | None,
    prop: TreeNodePropIn,
    used_prop_ids: set[uuid.UUID],
) -> None:
    """插入属性；保留前端传入 prop_id，冲突时重新生成。"""
    prop_id = prop.prop_id
    if prop_id is None or prop_id in used_prop_ids:
        prop_id = uuid.uuid4()
    used_prop_ids.add(prop_id)
    await repo.create_prop(
        map_id=map_id,
        node_id=node_id,
        label=clean_name(prop.label)[:30],
        note_content=prop.note.c or "",
        note_tags=list(prop.note.t or []),
        note_remark=(prop.note.r or "")[:60],
        doc=bool(prop.doc),
        doc_path=prop.path,
        prop_id=prop_id,
    )


async def insert_tree(
    repo: MindmapRepository,
    map_id: uuid.UUID,
    nodes: list[TreeNodeIn],
    used_node_ids: set[uuid.UUID],
    used_prop_ids: set[uuid.UUID],
    parent_id: uuid.UUID | None = None,
) -> None:
    """按层插入节点与节点级属性（父先于子）。"""
    for index, item in enumerate(nodes, start=1):
        node_id = item.id
        if node_id is None or node_id in used_node_ids:
            node_id = uuid.uuid4()
        used_node_ids.add(node_id)
        await repo.create_node(
            map_id=map_id,
            parent_id=parent_id,
            name=clean_name(item.name),
            sort_order=index,
            node_id=node_id,
        )
        for prop in item.props:
            await insert_prop(repo, map_id, node_id, prop, used_prop_ids)
        await insert_tree(
            repo, map_id, item.children, used_node_ids, used_prop_ids, parent_id=node_id
        )
