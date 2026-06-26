from fastapi import APIRouter, HTTPException
from services.cluster_service import perform_clustering, get_clusters
from utils.response import success_response, error_response

cluster_router = APIRouter()


@cluster_router.post("/louvain", response_model=dict)
async def louvain_clustering():
    """
    触发Louvain社区检测算法，重新聚类并更新节点community_id
    """
    try:
        result = await perform_clustering()
        return success_response(data=result)
    except Exception as e:
        return error_response(code=500, msg=f"聚类失败: {str(e)}")


@cluster_router.get("/statistics", response_model=dict)
async def cluster_statistics():
    """
    获取聚类统计信息
    """
    try:
        stats = await get_clusters()
        return success_response(data=stats)
    except Exception as e:
        return error_response(code=500, msg=f"获取统计信息失败: {str(e)}")
