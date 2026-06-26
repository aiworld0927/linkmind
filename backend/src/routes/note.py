from fastapi import APIRouter, HTTPException
from models.note import NoteCreate, NoteUpdate, NoteResponse, NoteListResponse
from services.note_service import (
    create_note_with_dedup,
    get_note,
    update_note_service,
    delete_note_service,
    list_notes_service,
)
from utils.response import success_response, error_response

note_router = APIRouter(prefix="/notes", tags=["Notes"])


@note_router.post("/", response_model=dict)
async def create_note_endpoint(note: NoteCreate):
    result = await create_note_with_dedup(note.title, note.content)
    if result["status"] == "duplicate":
        return success_response(data=result["note"], msg="Note already exists")
    if result["status"] == "created":
        return success_response(data=result["note"], msg="Note created successfully")
    return error_response(code=500, msg="Failed to create note")


@note_router.get("/{note_id}", response_model=dict)
async def get_note_endpoint(note_id: str):
    note = await get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return success_response(data=note)


@note_router.put("/{note_id}", response_model=dict)
async def update_note_endpoint(note_id: str, note: NoteUpdate):
    updated_note = await update_note_service(note_id, note.title, note.content)
    if not updated_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return success_response(data=updated_note, msg="Note updated successfully")


@note_router.delete("/{note_id}", response_model=dict)
async def delete_note_endpoint(note_id: str):
    deleted = await delete_note_service(note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return success_response(msg="Note deleted successfully")


@note_router.get("/", response_model=dict)
async def list_notes_endpoint():
    result = await list_notes_service()
    return success_response(data=result)