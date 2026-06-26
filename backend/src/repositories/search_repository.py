from database.neo4j_connection import get_driver
from typing import List, Dict, Optional
from datetime import datetime, timedelta


def convert_datetime(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = convert_datetime(value)
        return obj
    if hasattr(obj, 'to_native'):
        return obj.to_native()
    return obj


async def fulltext_search(keyword: str, limit: int = 20) -> List[Dict]:
    """
    使用全文索引搜索笔记（title+content）
    """
    driver = await get_driver()
    
    async with driver.session() as session:
        query = """
            CALL db.index.fulltext.queryNodes('noteFulltextIndex', $keyword)
            YIELD node, score
            OPTIONAL MATCH (node)-[r]-()
            WITH node, score, count(r) AS degree
            RETURN node.id AS id, node.title AS title, node.content AS content,
                   node.community_id AS community_id, node.type AS type,
                   node.created_at AS created_at, node.updated_at AS updated_at,
                   degree, score
            ORDER BY score DESC
            LIMIT $limit
        """
        
        result = await session.run(query, keyword=keyword, limit=limit)
        data = await result.data()
        return [convert_datetime(d) for d in data]


async def filter_nodes(
    type_filter: Optional[str] = None,
    tag_filter: Optional[str] = None,
    days_filter: Optional[int] = None,
    min_degree: Optional[int] = None,
    max_degree: Optional[int] = None,
) -> Dict:
    """
    多条件筛选节点
    支持：类型、标签、时间范围、度数范围
    """
    driver = await get_driver()
    
    conditions = []
    params = {}
    
    if type_filter:
        conditions.append("n.type = $type_filter")
        params["type_filter"] = type_filter
    
    if tag_filter:
        conditions.append("n.tags CONTAINS $tag_filter")
        params["tag_filter"] = tag_filter
    
    if days_filter:
        date_threshold = datetime.now() - timedelta(days=days_filter)
        conditions.append("n.updated_at >= $date_threshold")
        params["date_threshold"] = date_threshold.isoformat()
    
    if min_degree is not None:
        conditions.append("degree >= $min_degree")
        params["min_degree"] = min_degree
    
    if max_degree is not None:
        conditions.append("degree <= $max_degree")
        params["max_degree"] = max_degree
    
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    async with driver.session() as session:
        nodes_query = f"""
            MATCH (n:Note)
            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(r) AS degree
            {where_clause}
            RETURN n.id AS id, n.title AS title, n.content AS content,
                   n.community_id AS community_id, n.type AS type,
                   n.created_at AS created_at, n.updated_at AS updated_at,
                   degree
        """
        
        result = await session.run(nodes_query, **params)
        nodes_data = await result.data()
        nodes = [convert_datetime(n) for n in nodes_data]
        
        node_ids = [n['id'] for n in nodes]
        
        links_query = """
            MATCH (a)-[r:LINK]->(b)
            WHERE a.id IN $node_ids AND b.id IN $node_ids
            RETURN r.id AS id, a.id AS source, b.id AS target, 
                   r.weight AS weight, r.description AS description
        """
        
        links_result = await session.run(links_query, node_ids=node_ids)
        links_data = await links_result.data()
        links = [convert_datetime(l) for l in links_data]
        
        return {
            "nodes": nodes,
            "links": links,
            "total_nodes": len(nodes),
            "total_links": len(links),
            "filters_applied": {
                "type": type_filter,
                "tag": tag_filter,
                "days": days_filter,
                "min_degree": min_degree,
                "max_degree": max_degree,
            }
        }


async def get_review_errors() -> List[Dict]:
    """
    错题复盘：获取标记为错误的笔记
    基于type='error'或tags包含'error'
    """
    driver = await get_driver()
    
    async with driver.session() as session:
        query = """
            MATCH (n:Note)
            WHERE n.type = 'error' OR n.tags CONTAINS 'error'
            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(r) AS degree
            RETURN n.id AS id, n.title AS title, n.content AS content,
                   n.community_id AS community_id, n.type AS type,
                   n.created_at AS created_at, n.updated_at AS updated_at,
                   degree
            ORDER BY n.updated_at DESC
        """
        
        result = await session.run(query)
        data = await result.data()
        return [convert_datetime(d) for d in data]


async def get_review_high_weight(min_weight: float = 2.0) -> List[Dict]:
    """
    高权重重点复盘：获取高权重关系的节点
    """
    driver = await get_driver()
    
    async with driver.session() as session:
        query = """
            MATCH (n:Note)-[r:LINK]-(m:Note)
            WHERE r.weight >= $min_weight
            WITH n, count(DISTINCT r) AS high_weight_count
            OPTIONAL MATCH (n)-[rel]-()
            WITH n, high_weight_count, count(rel) AS degree
            RETURN n.id AS id, n.title AS title, n.content AS content,
                   n.community_id AS community_id, n.type AS type,
                   n.created_at AS created_at, n.updated_at AS updated_at,
                   degree, high_weight_count
            ORDER BY high_weight_count DESC, degree DESC
        """
        
        result = await session.run(query, min_weight=min_weight)
        data = await result.data()
        return [convert_datetime(d) for d in data]


async def get_review_recent_days(days: int = 7) -> List[Dict]:
    """
    近七日更新复盘：获取最近days天内更新的笔记
    """
    driver = await get_driver()
    
    date_threshold = datetime.now() - timedelta(days=days)
    
    async with driver.session() as session:
        query = """
            MATCH (n:Note)
            WHERE n.updated_at >= $date_threshold
            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(r) AS degree
            RETURN n.id AS id, n.title AS title, n.content AS content,
                   n.community_id AS community_id, n.type AS type,
                   n.created_at AS created_at, n.updated_at AS updated_at,
                   degree
            ORDER BY n.updated_at DESC
        """
        
        result = await session.run(query, date_threshold=date_threshold.isoformat())
        data = await result.data()
        return [convert_datetime(d) for d in data]