from database.neo4j_connection import get_driver
from typing import List, Dict


def convert_datetime(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = convert_datetime(value)
        return obj
    if hasattr(obj, 'to_native'):
        return obj.to_native()
    return obj


async def get_full_graph(limit: int = None) -> Dict:
    driver = await get_driver()
    async with driver.session() as session:
        if limit:
            nodes_result = await session.run(
                """
                MATCH (n:Note)
                OPTIONAL MATCH (n)-[r]-()
                WITH n, COUNT(r) AS degree
                ORDER BY degree DESC
                LIMIT $limit
                RETURN n.id AS id, n.title AS title, n.content AS content, 
                       n.community_id AS community_id, n.type AS type,
                       degree
                """,
                limit=limit
            )
        else:
            nodes_result = await session.run(
                """
                MATCH (n:Note)
                OPTIONAL MATCH (n)-[r]-()
                RETURN n.id AS id, n.title AS title, n.content AS content, 
                       n.community_id AS community_id, n.type AS type,
                       COUNT(r) AS degree
                """
            )
        nodes_data = await nodes_result.data()
        nodes = [convert_datetime(n) for n in nodes_data]

        node_ids = [n['id'] for n in nodes]
        
        links_result = await session.run(
            """
            MATCH (a:Note)-[r:LINK]->(b:Note)
            WHERE a.id IN $node_ids AND b.id IN $node_ids
            RETURN r.id AS id, a.id AS source, b.id AS target, r.weight AS weight
            """,
            node_ids=node_ids
        )
        links_data = await links_result.data()
        links = [convert_datetime(l) for l in links_data]

        total_result = await session.run("MATCH (n:Note) RETURN COUNT(n) AS count")
        total_data = await total_result.single()
        total_nodes = total_data['count'] if total_data else 0

        return {
            "nodes": nodes,
            "links": links,
            "total_nodes": total_nodes,
            "total_links": len(links),
            "has_more": total_nodes > len(nodes)
        }