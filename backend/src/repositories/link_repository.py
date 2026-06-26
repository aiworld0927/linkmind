from database.neo4j_connection import get_driver
from typing import Optional, List, Dict
from datetime import datetime


def convert_datetime(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = convert_datetime(value)
        return obj
    if hasattr(obj, 'to_native'):
        return obj.to_native()
    return obj


async def create_link(source_id: str, target_id: str) -> Optional[Dict]:
    driver = await get_driver()
    now = datetime.now()

    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (s:Note {id: $source_id}), (t:Note {id: $target_id})
            WHERE s <> t
            CREATE (s)-[r:LINK {id: randomUUID(), created_at: $created_at}]->(t)
            RETURN r.id AS id, s.id AS source_id, t.id AS target_id, r.created_at AS created_at
            """,
            source_id=source_id,
            target_id=target_id,
            created_at=now,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def get_link_by_id(link_id: str) -> Optional[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH ()-[r:LINK {id: $link_id}]->()
            RETURN r.id AS id, STARTNODE(r).id AS source_id, ENDNODE(r).id AS target_id, 
                   r.created_at AS created_at
            """,
            link_id=link_id,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def get_link_by_nodes(source_id: str, target_id: str) -> Optional[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (s:Note {id: $source_id})-[r:LINK]->(t:Note {id: $target_id})
            RETURN r.id AS id, s.id AS source_id, t.id AS target_id, r.created_at AS created_at
            """,
            source_id=source_id,
            target_id=target_id,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def update_link(link_id: str, new_source_id: str = None, new_target_id: str = None) -> Optional[Dict]:
    driver = await get_driver()

    if new_source_id is None and new_target_id is None:
        return await get_link_by_id(link_id)

    async with driver.session() as session:
        current_link = await get_link_by_id(link_id)
        if not current_link:
            return None

        source_id = new_source_id if new_source_id else current_link["source_id"]
        target_id = new_target_id if new_target_id else current_link["target_id"]

        result = await session.run(
            """
            MATCH ()-[r:LINK {id: $link_id}]->()
            DELETE r
            WITH $source_id AS source_id, $target_id AS target_id
            MATCH (s:Note {id: source_id}), (t:Note {id: target_id})
            CREATE (s)-[r:LINK {id: $link_id, created_at: $created_at}]->(t)
            RETURN r.id AS id, s.id AS source_id, t.id AS target_id, r.created_at AS created_at
            """,
            link_id=link_id,
            source_id=source_id,
            target_id=target_id,
            created_at=current_link["created_at"],
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def delete_link(link_id: str) -> bool:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH ()-[r:LINK {id: $link_id}]->()
            DELETE r
            RETURN COUNT(r) AS deleted
            """,
            link_id=link_id,
        )
        record = await result.single()
        return record and record["deleted"] > 0


async def list_links() -> List[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH ()-[r:LINK]->()
            RETURN r.id AS id, STARTNODE(r).id AS source_id, ENDNODE(r).id AS target_id, 
                   r.created_at AS created_at
            ORDER BY r.created_at DESC
            """
        )
        records = await result.data()
        return [convert_datetime(r) for r in records]


async def count_links() -> int:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run("MATCH ()-[r:LINK]->() RETURN COUNT(r) AS count")
        record = await result.single()
        return record["count"] if record else 0


async def get_links_by_note(note_id: str) -> List[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (s:Note {id: $note_id})-[r:LINK]->(t:Note)
            RETURN r.id AS id, s.id AS source_id, t.id AS target_id, r.created_at AS created_at
            UNION ALL
            MATCH (s:Note)-[r:LINK]->(t:Note {id: $note_id})
            RETURN r.id AS id, s.id AS source_id, t.id AS target_id, r.created_at AS created_at
            """,
            note_id=note_id,
        )
        records = await result.data()
        return [convert_datetime(r) for r in records]