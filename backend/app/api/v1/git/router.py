"""Git 管理 REST API（A-1～A-12，docs/15 模块 A）。

所有响应统一为 ``{code, msg, data}``；动作成功后返回最新仓库视图，
便于前端一次刷新状态、历史与审计。
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.git.schemas import (
    ConflictResolveIn,
    GitActionOut,
    GitCommitIn,
    GitCommitOut,
    GitRepoCreateIn,
    GitRepoListOut,
    GitRepoOut,
)
from app.api.v1.git.service import GitRegistryService
from app.core.deps import Pagination, get_current_user, get_db
from app.core.pagination import Page
from app.core.response import ApiResponse, RemovedOut, ok

git_router = APIRouter(prefix="/git", tags=["Git"])


def _service(session: AsyncSession) -> GitRegistryService:
    return GitRegistryService(session)


@git_router.get("/repos", response_model=ApiResponse[GitRepoListOut])
async def list_repos(
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-1 列出知识仓库（data 为 {"repos": [...]} 包裹结构，保持前端兼容）。"""
    repos = await _service(session).list_repos()
    return ok(GitRepoListOut(repos=repos))


@git_router.post("/repos", response_model=ApiResponse[GitRepoOut])
async def create_repo(
    payload: GitRepoCreateIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-3 登记（创建）知识仓库。"""
    repo = await _service(session).create_repo(
        name=payload.name,
        fs_path=payload.fs_path,
        init=payload.init,
        remote_url=payload.remote_url,
    )
    return ok(repo, msg="仓库登记成功")


@git_router.get("/repos/{repo_id}", response_model=ApiResponse[GitRepoOut])
async def get_repo(
    repo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-2 查询单个仓库详情。"""
    repo = await _service(session).get_repo(repo_id)
    return ok(repo)


@git_router.delete("/repos/{repo_id}", response_model=ApiResponse[RemovedOut])
async def delete_repo(
    repo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-4 移除知识仓库登记。"""
    await _service(session).delete_repo(repo_id)
    return ok(RemovedOut(), msg="已移除仓库登记")


@git_router.post("/repos/{repo_id}/commit", response_model=ApiResponse[GitRepoOut])
async def commit(
    repo_id: uuid.UUID,
    payload: GitCommitIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-5 提交变更。"""
    repo, message = await _service(session).commit(
        repo_id, message=payload.message, paths=payload.paths, all_changes=payload.all
    )
    return ok(repo, msg=message)


@git_router.post("/repos/{repo_id}/pull", response_model=ApiResponse[GitRepoOut])
async def pull(
    repo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-6 拉取远端。"""
    repo, message = await _service(session).pull(repo_id)
    return ok(repo, msg=message)


@git_router.post("/repos/{repo_id}/push", response_model=ApiResponse[GitRepoOut])
async def push(
    repo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-7 推送远端。"""
    repo, message = await _service(session).push(repo_id)
    return ok(repo, msg=message)


@git_router.post(
    "/repos/{repo_id}/conflicts/resolve", response_model=ApiResponse[GitRepoOut]
)
async def resolve_conflict(
    repo_id: uuid.UUID,
    payload: ConflictResolveIn,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-8 解决合并冲突。"""
    repo, message = await _service(session).resolve_conflict(
        repo_id, path=payload.path, strategy=payload.strategy, content=payload.content
    )
    return ok(repo, msg=message)


@git_router.post(
    "/repos/{repo_id}/merge/continue", response_model=ApiResponse[GitRepoOut]
)
async def continue_merge(
    repo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-9 继续合并。"""
    repo, message = await _service(session).continue_merge(repo_id)
    return ok(repo, msg=message)


@git_router.post("/repos/{repo_id}/merge/abort", response_model=ApiResponse[GitRepoOut])
async def abort_merge(
    repo_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-10 中止合并。"""
    repo, message = await _service(session).abort_merge(repo_id)
    return ok(repo, msg=message)


@git_router.get("/repos/{repo_id}/log", response_model=ApiResponse[Page[GitCommitOut]])
async def repo_log(
    repo_id: uuid.UUID,
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-11 查询提交历史（分页 Page：{total, items}）。"""
    total, items = await _service(session).log_page(
        repo_id, page=pagination.page, page_size=pagination.page_size
    )
    return ok(Page(total=total, items=items))


@git_router.get(
    "/repos/{repo_id}/actions", response_model=ApiResponse[Page[GitActionOut]]
)
async def repo_actions(
    repo_id: uuid.UUID,
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """A-12 查询 Git 动作记录（分页 Page：{total, items}）。"""
    total, items = await _service(session).actions_page(
        repo_id, page=pagination.page, page_size=pagination.page_size
    )
    return ok(Page(total=total, items=items))
