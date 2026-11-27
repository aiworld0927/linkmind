-- ============================================================================
-- LinkMind PostgreSQL 初始化脚本（与 Alembic 0001_baseline 等价）
--
-- 适用场景：
--   1) Docker Compose 空库首次启动（挂载到 /docker-entrypoint-initdb.d/）；
--   2) 无 Alembic 环境时快速建表；
--   3) 人工核对当前数据库结构。
--
-- 注意：
--   - 生产/持续迭代环境仍以 `alembic upgrade head` 为准；
--   - 本脚本仅创建当前实际使用的 5 张表，不含历史设计中的未实现表；
--   - 全部语句幂等，可重复执行（不会删除已有数据）；
--   - 脚本末尾会写入 alembic_version = '0001_baseline'，使“SQL 初始化”与
--     Alembic 基线状态对齐，避免后端容器启动时 `alembic upgrade head` 重复建表报错。
-- ============================================================================

BEGIN;

-- UUID 主键默认值依赖 PostgreSQL 13+ 内置的 gen_random_uuid()，无需扩展。

-- ----------------------------------------------------------------------------
-- 1. Git 仓库登记（真实知识仓库，目录限定在 KNOWLEDGE_ROOT 内）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_repos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(120) NOT NULL,
    fs_path     varchar(1024) NOT NULL,
    remote_url  varchar(1024),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_git_repos_name UNIQUE (name),
    CONSTRAINT uq_git_repos_fs_path UNIQUE (fs_path)
);

-- ----------------------------------------------------------------------------
-- 2. Git 动作审计（不可变记录；运行时状态不落库）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_actions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id    uuid NOT NULL,
    ts         timestamptz NOT NULL DEFAULT now(),
    action     varchar(40) NOT NULL,
    message    text NOT NULL,
    files      jsonb NOT NULL DEFAULT '[]'::jsonb,
    ok         boolean NOT NULL DEFAULT true,
    CONSTRAINT fk_git_actions_repo_id_git_repos
        FOREIGN KEY (repo_id) REFERENCES git_repos (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_git_actions_repo_id ON git_actions (repo_id);

-- ----------------------------------------------------------------------------
-- 3. 知识地图（title 全局唯一；repo_id 可为空，仓库删除后置空）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maps (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       varchar(30) NOT NULL,
    "desc"      varchar(80) NOT NULL DEFAULT '',
    repo_id     uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_maps_title UNIQUE (title),
    CONSTRAINT fk_maps_repo_id_git_repos
        FOREIGN KEY (repo_id) REFERENCES git_repos (id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 4. 地图节点（自引用父子层级；parent_id IS NULL 表示一级节点）
--    - 'ROOT' 是前端虚拟根，不落库
--    - 同级不重名：根级/子级分别使用部分唯一索引
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nodes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id      uuid NOT NULL,
    parent_id   uuid,
    name        varchar(30) NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_nodes_map_id_maps
        FOREIGN KEY (map_id) REFERENCES maps (id) ON DELETE CASCADE,
    CONSTRAINT fk_nodes_parent_id_nodes
        FOREIGN KEY (parent_id) REFERENCES nodes (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_nodes_map ON nodes (map_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_nodes_root_name
    ON nodes (map_id, name) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_nodes_child_name
    ON nodes (parent_id, name) WHERE parent_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. 节点属性 / 笔记（node_id IS NULL 表示地图级属性，对应前端 ROOT）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS props (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id        uuid NOT NULL,
    node_id       uuid,
    label         varchar(30) NOT NULL,
    note_content  text NOT NULL DEFAULT '',
    note_tags     jsonb NOT NULL DEFAULT '[]'::jsonb,
    note_remark   varchar(60) NOT NULL DEFAULT '',
    doc           boolean NOT NULL DEFAULT false,
    doc_path      varchar(1024),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_props_map_id_maps
        FOREIGN KEY (map_id) REFERENCES maps (id) ON DELETE CASCADE,
    CONSTRAINT fk_props_node_id_nodes
        FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_props_map_node ON props (map_id, node_id);

-- ----------------------------------------------------------------------------
-- 6. Alembic 版本标记（版本表结构与 Alembic 默认一致）
--    写入基线版本后，`alembic upgrade head` 为空操作，避免重复建表；
--    `alembic check` 也可基于 0001_baseline 正常比对模型漂移。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num varchar(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('0001_baseline')
ON CONFLICT (version_num) DO NOTHING;

COMMIT;

-- ----------------------------------------------------------------------------
-- 可选：写入一张示例地图（与 backend/app/db/seed.py 等价）
-- 生产环境请勿执行，或执行前确认 maps 为空。
-- ----------------------------------------------------------------------------
-- INSERT INTO maps (title, "desc") VALUES ('示例知识地图', '种子数据，可删除');
