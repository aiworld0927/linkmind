from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from services.expand_service import expand_neighborhood, find_path
from utils.response import success_response, error_response

expand_router = APIRouter(prefix="/expand", tags=["Expand"])


class ExpandRequest(BaseModel):
    node_id: str = Field(..., description="节点ID")
    depth: int = Field(default=1, ge=1, le=3, description="展开深度（1-3）")
    type_filter: Optional[str] = Field(None, description="节点类型筛选")


class PathRequest(BaseModel):
    source_id: str = Field(..., description="源节点ID")
    target_id: str = Field(..., description="目标节点ID")


@expand_router.get("/neighborhood", response_model=dict)
async def expand_neighborhood_endpoint(
    node_id: str = Query(..., description="节点ID"),
    depth: int = Query(default=1, ge=1, le=3, description="展开深度（1-3）"),
    type_filter: Optional[str] = Query(None, description="节点类型筛选"),
):
    try:
        result = await expand_neighborhood(node_id, depth, type_filter)
        return success_response(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"Expand failed: {str(e)}")


@expand_router.post("/neighborhood", response_model=dict)
async def expand_neighborhood_post_endpoint(request: ExpandRequest):
    try:
        result = await expand_neighborhood(request.node_id, request.depth, request.type_filter)
        return success_response(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"Expand failed: {str(e)}")


@expand_router.get("/path", response_model=dict)
async def find_path_endpoint(
    source_id: str = Query(..., description="源节点ID"),
    target_id: str = Query(..., description="目标节点ID"),
):
    try:
        result = await find_path(source_id, target_id)
        return success_response(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"Path query failed: {str(e)}")


@expand_router.post("/path", response_model=dict)
async def find_path_post_endpoint(request: PathRequest):
    try:
        result = await find_path(request.source_id, request.target_id)
        return success_response(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"Path query failed: {str(e)}")