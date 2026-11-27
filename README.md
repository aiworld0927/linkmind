# LinkMind 知识地图

LinkMind 是一个以**知识地图 + 真实 Git 版本管理**为核心的个人知识库系统：前端用 React 18 + TypeScript + Vite 5 提供知识地图画布与笔记阅读，后端用 FastAPI 提供 REST API，PostgreSQL 17 作为唯一事实主库，知识仓库通过服务端 `git` CLI 执行真实操作。

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 1. 准备环境变量
cp deploy/.env.example deploy/.env
#    至少修改 SECRET_KEY；如需对外提供服务，再按实际域名调整 CORS_ORIGINS

# 2. 构建并启动 postgres、neo4j（可选）、backend、web
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build

# 3. 查看状态与日志
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
docker compose --env-file deploy/.env -f deploy/docker-compose.yml logs -f linkmind-backend
```

启动后默认访问：

| 服务 | 地址 |
|------|------|
| 前端页面（nginx 托管） | http://localhost:8080/ |
| 后端 API 根 | http://localhost:8000/api/（业务接口以 `/api/v1` 为前缀） |
| Swagger 文档 | http://localhost:8000/docs |
| 前端健康检查 | http://localhost:8080/healthz |
| PostgreSQL | localhost:5432（默认 `linkmind/linkmind`，库 `linkmind`） |

停止服务：`docker compose --env-file deploy/.env -f deploy/docker-compose.yml down`。数据保存在 `pg-data` 等命名卷中；仅当确认要清空数据时才使用 `down -v`。

### 方式二：本地开发

```bash
# 1. 只启动 PostgreSQL（Neo4j 可选）
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d postgres

# 2. 后端：安装依赖、迁移、启动（8000）
cd backend
uv sync --extra dev                 # 或 .venv/bin/python -m pip install -e ".[dev]"
.venv/bin/python -m alembic upgrade head
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. 前端：安装依赖并启动（5173）
cd ../frontend
npm install
npm run dev
```

- 开发环境前端默认直连 `http://localhost:8000/api/v1`（见 `frontend/.env.development`），后端 `CORS_ORIGINS` 需包含 `http://localhost:5173`。
- 若将 `VITE_API_BASE_URL` 改为 `/api/v1`，则改走 `vite.config.ts` 的 `/api` 代理，同源无跨域。
- 后端启动时探测 PostgreSQL，连接失败会降级启动，由具体接口返回明确错误。

## 架构概览

```
浏览器
  │
  ├─ 开发：Vite 5173 ──（/api 代理或 VITE_API_BASE_URL 直连）──┐
  │                                                          │
  └─ 生产：nginx 容器 8080 ── 静态资源 + /api 反代 ───────────┤
                                                             ▼
                                                  FastAPI（8000，/api/v1）
                                                   │            │
                                                   ▼            ▼
                                        PostgreSQL 17     服务端 git CLI
                                     （5 张业务表，主数据）   （KNOWLEDGE_ROOT）

Neo4j 5.26（可选）：仅 /api/v1/health/neo4j 连通性检查，不保存业务主数据
```

- **前端**：React 18 + TypeScript + Vite 5，HashRouter 路由，Zustand 状态管理；开发端口 5173，生产由 nginx 托管，宿主机端口 8080。
- **后端**：FastAPI，入口 `backend/app/main.py`，API 前缀 `/api/v1`，统一响应 `{code, msg, data}`。
- **数据库**：PostgreSQL 17（镜像 `pgvector/pgvector:pg17`，当前无向量列），主数据表为 `git_repos`、`git_actions`、`maps`、`nodes`、`props`。
- **版本管理**：仓库登记、状态、提交、拉取、推送、冲突处理与动作审计均通过服务端真实 Git 命令完成，仓库限定在 `KNOWLEDGE_ROOT` 内。

## 技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| 前端框架 | React | 18.3 |
| 类型系统 | TypeScript | 5.6（strict） |
| 构建 | Vite | 5.4 |
| UI 组件 | Ant Design | 5.21 |
| 状态管理 | Zustand | 4.5 |
| 路由 | react-router-dom（HashRouter） | 6.30 |
| Markdown 编辑器 | Vditor | 3.10 |
| 前端测试 | Vitest | 2.1 |
| 后端框架 | FastAPI | 0.115 |
| ASGI 服务 | uvicorn | 0.32 |
| 数据校验/配置 | Pydantic v2 / pydantic-settings | 2.5 |
| ORM/驱动 | SQLAlchemy 2.0 async / asyncpg | ≥2.0.36 / ≥0.30 |
| 迁移 | Alembic | ≥1.14，基线 `0001_baseline` |
| 主数据库 | PostgreSQL | 17 |
| 可选图库 | Neo4j | 5.26（仅健康检查） |
| 版本控制 | Git CLI（服务端 `subprocess`） | 运行环境提供 |
| 部署 | Docker / Docker Compose | — |

## 目录结构

```
linkmind/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 实例、CORS、路由注册、异常处理、lifespan
│   │   ├── api/v1/              # health / git / fs / mindmap（routers、schemas、service）
│   │   ├── core/                # 配置、鉴权、异常、响应、日志、分页
│   │   └── db/                  # 声明式基类、会话、种子数据
│   ├── alembic/                 # 迁移环境与 versions/0001_baseline.py
│   ├── migrations/001_init.sql  # 空库初始化 DDL（与基线迁移等价）
│   ├── tests/                   # pytest 测试
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/                     # pages / features / components / store / types / utils
│   ├── .env.development         # VITE_API_BASE_URL
│   ├── nginx.conf               # SPA 回退、/api 反代、/healthz
│   ├── Dockerfile
│   └── package.json
├── deploy/
│   ├── docker-compose.yml       # neo4j、postgres、linkmind-backend、linkmind-web
│   └── .env.example             # 环境变量模板
├── docs/                        # 项目文档
├── scripts/                     # 启动、接口联调与数据库备份脚本
└── README.md
```

