from repositories.search_repository import (
    fulltext_search,
    filter_nodes,
    get_review_errors,
    get_review_high_weight,
    get_review_recent_days,
)
from typing import Optional, Dict, List


async def search_notes(keyword: str, limit: int = 20) -> List[Dict]:
    """
    全文搜索笔记
    """
    if not keyword or len(keyword.strip()) == 0:
        raise ValueError("搜索关键词不能为空")
    return await fulltext_search(keyword.strip(), limit)


async def filter_graph(
    type_filter: Optional[str] = None,
    tag_filter: Optional[str] = None,
    days_filter: Optional[int] = None,
    min_degree: Optional[int] = None,
    max_degree: Optional[int] = None,
) -> Dict:
    """
    筛选图谱
    """
    return await filter_nodes(
        type_filter=type_filter,
        tag_filter=tag_filter,
        days_filter=days_filter,
        min_degree=min_degree,
        max_degree=max_degree,
    )


async def get_error_review() -> List[Dict]:
    """
    错题复盘
    """
    return await get_review_errors()


async def get_high_weight_review(min_weight: float = 2.0) -> List[Dict]:
    """
    高权重重点复盘
    """
    return await get_review_high_weight(min_weight)


async def get_recent_review(days: int = 7) -> List[Dict]:
    """
    近七日更新复盘
    """
    if days < 1:
        raise ValueError("天数必须大于0")
    return await get_review_recent_days(days)