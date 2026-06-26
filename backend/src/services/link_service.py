from repositories.link_repository import (
    create_link,
    get_link_by_id,
    get_link_by_nodes,
    update_link,
    delete_link,
    list_links,
    count_links,
)
from repositories.note_repository import get_note_by_id
from typing import Optional, List, Dict


async def create_link_service(source_id: str, target_id: str) -> Dict:
    if source_id == target_id:
        return {
            "status": "error",
            "message": "Source and target cannot be the same",
        }

    source_note = await get_note_by_id(source_id)
    target_note = await get_note_by_id(target_id)

    if not source_note:
        return {
            "status": "error",
            "message": f"Source note {source_id} not found",
        }
    if not target_note:
        return {
            "status": "error",
            "message": f"Target note {target_id} not found",
        }

    existing_link = await get_link_by_nodes(source_id, target_id)
    if existing_link:
        return {
            "status": "duplicate",
            "message": "Link already exists",
            "link": existing_link,
        }

    new_link = await create_link(source_id, target_id)
    return {
        "status": "created",
        "message": "Link created successfully",
        "link": new_link,
    }


async def get_link(link_id: str) -> Optional[Dict]:
    return await get_link_by_id(link_id)


async def update_link_service(link_id: str, source_id: Optional[str] = None, target_id: Optional[str] = None) -> Dict:
    current_link = await get_link_by_id(link_id)
    if not current_link:
        return {
            "status": "error",
            "message": f"Link {link_id} not found",
        }

    if source_id is not None and source_id == target_id:
        return {
            "status": "error",
            "message": "Source and target cannot be the same",
        }

    if source_id is not None:
        source_note = await get_note_by_id(source_id)
        if not source_note:
            return {
                "status": "error",
                "message": f"Source note {source_id} not found",
            }

    if target_id is not None:
        target_note = await get_note_by_id(target_id)
        if not target_note:
            return {
                "status": "error",
                "message": f"Target note {target_id} not found",
            }

    updated_link = await update_link(link_id, source_id, target_id)
    return {
        "status": "updated",
        "message": "Link updated successfully",
        "link": updated_link,
    }


async def delete_link_service(link_id: str) -> Dict:
    link = await get_link_by_id(link_id)
    if not link:
        return {
            "status": "error",
            "message": f"Link {link_id} not found",
        }
    deleted = await delete_link(link_id)
    if deleted:
        return {
            "status": "deleted",
            "message": "Link deleted successfully",
        }
    return {
        "status": "error",
        "message": "Failed to delete link",
    }


async def list_links_service() -> Dict:
    links = await list_links()
    total = await count_links()
    return {"links": links, "total": total}