## 环境变量

生产/容器环境以 `deploy/.env.example` 为准，复制为 `deploy/.env` 后通过 `--env-file` 注入。容器内的后端**不读取** `backend/.env`，必须由 Compose 注入。

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `linkmind` / `linkmind` / `linkmind` | PostgreSQL 账号与库名 |
| `POSTGRES_PORT` | `5432` | 宿主机映射端口 |
| `FRONTEND_PORT` | `8080` | 前端 nginx 宿主机端口 |
| `SECRET_KEY` | `change-me-to-a-random-secret-at-least-32-bytes` | JWT 签名密钥，生产必须替换为高熵随机值 |
| `JWT_ALGORITHM` / `JWT_EXPIRE_MINUTES` | `HS256` / `120` | JWT 算法与有效期 |
| `ALLOW_ANONYMOUS` | `true` | 匿名放行开关；当前无登录接口 |
| `CORS_ORIGINS` | `http://localhost:8080,http://127.0.0.1:8080` | 逗号分隔的允许源 |
| `KNOWLEDGE_HOST_PATH` | `../docs/示例知识库` | 宿主机知识仓库目录，挂载到容器 `/app/knowledge` |
| `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` | `LinkMind` / `linkmind@local` | Git 提交身份 |
| `GIT_OPERATION_TIMEOUT` | `60` | Git 命令超时（秒） |
| `GIT_MAX_FILE_BYTES` | `262144` | 单文件内容上限（256KB） |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | `5` / `10` | 连接池大小/溢出上限 |
| `VITE_API_BASE_URL` | 开发 `http://localhost:8000/api/v1`；生产缺省 `/api/v1` | 前端 HTTP 基础地址，见 `frontend/.env.development` |

后端本地开发另可配置（`backend/.env`）：`DATABASE_URL`（默认 `postgresql+asyncpg://linkmind:linkmind@localhost:5432/linkmind`）、`KNOWLEDGE_ROOT`（默认 `/app/knowledge`）、`DB_ECHO`、`NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`。

> 注意：宿主机 shell 中若已存在同名 `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB`、`POSTGRES_PORT`，会覆盖 Compose 默认值。请在 `deploy/.env` 中显式声明，或用 `docker compose config` 核对最终配置。

## 数据库初始化与迁移

当前共 5 张业务表：`git_repos`、`git_actions`、`maps`、`nodes`、`props`。详细字段、索引与约束见 [docs/19_数据库设计.md](docs/19_数据库设计.md)。

### 空库初始化（Docker Compose）

Compose 会将 `backend/migrations/001_init.sql` 挂载到 PostgreSQL 的 `/docker-entrypoint-initdb.d/`，**仅在数据卷为空时执行一次**。已有数据卷不会重复执行。脚本会同时写入 `alembic_version = '0001_baseline'`，因此后续 `alembic upgrade head` 为空操作、不会重复建表。

### Alembic 迁移（推荐，适用于已有库）

```bash
# 本地
cd backend
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m alembic current

# Compose 环境
docker compose --env-file deploy/.env -f deploy/docker-compose.yml \
  exec linkmind-backend python -m alembic upgrade head
```

`linkmind-backend` 容器启动时会先尝试 `alembic upgrade head`（数据库未就绪时忽略并降级启动）。基线版本为 `0001_baseline`。

### 可选种子数据

```bash
cd backend
.venv/bin/python -m app.db.seed
```

仅在 `maps` 为空时插入示例地图、节点与属性。

## 测试与质量检查

截至 2026-11-27：

| 项目 | 结果 | 命令 |
|------|------|------|
| 后端单元/接口测试 | 21/21 通过 | `cd backend && .venv/bin/python -m pytest` |
| 接口联调（31 项业务接口 + 3 项健康检查） | 197/197 断言通过 | `bash scripts/api-test.sh` |
| 前端单元测试 | 23/23 通过 | `cd frontend && npm test` |
| 前端类型检查/构建 | 通过 | `cd frontend && npm run typecheck && npm run build` |

## 鉴权说明

- 当前**没有登录接口**，`ALLOW_ANONYMOUS` 默认 `true`，业务接口默认放行。
- JWT 由 `SECRET_KEY` 签发；如需开启鉴权，生产环境需自行确定 Token 的签发与注入方案，再将 `ALLOW_ANONYMOUS` 设为 `false`。
- `CORS_ORIGINS` 使用显式源列表；不要与 `allow_credentials=true` 搭配 `*`。

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/15_API接口列表.md](docs/15_API接口列表.md) | **API 契约（权威）**：31 项业务接口 + 3 项健康检查 |
| [docs/19_数据库设计.md](docs/19_数据库设计.md) | **数据库设计（权威）**：5 张表、索引、迁移与校验 |
| [docs/18_后端工程结构设计.md](docs/18_后端工程结构设计.md) | 后端分层、目录与实现约束 |
| [docs/09_前端开发联调指南.md](docs/09_前端开发联调指南.md) | 前端联调指南；**§11 为最新操作口径** |
| [docs/前后端联调报告.md](docs/前后端联调报告.md) | 2026-11-27 联调记录、契约差异与修复 |
| [docs/接口测试文档.md](docs/接口测试文档.md) | 接口测试用例与 197/197 执行结果 |
| [docs/02_部署手册.md](docs/02_部署手册.md) | Docker Compose 与本地开发部署 |
| [docs/01_项目概览.md](docs/01_项目概览.md) | 产品定位、实现边界与关键流程 |

## 许可证

MIT License，见 [LICENSE](LICENSE)。
