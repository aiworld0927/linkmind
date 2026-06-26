from pydantic import BaseModel, Field
from datetime import datetime


class LinkCreate(BaseModel):
    source_id: str = Field(..., description="源节点ID")
    target_id: str = Field(..., description="目标节点ID")


class LinkResponse(BaseModel):
    id: str = Field(..., description="关系唯一标识")
    source_id: str = Field(..., description="源节点ID")
    target_id: str = Field(..., description="目标节点ID")
    created_at: datetime = Field(..., description="创建时间")


class LinkListResponse(BaseModel):
    links: list[LinkResponse] = Field(..., description="关系列表")
    total: int = Field(..., description="总数")