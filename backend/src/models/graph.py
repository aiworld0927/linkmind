from pydantic import BaseModel, Field
from typing import List, Dict


class GraphNode(BaseModel):
    id: str = Field(..., description="节点ID")
    label: str = Field(..., description="节点标签")
    title: str = Field(..., description="节点标题")
    degree: int = Field(..., description="关联度数")


class GraphLink(BaseModel):
    id: str = Field(..., description="关系ID")
    source: str = Field(..., description="源节点ID")
    target: str = Field(..., description="目标节点ID")


class GraphResponse(BaseModel):
    nodes: List[GraphNode] = Field(..., description="节点列表")
    links: List[GraphLink] = Field(..., description="关系列表")
    total_nodes: int = Field(..., description="节点总数")
    total_links: int = Field(..., description="关系总数")