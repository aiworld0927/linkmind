"""Git 管理 REST API。

所有响应统一为 ``{code, msg, data}``；动作成功后返回最新仓库视图，
便于前端一次刷新状态、历史与审计。
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database.pg import get_session
from models.git import (
    GitCommitRequest,
    GitRepoCreateRequest,
    GitRepoView,
    GitResolveRequest,
)
from services.git_registry_service import GitRegistryService
from utils.response import success_response

git_router = APIRouter(prefix="/git", tags=["Git"])


def _service(session: AsyncSession) -> GitRegistryService:
    return GitRegistryService(session)


@git_router.get("/repos")
async def list_repos(session: AsyncSession = Depends(get_session)):
    repos = await _service(session).list_repos()
    return success_response(data={"repos": [repo.model_dump(mode="json") for repo in repos]})


@git_router.post("/repos")
async def create_repo(payload: GitRepoCreateRequest, session: AsyncSession = Depends(get_session)):
    repo = await _service(session).create_repo(
        name=payload.name,
        fs_path=payload.fs_path,
        init=payload.init,
        remote_url=payload.remote_url,
    )
    return success_response(data=repo.model_dump(mode="json"), msg="仓库登记成功")


@git_router.get("/repos/{repo_id}")
async def get_repo(repo_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    repo = await _service(session).get_repo(repo_id)
    return success_response(data=repo.model_dump(mode="json"))


@git_router.delete("/repos/{repo_id}")
async def delete_repo(repo_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    await _service(session).delete_repo(repo_id)
    return success_response(data={"removed": True}, msg="已移除仓库登记")


@git_router.post("/repos/{repo_id}/commit")
async def commit(
    repo_id: uuid.UUID,
    payload: GitCommitRequest,
    session: AsyncSession = Depends(get_session),
):
    repo, message = await _service(session).commit(
        repo_id,
        message=payload.message,
        paths=payload.paths,
        all_changes=payload.all,
    )
    return success_response(data=repo.model_dump(mode="json"), msg=message)


@git_router.post("/repos/{repo_id}/pull")
async def pull(repo_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    repo, message = await _service(session).pull(repo_id)
    return success_response(data=repo.model_dump(mode="json"), msg=message)


@git_router.post("/repos/{repo_id}/push")
async def push(repo_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    repo, message = await _service(session).push(repo_id)
    return success_response(data=repo.model_dump(mode="json"), msg=message)


@git_router.post("/repos/{repo_id}/conflicts/resolve")
async def resolve_conflict(
    repo_id: uuid.UUID,
    payload: GitResolveRequest,
    session: AsyncSession = Depends(get_session),
):
    repo, message = await _service(session).resolve_conflict(
        repo_id,
        path=payload.path,
        strategy=payload.strategy,
        content=payload.content,
    )
    return success_response(data=repo.model_dump(mode="json"), msg=message)


@git_router.post("/repos/{repo_id}/merge/continue")
async def continue_merge(repo_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    repo, message = await _service(session).continue_merge(repo_id)
    return success_response(data=repo.model_dump(mode="json"), msg=message)


@git_router.post("/repos/{repo_id}/merge/abort")
async def abort_merge(repo_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    repo, message = await _service(session).abort_merge(repo_id)
    return success_response(data=repo.model_dump(mode="json"), msg=message)


@git_router.get("/repos/{repo_id}/log")
async def repo_log(
    repo_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    repo: GitRepoView = await _service(session).get_repo(repo_id)
    return success_response(data={"log": [item.model_dump() for item in repo.log[:limit]]})


@git_router.get("/repos/{repo_id}/actions")
async def repo_actions(
    repo_id: uuid.UUID,
    limit: int = Query(60, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    repo: GitRepoView = await _service(session).get_repo(repo_id)
    return success_response(data={"actions": [item.model_dump() for item in repo.actions[:limit]]})
