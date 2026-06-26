from fastapi import APIRouter, Query
from repositories.graph_repository import get_full_graph
from utils.response import success_response

graph_router = APIRouter(prefix="/graph", tags=["Graph"])


@graph_router.get("/", response_model=dict)
async def get_full_graph_endpoint(
    limit: int = Query(default=None, ge=1, le=500, description="返回节点数量限制")
):
    result = await get_full_graph(limit=limit)
    return success_response(data=result)