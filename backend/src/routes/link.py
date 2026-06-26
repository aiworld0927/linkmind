from fastapi import APIRouter, HTTPException
from models.link import LinkCreate, LinkResponse, LinkListResponse
from services.link_service import (
    create_link_service,
    get_link,
    update_link_service,
    delete_link_service,
    list_links_service,
)
from utils.response import success_response, error_response

link_router = APIRouter(prefix="/links", tags=["Links"])


@link_router.post("/", response_model=dict)
async def create_link_endpoint(link: LinkCreate):
    result = await create_link_service(link.source_id, link.target_id)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    if result["status"] == "duplicate":
        return success_response(data=result["link"], msg="Link already exists")
    return success_response(data=result["link"], msg="Link created successfully")


@link_router.get("/{link_id}", response_model=dict)
async def get_link_endpoint(link_id: str):
    link = await get_link(link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return success_response(data=link)


@link_router.put("/{link_id}", response_model=dict)
async def update_link_endpoint(link_id: str, link: LinkCreate):
    result = await update_link_service(link_id, link.source_id, link.target_id)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return success_response(data=result["link"], msg="Link updated successfully")


@link_router.delete("/{link_id}", response_model=dict)
async def delete_link_endpoint(link_id: str):
    result = await delete_link_service(link_id)
    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])
    return success_response(msg="Link deleted successfully")


@link_router.get("/", response_model=dict)
async def list_links_endpoint():
    result = await list_links_service()
    return success_response(data=result)