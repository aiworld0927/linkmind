from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from services.markdown_import_service import import_markdown_files
from utils.response import success_response, error_response

markdown_router = APIRouter(prefix="/import", tags=["Import"])


class ImportRequest(BaseModel):
    file_paths: List[str] = Field(..., description="文件或目录路径列表")


@markdown_router.post("/markdown", response_model=dict)
async def import_markdown_endpoint(request: ImportRequest):
    if not request.file_paths:
        raise HTTPException(status_code=400, detail="File paths cannot be empty")

    try:
        result = await import_markdown_files(request.file_paths)
        return success_response(data=result, msg="Import completed")
    except Exception as e:
        return error_response(code=500, msg=f"Import failed: {str(e)}")