"""模块 C：知识地图 schemas（契约见 docs/15 模块 C 与数据模型定义）。"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class NotePayloadOut(BaseModel):
    """前端 NotePayload 原样字段名（types/index.ts L1-5）。"""

    c: str = ""
    t: list[str] = []
    r: str = ""


class TreeNodePropOut(BaseModel):
    prop_id: str
    label: str
    note: NotePayloadOut
    doc: bool | None = False
    path: str | None = None


class TreeNodeOut(BaseModel):
    id: str
    name: str
    props: list[TreeNodePropOut] = []
    children: list["TreeNodeOut"] = []


class RepoRefOut(BaseModel):
    id: str
    name: str


class MapOut(BaseModel):
    """TreeMap：地图 + 地图级属性 + 完整递归节点树。"""

    id: str
    title: str
    desc: str | None = None
    props: list[TreeNodePropOut] = []
    nodes: list[TreeNodeOut] = []
    repo: RepoRefOut | None = None


class MapSummaryOut(BaseModel):
    """C-1 列表项：含聚合计数（P18）。"""

    id: str
    title: str
    desc: str
    node_count: int = 0
    prop_count: int = 0
    repo: RepoRefOut | None = None


class MapExportOut(BaseModel):
    """C-8 导出（exportedAt 保持契约 camelCase 输出）。"""

    app: str = "linkmind"
    version: int = 1
    exported_at: datetime = Field(
        default_factory=lambda: datetime.now(), serialization_alias="exportedAt"
    )
    maps: list[MapOut] = []


# ------------------------------------------------------------------ 请求体
class NotePayloadIn(BaseModel):
    c: str = Field(default="", max_length=500, description="笔记正文（Markdown）")
    t: list[str] = Field(default_factory=list, description="标签列表")
    r: str = Field(default="", max_length=60, description="备注（文档属性时存文档路径）")


class TreeNodePropIn(BaseModel):
    prop_id: uuid.UUID | None = None
    label: str = Field(min_length=1, max_length=30)
    note: NotePayloadIn
    doc: bool | None = False
    path: str | None = None


class TreeNodeIn(BaseModel):
    id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=30)
    props: list[TreeNodePropIn] = []
    children: list["TreeNodeIn"] = []


class MapCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=30)
    desc: str = Field(default="", max_length=80)


class RepoRefIn(BaseModel):
    id: uuid.UUID
    name: str | None = None


class MapUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=30)
    desc: str | None = Field(default=None, max_length=80)
    repo: RepoRefIn | None = None


class TreeSaveIn(BaseModel):
    """C-6 整树批量保存：Body 为完整 TreeMap.nodes。"""

    nodes: list[TreeNodeIn] = []


class MapImportIn(BaseModel):
    """C-7 地图导入：目录来源（repo_id+path）或直接提交转换后的 TreeMap。"""

    repo_id: uuid.UUID | None = None
    path: str | None = Field(default=None, max_length=1024)
    title: str | None = Field(default=None, min_length=1, max_length=30)
    desc: str = Field(default="", max_length=80)
    props: list[TreeNodePropIn] | None = None
    nodes: list[TreeNodeIn] | None = None

    @model_validator(mode="after")
    def _require_source(self) -> "MapImportIn":
        if self.nodes is None and not self.path:
            raise ValueError("请提供 path（目录导入），或直接提交 nodes（TreeMap）；repo_id 可选用于绑定仓库")
        return self


TreeNodeOut.model_rebuild()
TreeNodeIn.model_rebuild()
