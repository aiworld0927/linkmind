"""FS 模块请求/响应模型（B-1/B-2/F-3，docs/15 模块 B）。

B-1/B-2 为存量接口：字段名沿用前端 camelCase（hasChildren/mdCount/rootName，
评审 P4 过渡兼容）；F-3 与截断补充字段为 snake_case（P11）。
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class FsDirEntryOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    path: str
    has_children: bool
    md_count: int


class FsDirListingOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    root_name: str
    path: str
    name: str
    parent: str | None
    dirs: list[FsDirEntryOut]
    md_count: int


class FsTreeNodePropOut(BaseModel):
    label: str
    content: str | None = None
    path: str | None = None
    doc: bool | None = None
    # P11：截断标记与原始长度，配合 F-3 全文兜底
    truncated: bool = False
    content_length: int = 0


class FsTreeNodeOut(BaseModel):
    name: str
    path: str
    props: list[FsTreeNodePropOut] | None = None
    children: list["FsTreeNodeOut"] | None = None


class DocContentOut(BaseModel):
    """F-3 读取文档全文。"""

    path: str
    name: str
    content: str
