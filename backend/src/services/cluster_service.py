from typing import Dict
from repositories.cluster_repository import (
    run_louvain_clustering,
    update_community_ids,
    get_cluster_statistics
)


async def perform_clustering() -> Dict:
    """
    执行完整的聚类流程
    """
    partition = await run_louvain_clustering()
    
    if not partition:
        return {
            'success': True,
            'message': '无数据需要聚类',
            'community_count': 0,
            'updated_count': 0
        }
    
    updated_count = await update_community_ids(partition)
    stats = await get_cluster_statistics()
    
    return {
        'success': True,
        'message': f'聚类完成，共发现 {len(set(partition.values()))} 个社区',
        'community_count': len(set(partition.values())),
        'updated_count': updated_count,
        'statistics': stats
    }


async def get_clusters() -> Dict:
    """
    获取聚类统计信息
    """
    return await get_cluster_statistics()
