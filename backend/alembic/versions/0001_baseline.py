"""基线迁移：创建 git_repos / git_actions / maps / nodes / props（docs/18 四）。

Revision ID: 0001_baseline
Revises:
Create Date: 2026-11-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TS = sa.DateTime(timezone=True).with_variant(pg.TIMESTAMP(timezone=True), "postgresql")


def upgrade() -> None:
    op.create_table(
        "git_repos",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("fs_path", sa.String(length=1024), nullable=False),
        sa.Column("remote_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", TS, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", TS, server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_git_repos")),
        sa.UniqueConstraint("name", name=op.f("uq_git_repos_name")),
        sa.UniqueConstraint("fs_path", name=op.f("uq_git_repos_fs_path")),
    )
    op.create_table(
        "git_actions",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("repo_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("ts", TS, server_default=sa.func.now(), nullable=False),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("files", pg.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("ok", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(
            ["repo_id"], ["git_repos.id"], name=op.f("fk_git_actions_repo_id_git_repos"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_git_actions")),
    )
    op.create_index(op.f("ix_git_actions_repo_id"), "git_actions", ["repo_id"], unique=False)

    op.create_table(
        "maps",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(length=30), nullable=False),
        sa.Column("desc", sa.String(length=80), server_default=sa.text("''"), nullable=False),
        sa.Column("repo_id", pg.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", TS, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", TS, server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["repo_id"], ["git_repos.id"], name=op.f("fk_maps_repo_id_git_repos"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_maps")),
        sa.UniqueConstraint("title", name=op.f("uq_maps_title")),
    )

    op.create_table(
        "nodes",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("map_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", pg.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", TS, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", TS, server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["map_id"], ["maps.id"], name=op.f("fk_nodes_map_id_maps"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["parent_id"], ["nodes.id"], name=op.f("fk_nodes_parent_id_nodes"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_nodes")),
    )
    op.create_index(op.f("ix_nodes_map"), "nodes", ["map_id"], unique=False)
    op.create_index(
        "ux_nodes_root_name",
        "nodes",
        ["map_id", "name"],
        unique=True,
        postgresql_where=sa.text("parent_id IS NULL"),
    )
    op.create_index(
        "ux_nodes_child_name",
        "nodes",
        ["parent_id", "name"],
        unique=True,
        postgresql_where=sa.text("parent_id IS NOT NULL"),
    )

    op.create_table(
        "props",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("map_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("node_id", pg.UUID(as_uuid=True), nullable=True),
        sa.Column("label", sa.String(length=30), nullable=False),
        sa.Column("note_content", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("note_tags", pg.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("note_remark", sa.String(length=60), server_default=sa.text("''"), nullable=False),
        sa.Column("doc", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("doc_path", sa.String(length=1024), nullable=True),
        sa.Column("created_at", TS, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", TS, server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["map_id"], ["maps.id"], name=op.f("fk_props_map_id_maps"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["node_id"], ["nodes.id"], name=op.f("fk_props_node_id_nodes"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_props")),
    )
    op.create_index(op.f("ix_props_map_node"), "props", ["map_id", "node_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_props_map_node"), table_name="props")
    op.drop_table("props")
    op.drop_index("ux_nodes_child_name", table_name="nodes")
    op.drop_index("ux_nodes_root_name", table_name="nodes")
    op.drop_index(op.f("ix_nodes_map"), table_name="nodes")
    op.drop_table("nodes")
    op.drop_table("maps")
    op.drop_index(op.f("ix_git_actions_repo_id"), table_name="git_actions")
    op.drop_table("git_actions")
    op.drop_table("git_repos")
