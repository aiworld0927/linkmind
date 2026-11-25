-- LinkMind PostgreSQL 基线结构
-- 幂等执行：可重复用于空库初始化或本地迁移验证。
-- 主数据：知识仓库 / 地图 / 节点 / 属性 / 文档 / 关系 / 审计 / 向量

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 知识仓库登记（独立于产品工程仓库）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_repository (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name              varchar(120) NOT NULL UNIQUE,
    fs_path           varchar(1024) NOT NULL UNIQUE,
    git_remote        varchar(1024),
    default_branch    varchar(120) NOT NULL DEFAULT 'main',
    last_synced_at    timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 知识地图
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_map (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id     uuid REFERENCES knowledge_repository(id) ON DELETE SET NULL,
    title             varchar(160) NOT NULL,
    description       text,
    source_path       varchar(1024),
    git_status        varchar(20) NOT NULL DEFAULT 'clean',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_knowledge_map_repo_title UNIQUE (repository_id, title)
);
CREATE INDEX IF NOT EXISTS ix_knowledge_map_repository ON knowledge_map (repository_id);

-- ---------------------------------------------------------------------------
-- 地图节点（父子层级）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS map_node (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id            uuid NOT NULL REFERENCES knowledge_map(id) ON DELETE CASCADE,
    parent_id         uuid REFERENCES map_node(id) ON DELETE CASCADE,
    name              varchar(160) NOT NULL,
    path              text NOT NULL,
    depth             integer NOT NULL DEFAULT 0,
    sort_order        integer NOT NULL DEFAULT 0,
    is_expanded       boolean NOT NULL DEFAULT true,
    display_mode      varchar(16) NOT NULL DEFAULT 'inner',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_map_node_display_mode CHECK (display_mode IN ('inner', 'popover', 'drawer'))
);
CREATE INDEX IF NOT EXISTS ix_map_node_tree ON map_node (map_id, depth, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS ux_map_node_root_name
    ON map_node (map_id, name) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_map_node_child_name
    ON map_node (parent_id, name) WHERE parent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 节点属性（笔记）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_property (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id           uuid NOT NULL REFERENCES map_node(id) ON DELETE CASCADE,
    label             varchar(160) NOT NULL,
    content           text NOT NULL DEFAULT '',
    tags              text[] NOT NULL DEFAULT '{}',
    remark            varchar(240) NOT NULL DEFAULT '',
    document_path     varchar(1024),
    sort_order        integer NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_node_property_node ON node_property (node_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_node_property_tags ON node_property USING gin (tags);
CREATE INDEX IF NOT EXISTS ix_node_property_search
    ON node_property USING gin (to_tsvector('simple', label || ' ' || content));

-- ---------------------------------------------------------------------------
-- 文档（知识仓库内 Git 跟踪文件）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id     uuid NOT NULL REFERENCES knowledge_repository(id) ON DELETE CASCADE,
    relative_path     varchar(1024) NOT NULL,
    title             varchar(240),
    content           text NOT NULL DEFAULT '',
    checksum          varchar(64),
    git_status        varchar(20) NOT NULL DEFAULT 'clean',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_document_repo_path UNIQUE (repository_id, relative_path)
);
CREATE INDEX IF NOT EXISTS ix_document_repo_status ON document (repository_id, git_status);
CREATE INDEX IF NOT EXISTS ix_document_search
    ON document USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || content));

-- ---------------------------------------------------------------------------
-- 节点与文档关联
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_document_link (
    node_id           uuid NOT NULL REFERENCES map_node(id) ON DELETE CASCADE,
    document_id       uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (node_id, document_id)
);

-- ---------------------------------------------------------------------------
-- 节点依赖关系
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS node_link (
    source_node_id    uuid NOT NULL REFERENCES map_node(id) ON DELETE CASCADE,
    target_node_id    uuid NOT NULL REFERENCES map_node(id) ON DELETE CASCADE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source_node_id, target_node_id),
    CONSTRAINT ck_node_link_not_self CHECK (source_node_id <> target_node_id)
);
CREATE INDEX IF NOT EXISTS ix_node_link_target ON node_link (target_node_id);

-- ---------------------------------------------------------------------------
-- 操作审计
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operation_audit (
    id                bigserial PRIMARY KEY,
    map_id            uuid REFERENCES knowledge_map(id) ON DELETE SET NULL,
    actor             varchar(120) NOT NULL DEFAULT 'local',
    action            varchar(40) NOT NULL,
    target_type       varchar(40),
    target_id         uuid,
    summary           text,
    payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_operation_audit_map_time
    ON operation_audit (map_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_operation_audit_time_brin
    ON operation_audit USING brin (created_at);

-- ---------------------------------------------------------------------------
-- Git 动作审计
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_action (
    id                bigserial PRIMARY KEY,
    repository_id     uuid NOT NULL REFERENCES knowledge_repository(id) ON DELETE CASCADE,
    action            varchar(40) NOT NULL,
    message           text NOT NULL DEFAULT '',
    files             jsonb NOT NULL DEFAULT '[]'::jsonb,
    ok                boolean NOT NULL DEFAULT true,
    detail            text,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_git_action_repo_time
    ON git_action (repository_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 文档向量
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_embedding (
    document_id       uuid PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE,
    model             varchar(120) NOT NULL,
    embedding         vector(1536) NOT NULL,
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_document_embedding_vector
    ON document_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
