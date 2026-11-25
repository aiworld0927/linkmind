"""Git 模块的请求与响应模型。"""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field, model_validator

GitFileState = Literal[
    "modified",
    "added",
    "deleted",
    "untracked",
    "conflict",
    "renamed",
    "copied",
    "changed",
]

ResolveStrategy = Literal["ours", "theirs", "content"]


class GitFile(BaseModel):
    path: str
    code: str
    state: GitFileState
    staged: bool
    conflict: bool


class GitConflict(BaseModel):
    path: str
    ours: str
    theirs: str
    working: str


class GitCommit(BaseModel):
    hash: str
    short_hash: str
    author: str
    date: str
    subject: str


class GitActionView(BaseModel):
    id: int
    ts: str
    action: str
    message: str
    files: list[str] = Field(default_factory=list)
    ok: bool


class GitCounts(BaseModel):
    total: int = 0
    staged: int = 0
    unstaged: int = 0
    untracked: int = 0
    conflict: int = 0


class GitRepoView(BaseModel):
    id: uuid.UUID
    name: str
    path: str
    fs_path: str
    branch: str
    upstream: str | None = None
    ahead: int = 0
    behind: int = 0
    remote: str | None = None
    merging: bool = False
    files: list[GitFile] = Field(default_factory=list)
    conflicts: list[GitConflict] = Field(default_factory=list)
    counts: GitCounts = Field(default_factory=GitCounts)
    log: list[GitCommit] = Field(default_factory=list)
    actions: list[GitActionView] = Field(default_factory=list)


class GitReposResponse(BaseModel):
    repos: list[GitRepoView]


class GitRepoCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    fs_path: str = Field(default="", max_length=1024)
    init: bool = False
    remote_url: str | None = Field(default=None, max_length=1024)


class GitCommitRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    paths: list[str] | None = None
    all: bool = False

    @model_validator(mode="after")
    def _require_target(self) -> "GitCommitRequest":
        if not self.all and not self.paths:
            raise ValueError("请选择要提交的文件，或勾选提交全部变更")
        return self


class GitResolveRequest(BaseModel):
    path: str = Field(min_length=1)
    strategy: ResolveStrategy
    content: str | None = None

    @model_validator(mode="after")
    def _require_content(self) -> "GitResolveRequest":
        if self.strategy == "content" and self.content is None:
            raise ValueError("使用自定义内容时必须提供 content")
        return self
