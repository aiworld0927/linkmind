from database.neo4j_connection import get_driver
from typing import Optional, List, Dict
import hashlib
from datetime import datetime


def compute_hash(title: str, content: str) -> str:
    return hashlib.md5(f"{title}{content}".encode("utf-8")).hexdigest()


def convert_datetime(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = convert_datetime(value)
        return obj
    if hasattr(obj, 'to_native'):
        return obj.to_native()
    return obj


async def create_note(title: str, content: str) -> Dict:
    driver = await get_driver()
    note_hash = compute_hash(title, content)
    now = datetime.now()

    async with driver.session() as session:
        result = await session.run(
            """
            CREATE (n:Note {
                id: randomUUID(),
                title: $title,
                content: $content,
                hash: $hash,
                created_at: $created_at,
                updated_at: $updated_at
            })
            RETURN n.id AS id, n.title AS title, n.content AS content, 
                   n.hash AS hash, n.created_at AS created_at, n.updated_at AS updated_at
            """,
            title=title,
            content=content,
            hash=note_hash,
            created_at=now,
            updated_at=now,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def get_note_by_id(note_id: str) -> Optional[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n:Note {id: $note_id})
            OPTIONAL MATCH (n)-[r]-()
            RETURN n.id AS id, n.title AS title, n.content AS content, 
                   n.hash AS hash, n.created_at AS created_at, n.updated_at AS updated_at,
                   COUNT(r) AS degree
            """,
            note_id=note_id,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def get_note_by_hash(note_hash: str) -> Optional[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n:Note {hash: $hash})
            RETURN n.id AS id, n.title AS title, n.content AS content, 
                   n.hash AS hash, n.created_at AS created_at, n.updated_at AS updated_at
            """,
            hash=note_hash,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def update_note(note_id: str, title: Optional[str] = None, content: Optional[str] = None) -> Optional[Dict]:
    driver = await get_driver()
    now = datetime.now()

    async with driver.session() as session:
        current_note = await get_note_by_id(note_id)
        if not current_note:
            return None

        new_title = title if title is not None else current_note["title"]
        new_content = content if content is not None else current_note["content"]
        new_hash = compute_hash(new_title, new_content)

        result = await session.run(
            """
            MATCH (n:Note {id: $note_id})
            SET n.title = $title, n.content = $content, n.hash = $hash, n.updated_at = $updated_at
            RETURN n.id AS id, n.title AS title, n.content AS content, 
                   n.hash AS hash, n.created_at AS created_at, n.updated_at AS updated_at
            """,
            note_id=note_id,
            title=new_title,
            content=new_content,
            hash=new_hash,
            updated_at=now,
        )
        record = await result.single()
        if record:
            return convert_datetime(record.data())
    return None


async def delete_note(note_id: str) -> bool:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n:Note {id: $note_id})
            DETACH DELETE n
            RETURN COUNT(n) AS deleted
            """,
            note_id=note_id,
        )
        record = await result.single()
        return record and record["deleted"] > 0


async def list_notes() -> List[Dict]:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n:Note)
            OPTIONAL MATCH (n)-[r]-()
            RETURN n.id AS id, n.title AS title, n.content AS content, 
                   n.hash AS hash, n.created_at AS created_at, n.updated_at AS updated_at,
                   COUNT(r) AS degree
            ORDER BY n.created_at DESC
            """
        )
        records = await result.data()
        return [convert_datetime(r) for r in records]


async def count_notes() -> int:
    driver = await get_driver()
    async with driver.session() as session:
        result = await session.run("MATCH (n:Note) RETURN COUNT(n) AS count")
        record = await result.single()
        return record["count"] if record else 0