"""模块 E：属性与文档编辑 schemas。"""

from pydantic import BaseModel, Field

from app.api.v1.mindmap.schemas.maps import NotePayloadIn, TreeNodePropOut

PropOut = TreeNodePropOut


class PropCreateIn(BaseModel):
    label: str = Field(min_length=1, max_length=30)
    note: NotePayloadIn


class PropUpdateIn(BaseModel):
    label: str = Field(min_length=1, max_length=30)
    note: NotePayloadIn
