"""模块 D：脑图节点编辑 schemas。"""

import uuid

from pydantic import BaseModel, Field, field_validator

from app.api.v1.mindmap.schemas.maps import MapOut, TreeNodeOut

NodeOut = TreeNodeOut


class NodeCreateIn(BaseModel):
    parent_id: str = Field(description="'ROOT' 表示挂地图根级，否则为父节点 uuid")
    name: str = Field(min_length=1, max_length=30)

    @field_validator("parent_id")
    @classmethod
    def _validate_parent(cls, value: str) -> str:
        if value == "ROOT":
            return value
        try:
            uuid.UUID(value)
        except ValueError as exc:
            raise ValueError("parent_id 必须为 'ROOT' 或合法 uuid") from exc
        return value


class NodeRenameIn(BaseModel):
    name: str = Field(min_length=1, max_length=30)


# D-2 响应：node_id='ROOT' 时返回 MapOut（改地图标题），否则返回 TreeNodeOut
NodeRenameData = TreeNodeOut | MapOut
