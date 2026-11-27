"""Git 模块请求/响应模型（契约见 docs/15 模块 A；P5/P6 类型修正已纳入）。"""

import uuid
from datetime import datetime
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


class GitCommitOut(BaseModel):
    hash: str
    short_hash: str
    author: str
    # P5：ISO8601 datetime（原 str 无格式约定）
    date: datetime
    subject: str


class GitActionOut(BaseModel):
    id: uuid.UUID
    ts: datetime
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


class GitRepoOut(BaseModel):
    id: uuid.UUID
    name: str
    path: str  # 显示用绝对路径
    fs_path: str  # 相对 KNOWLEDGE_ROOT
    branch: str
    upstream: str | None = None
    ahead: int = 0
    behind: int = 0
    remote: str | None = None
    merging: bool = False
    files: list[GitFile] = Field(default_factory=list)
    conflicts: list[GitConflict] = Field(default_factory=list)
    counts: GitCounts = Field(default_factory=GitCounts)
    log: list[GitCommitOut] = Field(default_factory=list)
    actions: list[GitActionOut] = Field(default_factory=list)


class GitRepoListOut(BaseModel):
    """A-1 保持前端兼容的包裹结构：data = {"repos": [...]}。"""

    repos: list[GitRepoOut]


class GitRepoCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    fs_path: str = Field(default="", max_length=1024, description="相对知识库根目录的路径")
    init: bool = False
    remote_url: str | None = Field(default=None, max_length=1024)


class GitCommitIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    paths: list[str] | None = None
    all: bool = False

    @model_validator(mode="after")
    def _require_target(self) -> "GitCommitIn":
        if not self.all and not self.paths:
            raise ValueError("请选择要提交的文件，或勾选提交全部变更")
        return self


class ConflictResolveIn(BaseModel):
    path: str = Field(min_length=1)
    strategy: ResolveStrategy
    content: str | None = None

    @model_validator(mode="after")
    def _require_content(self) -> "ConflictResolveIn":
        if self.strategy == "content" and self.content is None:
            raise ValueError("使用自定义内容时必须提供 content")
        return self
