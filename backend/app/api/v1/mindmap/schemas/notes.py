"""模块 F：文档内容编辑模式 schemas。"""

from pydantic import BaseModel, Field

from app.api.v1.mindmap.schemas.maps import TreeNodePropOut


class NoteOut(BaseModel):
    """F-1 读取笔记内容（结构化字段替代 markdownize 约定行，Q13）。"""

    label: str
    node_path: str
    content: str
    tags: list[str]
    remark: str
    doc: bool
    doc_path: str | None


class NoteUpdateIn(BaseModel):
    """F-2 保存笔记内容；tags/remark 缺省时保持原值。"""

    content: str = Field(min_length=0, description="Markdown 全文")
    tags: list[str] | None = None
    remark: str | None = Field(default=None, max_length=60)

    model_config = {"extra": "forbid"}


F2Data = TreeNodePropOut
