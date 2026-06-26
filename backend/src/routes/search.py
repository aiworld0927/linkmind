from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from services.search_service import (
    search_notes,
    filter_graph,
    get_error_review,
    get_high_weight_review,
    get_recent_review,
)
from utils.response import success_response, error_response

search_router = APIRouter(prefix="/search", tags=["Search"])


class SearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, description="搜索关键词")
    limit: int = Field(default=20, ge=1, le=100, description="返回结果数量限制")


class FilterRequest(BaseModel):
    type_filter: Optional[str] = Field(None, description="节点类型筛选")
    tag_filter: Optional[str] = Field(None, description="标签筛选")
    days_filter: Optional[int] = Field(None, ge=1, description="时间范围筛选（天数）")
    min_degree: Optional[int] = Field(None, ge=0, description="最小度数")
    max_degree: Optional[int] = Field(None, ge=0, description="最大度数")


@search_router.get("/fulltext", response_model=dict)
async def fulltext_search_endpoint(
    keyword: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(default=20, ge=1, le=100, description="返回结果数量限制"),
):
    try:
        results = await search_notes(keyword, limit)
        return success_response(data={"results": results, "total": len(results)})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"搜索失败: {str(e)}")


@search_router.post("/fulltext", response_model=dict)
async def fulltext_search_post_endpoint(request: SearchRequest):
    try:
        results = await search_notes(request.keyword, request.limit)
        return success_response(data={"results": results, "total": len(results)})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"搜索失败: {str(e)}")


@search_router.get("/filter", response_model=dict)
async def filter_graph_endpoint(
    type_filter: Optional[str] = Query(None, description="节点类型筛选"),
    tag_filter: Optional[str] = Query(None, description="标签筛选"),
    days_filter: Optional[int] = Query(None, ge=1, description="时间范围筛选（天数）"),
    min_degree: Optional[int] = Query(None, ge=0, description="最小度数"),
    max_degree: Optional[int] = Query(None, ge=0, description="最大度数"),
):
    try:
        result = await filter_graph(
            type_filter=type_filter,
            tag_filter=tag_filter,
            days_filter=days_filter,
            min_degree=min_degree,
            max_degree=max_degree,
        )
        return success_response(data=result)
    except Exception as e:
        return error_response(code=500, msg=f"筛选失败: {str(e)}")


@search_router.post("/filter", response_model=dict)
async def filter_graph_post_endpoint(request: FilterRequest):
    try:
        result = await filter_graph(
            type_filter=request.type_filter,
            tag_filter=request.tag_filter,
            days_filter=request.days_filter,
            min_degree=request.min_degree,
            max_degree=request.max_degree,
        )
        return success_response(data=result)
    except Exception as e:
        return error_response(code=500, msg=f"筛选失败: {str(e)}")


@search_router.get("/review/errors", response_model=dict)
async def review_errors_endpoint():
    try:
        results = await get_error_review()
        return success_response(data={"results": results, "total": len(results), "type": "errors"})
    except Exception as e:
        return error_response(code=500, msg=f"错题复盘失败: {str(e)}")


@search_router.get("/review/high-weight", response_model=dict)
async def review_high_weight_endpoint(
    min_weight: float = Query(default=2.0, ge=0, description="最小权重值"),
):
    try:
        results = await get_high_weight_review(min_weight)
        return success_response(data={"results": results, "total": len(results), "type": "high_weight"})
    except Exception as e:
        return error_response(code=500, msg=f"高权重复盘失败: {str(e)}")


@search_router.get("/review/recent", response_model=dict)
async def review_recent_endpoint(
    days: int = Query(default=7, ge=1, le=365, description="天数范围"),
):
    try:
        results = await get_recent_review(days)
        return success_response(data={"results": results, "total": len(results), "type": "recent", "days": days})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(code=500, msg=f"近七日复盘失败: {str(e)}")