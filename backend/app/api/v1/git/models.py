"""Git 模块 ORM：git_repos / git_actions（docs/18 四）。

git 运行时状态（branch/ahead/behind/merging/files/conflicts）实时计算，不落库。
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk


class GitRepoModel(TimestampMixin, Base):
    __tablename__ = "git_repos"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    fs_path: Mapped[str] = mapped_column(String(1024), unique=True, nullable=False)
    remote_url: Mapped[str | None] = mapped_column(String(1024))

    actions: Mapped[list["GitActionModel"]] = relationship(
        back_populates="repo", cascade="all, delete-orphan"
    )


class GitActionModel(Base):
    """Git 动作审计（不可变记录，无 updated_at）。"""

    __tablename__ = "git_actions"

    id: Mapped[uuid.UUID] = uuid_pk()
    # index=True：与基线迁移 ix_git_actions_repo_id 保持一致，避免 alembic check 误判索引漂移
    repo_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("git_repos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    files: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), default=list, nullable=False
    )
    ok: Mapped[bool] = mapped_column(
        Boolean, server_default=text("true"), default=True, nullable=False
    )

    repo: Mapped[GitRepoModel] = relationship(back_populates="actions")
