"""知识地图聚合域 ORM：maps / nodes / props（docs/18 四）。

- 'ROOT' 为前端虚拟根节点，不落库：地图级属性 node_id 为 null；
- 删除地图/节点依靠 FK ondelete CASCADE 级联清理。
"""

import uuid

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk


class MapModel(TimestampMixin, Base):
    __tablename__ = "maps"

    id: Mapped[uuid.UUID] = uuid_pk()
    title: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    desc: Mapped[str] = mapped_column(String(80), server_default=text("''"), default="", nullable=False)
    repo_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("git_repos.id", ondelete="SET NULL"),
    )

    nodes: Mapped[list["NodeModel"]] = relationship(
        back_populates="map", cascade="all, delete-orphan"
    )
    props: Mapped[list["PropModel"]] = relationship(
        back_populates="map", cascade="all, delete-orphan"
    )


class NodeModel(TimestampMixin, Base):
    __tablename__ = "nodes"
    __table_args__ = (
        # 同级不重名：一级（parent_id IS NULL）与子级分别建部分唯一索引
        Index(
            "ux_nodes_root_name",
            "map_id",
            "name",
            unique=True,
            postgresql_where=text("parent_id IS NULL"),
        ),
        Index(
            "ux_nodes_child_name",
            "parent_id",
            "name",
            unique=True,
            postgresql_where=text("parent_id IS NOT NULL"),
        ),
        Index("ix_nodes_map", "map_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    map_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("maps.id", ondelete="CASCADE"),
        nullable=False,
    )
    # null = 一级节点
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
    )
    name: Mapped[str] = mapped_column(String(30), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"), default=0, nullable=False)

    map: Mapped[MapModel] = relationship(back_populates="nodes")


class PropModel(TimestampMixin, Base):
    """属性/笔记：prop_id 为主键（Q12 决策），node_id null = 地图级（前端 ROOT）。"""

    __tablename__ = "props"
    __table_args__ = (Index("ix_props_map_node", "map_id", "node_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    map_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("maps.id", ondelete="CASCADE"),
        nullable=False,
    )
    node_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
    )
    label: Mapped[str] = mapped_column(String(30), nullable=False)
    note_content: Mapped[str] = mapped_column(Text, server_default=text("''"), default="", nullable=False)
    note_tags: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), default=list, nullable=False
    )
    note_remark: Mapped[str] = mapped_column(
        String(60), server_default=text("''"), default="", nullable=False
    )
    doc: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), default=False, nullable=False
    )
    doc_path: Mapped[str | None] = mapped_column(String(1024))

    map: Mapped[MapModel] = relationship(back_populates="props")
