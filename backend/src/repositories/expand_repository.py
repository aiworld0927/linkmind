from database.neo4j_connection import get_driver
from typing import Optional, List, Dict


def convert_datetime(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = convert_datetime(value)
        return obj
    if hasattr(obj, 'to_native'):
        return obj.to_native()
    return obj


async def get_node_neighborhood(node_id: str, depth: int = 1, type_filter: Optional[str] = None) -> Dict:
    driver = await get_driver()
    depth = min(max(depth, 1), 3)
    
    type_condition = ""
    if type_filter:
        type_condition = f"AND n.type = '{type_filter}'"
    
    async with driver.session() as session:
        nodes_query = f"""
            MATCH path = (center:Note {{id: $node_id}})-[r*1..{depth}]-(neighbor:Note)
            WHERE {type_condition if type_condition else 'true'}
            WITH DISTINCT neighbor, min(length(path)) AS minDepth
            OPTIONAL MATCH (neighbor)-[rel]-()
            WITH neighbor, minDepth, count(rel) AS degree
            RETURN neighbor.id AS id, neighbor.title AS title, neighbor.content AS content,
                   neighbor.community_id AS community_id, neighbor.type AS type,
                   degree, minDepth AS distance
        """
        
        result = await session.run(nodes_query, node_id=node_id)
        nodes_data = await result.data()
        nodes = [convert_datetime(n) for n in nodes_data]
        
        all_node_ids = [node_id] + [n['id'] for n in nodes]
        
        links_query = """
            MATCH (a)-[r:LINK]->(b)
            WHERE a.id IN $node_ids AND b.id IN $node_ids
            RETURN r.id AS id, a.id AS source, b.id AS target, 
                   r.weight AS weight, r.description AS description,
                   'LINK' AS type
        """
        
        links_result = await session.run(links_query, node_ids=all_node_ids)
        links_data = await links_result.data()
        links = [convert_datetime(l) for l in links_data]
        
        return {
            "center_id": node_id,
            "nodes": nodes,
            "links": links,
            "total_nodes": len(nodes) + 1,
            "total_links": len(links),
            "depth": depth,
        }


async def find_shortest_path(source_id: str, target_id: str) -> Dict:
    driver = await get_driver()
    
    async with driver.session() as session:
        path_query = """
            MATCH path = shortestPath((source:Note {id: $source_id})-[*]-(target:Note {id: $target_id}))
            WITH path
            WITH nodes(path) AS pathNodes, relationships(path) AS pathRels
            UNWIND pathNodes AS n
            WITH collect(DISTINCT n) AS uniqueNodes, pathRels
            UNWIND uniqueNodes AS node
            RETURN node.id AS id, node.title AS title, node.content AS content,
                   node.community_id AS community_id, node.type AS type
        """
        
        result = await session.run(path_query, source_id=source_id, target_id=target_id)
        nodes_data = await result.data()
        
        if not nodes_data or len(nodes_data) == 0:
            return {
                "found": False,
                "source_id": source_id,
                "target_id": target_id,
                "nodes": [],
                "links": [],
                "message": "No path found between the two nodes",
            }
        
        nodes_list = [convert_datetime(n) for n in nodes_data]
        
        links_query = """
            MATCH path = shortestPath((source:Note {id: $source_id})-[*]-(target:Note {id: $target_id}))
            WITH path
            WITH relationships(path) AS pathRels
            UNWIND pathRels AS r
            WITH collect(DISTINCT r) AS uniqueRels
            UNWIND uniqueRels AS rel
            RETURN rel.id AS id, rel.weight AS weight, rel.description AS description
        """
        
        links_result = await session.run(links_query, source_id=source_id, target_id=target_id)
        links_data = await links_result.data()
        
        links_list = []
        for i, link_data in enumerate(links_data):
            converted = convert_datetime(link_data)
            if i < len(nodes_list) - 1:
                links_list.append({
                    "id": converted.get("id", ""),
                    "source": nodes_list[i]["id"],
                    "target": nodes_list[i + 1]["id"],
                    "weight": converted.get("weight", 1),
                    "description": converted.get("description", ""),
                })
        
        return {
            "found": True,
            "source_id": source_id,
            "target_id": target_id,
            "nodes": nodes_list,
            "links": links_list,
            "path_length": len(nodes_list) - 1 if len(nodes_list) > 0 else 0,
            "message": "Path found successfully",
        }