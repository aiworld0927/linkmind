"""PostgreSQL 主数据模型（SQLAlchemy 2.x）。

表结构与 ``backend/migrations/001_init.sql`` 保持一一对应。
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.pg import Base


def _pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _updated_at() -> Mapped[datetime]:
    return mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class KnowledgeRepository(Base):
    """独立知识仓库登记（与被管理的 Git 目录一一对应）。"""

    __tablename__ = "knowledge_repository"

    id: Mapped[uuid.UUID] = _pk()
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    fs_path: Mapped[str] = mapped_column(String(1024), unique=True, nullable=False)
    git_remote: Mapped[str | None] = mapped_column(String(1024))
    default_branch: Mapped[str] = mapped_column(String(120), server_default=text("'main'"), nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    maps: Mapped[list[KnowledgeMap]] = relationship(back_populates="repository")
    actions: Mapped[list[GitAction]] = relationship(back_populates="repository")


class KnowledgeMap(Base):
    """知识地图（原型首页卡片）。"""

    __tablename__ = "knowledge_map"
    __table_args__ = (
        UniqueConstraint("repository_id", "title", name="uq_knowledge_map_repo_title"),
        Index("ix_knowledge_map_repository", "repository_id"),
    )

    id: Mapped[uuid.UUID] = _pk()
    repository_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_repository.id", ondelete="SET NULL"),
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    source_path: Mapped[str | None] = mapped_column(String(1024))
    git_status: Mapped[str] = mapped_column(String(20), server_default=text("'clean'"), nullable=False)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    repository: Mapped[KnowledgeRepository | None] = relationship(back_populates="maps")
    nodes: Mapped[list["MapNode"]] = relationship(back_populates="map", cascade="all, delete-orphan")


class MapNode(Base):
    """地图节点，支持父子层级。"""

    __tablename__ = "map_node"
    __table_args__ = (
        CheckConstraint(
            "display_mode IN ('inner', 'popover', 'drawer')",
            name="ck_map_node_display_mode",
        ),
        Index("ix_map_node_tree", "map_id", "depth", "sort_order"),
        Index(
            "ux_map_node_root_name",
            "map_id",
            "name",
            unique=True,
            postgresql_where=text("parent_id IS NULL"),
        ),
        Index(
            "ux_map_node_child_name",
            "parent_id",
            "name",
            unique=True,
            postgresql_where=text("parent_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = _pk()
    map_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_map.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("map_node.id", ondelete="CASCADE"),
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    depth: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    is_expanded: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    display_mode: Mapped[str] = mapped_column(String(16), server_default=text("'inner'"), nullable=False)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    map: Mapped[KnowledgeMap] = relationship(back_populates="nodes")
    properties: Mapped[list["NodeProperty"]] = relationship(
        back_populates="node", cascade="all, delete-orphan"
    )


class NodeProperty(Base):
    """节点属性（原型中的笔记）。"""

    __tablename__ = "node_property"
    __table_args__ = (
        Index("ix_node_property_node", "node_id", "sort_order"),
        Index("ix_node_property_tags", "tags", postgresql_using="gin"),
        Index(
            "ix_node_property_search",
            text("to_tsvector('simple', label || ' ' || content)"),
            postgresql_using="gin",
        ),
    )

    id: Mapped[uuid.UUID] = _pk()
    node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("map_node.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    content: Mapped[str] = mapped_column(Text, server_default=text("''"), nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), server_default=text("'{}'::text[]"), nullable=False
    )
    remark: Mapped[str] = mapped_column(String(240), server_default=text("''"), nullable=False)
    document_path: Mapped[str | None] = mapped_column(String(1024))
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    node: Mapped[MapNode] = relationship(back_populates="properties")


class Document(Base):
    """知识仓库中的文档（Git 跟踪文件）。"""

    __tablename__ = "document"
    __table_args__ = (
        UniqueConstraint("repository_id", "relative_path", name="uq_document_repo_path"),
        Index("ix_document_repo_status", "repository_id", "git_status"),
        Index(
            "ix_document_search",
            text("to_tsvector('simple', title || ' ' || content)"),
            postgresql_using="gin",
        ),
    )

    id: Mapped[uuid.UUID] = _pk()
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_repository.id", ondelete="CASCADE"),
        nullable=False,
    )
    relative_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    title: Mapped[str | None] = mapped_column(String(240))
    content: Mapped[str] = mapped_column(Text, server_default=text("''"), nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(64))
    git_status: Mapped[str] = mapped_column(String(20), server_default=text("'clean'"), nullable=False)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


class NodeDocumentLink(Base):
    """节点与文档的关联。"""

    __tablename__ = "node_document_link"

    node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("map_node.id", ondelete="CASCADE"),
        primary_key=True,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = _created_at()


class NodeLink(Base):
    """节点依赖关系。"""

    __tablename__ = "node_link"
    __table_args__ = (
        CheckConstraint("source_node_id <> target_node_id", name="ck_node_link_not_self"),
        Index("ix_node_link_target", "target_node_id"),
    )

    source_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("map_node.id", ondelete="CASCADE"),
        primary_key=True,
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("map_node.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = _created_at()


class OperationAudit(Base):
    """地图/节点操作审计。"""

    __tablename__ = "operation_audit"
    __table_args__ = (
        Index("ix_operation_audit_map_time", "map_id", text("created_at DESC")),
        Index("ix_operation_audit_time_brin", "created_at", postgresql_using="brin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    map_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_map.id", ondelete="SET NULL"),
    )
    actor: Mapped[str] = mapped_column(String(120), server_default=text("'local'"), nullable=False)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(40))
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    summary: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    created_at: Mapped[datetime] = _created_at()


class GitAction(Base):
    """Git 动作审计。"""

    __tablename__ = "git_action"
    __table_args__ = (Index("ix_git_action_repo_time", "repository_id", text("created_at DESC")),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_repository.id", ondelete="CASCADE"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, server_default=text("''"), nullable=False)
    files: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    ok: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()

    repository: Mapped[KnowledgeRepository] = relationship(back_populates="actions")


class DocumentEmbedding(Base):
    """文档向量（pgvector）。"""

    __tablename__ = "document_embedding"
    __table_args__ = (
        Index(
            "ix_document_embedding_vector",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_with={"lists": 100},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document.id", ondelete="CASCADE"),
        primary_key=True,
    )
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)
    updated_at: Mapped[datetime] = _updated_at()
