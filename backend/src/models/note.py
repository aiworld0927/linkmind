from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="笔记标题")
    content: str = Field(..., description="笔记内容")


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="笔记标题")
    content: Optional[str] = Field(None, description="笔记内容")


class NoteResponse(BaseModel):
    id: str = Field(..., description="节点唯一标识")
    title: str = Field(..., description="笔记标题")
    content: str = Field(..., description="笔记内容")
    hash: str = Field(..., description="标题+内容哈希值")
    degree: int = Field(..., description="关联度数")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class NoteListResponse(BaseModel):
    notes: list[NoteResponse] = Field(..., description="笔记列表")
    total: int = Field(..., description="总数")