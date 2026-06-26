from repositories.note_repository import (
    create_note,
    get_note_by_id,
    get_note_by_hash,
    update_note,
    delete_note,
    list_notes,
    count_notes,
    compute_hash,
)
from typing import Optional, List, Dict


async def create_note_with_dedup(title: str, content: str) -> Dict:
    note_hash = compute_hash(title, content)
    existing_note = await get_note_by_hash(note_hash)
    if existing_note:
        return {
            "status": "duplicate",
            "message": "Note already exists",
            "note": existing_note,
        }
    new_note = await create_note(title, content)
    return {
        "status": "created",
        "message": "Note created successfully",
        "note": new_note,
    }


async def get_note(note_id: str) -> Optional[Dict]:
    return await get_note_by_id(note_id)


async def update_note_service(note_id: str, title: Optional[str] = None, content: Optional[str] = None) -> Optional[Dict]:
    return await update_note(note_id, title, content)


async def delete_note_service(note_id: str) -> bool:
    return await delete_note(note_id)


async def list_notes_service() -> Dict:
    notes = await list_notes()
    total = await count_notes()
    return {"notes": notes, "total": total}