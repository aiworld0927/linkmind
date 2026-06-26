from typing import Dict, List, Tuple
import networkx as nx
from community import community_louvain
from neo4j import AsyncGraphDatabase

from database.neo4j_connection import get_driver


async def run_louvain_clustering() -> Dict[str, int]:
    """
    运行Louvain社区检测算法
    返回节点ID到community_id的映射
    """
    driver = await get_driver()
    
    async with driver.session() as session:
        nodes_query = """
            MATCH (n:Note)
            RETURN n.id AS id, n.title AS title
        """
        nodes_result = await session.run(nodes_query)
        nodes = await nodes_result.data()
        
        edges_query = """
            MATCH (n:Note)-[r:LINK]->(m:Note)
            RETURN n.id AS source, m.id AS target, r.weight AS weight
        """
        edges_result = await session.run(edges_query)
        edges = await edges_result.data()
    
    if not nodes:
        return {}
    
    G = nx.Graph()
    for node in nodes:
        G.add_node(node['id'], title=node['title'])
    
    for edge in edges:
        weight = edge.get('weight')
        if weight is None or not isinstance(weight, (int, float)):
            weight = 1.0
        G.add_edge(edge['source'], edge['target'], weight=float(weight))
    
    if len(G.edges()) == 0:
        return {node['id']: 0 for node in nodes}
    
    partition = community_louvain.best_partition(G, weight='weight')
    
    for node_id, community_id in partition.items():
        if community_id is None:
            partition[node_id] = 0
    
    return partition


async def update_community_ids(partition: Dict[str, int]) -> int:
    """
    将社区ID写回Neo4j节点
    返回更新的节点数量
    """
    if not partition:
        return 0
    
    driver = await get_driver()
    updated_count = 0
    
    async with driver.session() as session:
        for node_id, community_id in partition.items():
            query = """
                MATCH (n:Note)
                WHERE n.id = $node_id
                SET n.community_id = $community_id
            """
            result = await session.run(query, node_id=node_id, community_id=community_id)
            summary = await result.consume()
            counters = summary.counters
            updated_count += counters.properties_set if counters.properties_set else 0
    
    return updated_count


async def get_cluster_statistics() -> Dict:
    """
    获取聚类统计信息
    """
    driver = await get_driver()
    
    async with driver.session() as session:
        query = """
            MATCH (n:Note)
            WHERE n.community_id IS NOT NULL
            WITH n.community_id AS community, COUNT(n) AS count
            ORDER BY count DESC
            RETURN community, count
        """
        result = await session.run(query)
        data = await result.data()
        
        total_query = """
            MATCH (n:Note)
            RETURN COUNT(n) AS total_nodes
        """
        total_result = await session.run(total_query)
        total_data = await total_result.single()
        
        edge_query = """
            MATCH ()-[r:LINK]->()
            RETURN COUNT(r) AS total_edges
        """
        edge_result = await session.run(edge_query)
        edge_data = await edge_result.single()
    
    return {
        'communities': data,
        'total_nodes': total_data['total_nodes'] if total_data else 0,
        'total_edges': edge_data['total_edges'] if edge_data else 0,
        'community_count': len(data)
    }
