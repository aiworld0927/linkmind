# LinkMind 知识地图

LinkMind 是一个以**知识地图 + 真实 Git 版本管理**为核心的知识库系统：前端使用 React + TypeScript 构建可视化画布，后端使用 FastAPI 提供 REST API，PostgreSQL 作为事实主库，Neo4j 作为派生图索引，知识仓库通过服务端 `git` CLI 执行真实操作。

> 当前实现边界：PostgreSQL 已建立 10 张表的基线结构，但知识地图、节点、文档、操作审计与向量表尚未接入业务读写；现有笔记/关系/图谱/聚类路由仍直接使用 Neo4j，两库之间暂无同步管道。详见 [docs/12_架构设计.md](docs/12_架构设计.md) 的「实现边界与已知缺口」。

## ✨ 功能特性

### 知识地图

- 🗂️ **地图管理**：首页卡片新建、编辑、删除知识地图，支持关键词搜索与统计信息
- 🧠 **脑图画布**：基于 AntV X6 的节点画布，支持节点拖拽、依赖连线、缩放与适配
- 📝 **笔记管理**：为节点添加笔记，支持标签、备注、批量选择与删除
- 📖 **笔记阅读**：将笔记转为 Markdown，展示文档大纲、滚动高亮与正文
- 🧩 **三种展示模式**：内嵌、悬浮弹窗、右侧抽屉
- 📊 **分层浏览**：双击下钻、面包屑回退、层级历史
- 📤 **数据导入导出**：导出完整会话；支持宿主注入 `window.__LINKMIND_DATA__` 与 `window.linkmind` API
- ↩️ **操作日志与撤销**：记录节点/笔记/依赖/地图变更，支持撤销与清空

### Git 管理（真实后端）

- 📚 **多知识仓库**：登记 `KNOWLEDGE_ROOT` 内的目录，可选择自动 `git init`
- 🔍 **状态查看**：分支、上游、领先/落后、变更文件、暂存状态、冲突数量
- ✅ **勾选提交 / 全部提交**：可只提交选中文件，冲突未解决时禁止提交
- ⬇️ **拉取**：`fetch --prune` + `merge --no-edit`，冲突时保留合并状态
- ⬆️ **推送**：校验上游，非快进提示先拉取
- ⚔️ **冲突处理**：本地/远端内容预览，保留本地、保留远端或编辑自定义合并结果
- 🔁 **合并生命周期**：完成合并、放弃合并
- 🕘 **历史与审计**：最近提交历史 + Git 动作记录（成功/失败）
- 🛡️ **安全边界**：仓库限定在 `KNOWLEDGE_ROOT`；Git 命令 `shell=False`；路径穿越与命令注入防护；单文件内容上限 256KB

## 🧭 页面路由

前端使用 `HashRouter`，刷新不依赖服务端回退：

| 路由 | 页面 | 功能 | 状态 |
|------|------|------|------|
| `#/` | `HomePage` | 知识地图卡片、搜索、新建/编辑/删除、Git 入口 | 可用 |
| `#/map/:datasetId` | `MindMapPage` | 指定地图的脑图画布与笔记 | 可用 |
| `#/git` | `GitPage` | 真实 Git 仓库管理与审计 | 可用 |
| `#/note` | `NotePage` | Markdown 笔记阅读、大纲与滚动高亮 | 可用 |

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.3.1 |
| 类型系统 | TypeScript（strict） | 5.6.3 |
| 前端构建 | Vite | 5.4.11 |
| UI 组件库 | Ant Design | 5.21.0 |
| 状态管理 | Zustand | 4.5.5 |
| 图编辑引擎 | AntV X6 / x6-react-shape | 2.18.1 / 2.0.8 |
| 路由 | react-router-dom（HashRouter） | 6.30.6 |
| 前端测试 | Vitest | 2.1.9 |
| 后端框架 | FastAPI | 0.115.0 |
| 数据校验/配置 | Pydantic v2 / pydantic-settings | FastAPI 内置 / 2.5.0 |
| ORM / 驱动 | SQLAlchemy 2.x async / asyncpg | ≥2.0.36 / ≥0.30.0 |
| 向量扩展 | pgvector | ≥0.3.6 |
| 主数据库 | PostgreSQL + pgvector | 17 |
| 派生图索引 | Neo4j | 5.26.0 |
| 版本控制 | Git CLI（服务端 `subprocess`） | 运行环境提供 |
| 部署 | Docker / Docker Compose | 20.x+ |

## 📁 项目结构

```
linkmind/
├── backend/
│   ├── src/
│   │   ├── main.py                 # FastAPI 入口与路由注册
│   │   ├── config/settings.py      # 环境变量配置
│   │   ├── database/               # PostgreSQL / Neo4j 连接
│   │   ├── models/                 # Pydantic 模型 + SQLAlchemy ORM
│   │   ├── repositories/           # 数据访问层
│   │   ├── services/               # 业务逻辑与 Git CLI 封装
│   │   ├── routes/                 # REST 路由
│   │   ├── middleware/             # 统一异常处理
│   │   └── utils/                  # 响应与异常类型
│   ├── migrations/001_init.sql     # PostgreSQL 基线 DDL（10 张表）
│   ├── tests/                      # Git 服务与路径安全测试
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                  # 首页 / 脑图 / Git / 笔记阅读
│   │   ├── features/git/           # Git 类型、API、store、组件
│   │   ├── features/notes/         # Markdown 渲染、MarkdownView、测试
│   │   ├── components/             # 画布、节点、笔记、弹窗
│   │   ├── store/                  # zustand 画布 store
│   │   ├── types/                  # 领域类型
│   │   ├── config/                 # 应用常量与示例数据集
│   │   ├── data/source.ts          # CanvasDataSource 抽象
│   │   └── utils/                  # 存储、校验、布局
│   ├── package.json
│   └── vite.config.ts
├── deploy/docker-compose.yml       # postgres + neo4j + backend
├── scripts/                        # 本地启动脚本（dev/prod/test）
├── docs/                           # 项目文档（含设计文档与原型归档）
└── README.md
```

## 🚀 本地启动

### 前置要求

- Python 3.12+
- Node.js 20.x+ / npm 10.x+
- Docker 20.10+（运行 PostgreSQL 与 Neo4j，或在容器中运行后端）
- 系统安装 `git`

### 方式一：Docker Compose 启动后端与依赖

```bash
# 1. 构建前端静态资源（后端会挂载 frontend/dist）
cd frontend && npm install && npm run build && cd ..

# 2. 启动 postgres、neo4j、backend
docker compose -f deploy/docker-compose.yml up -d --build

# 3. 查看状态与日志
docker compose -f deploy/docker-compose.yml ps
docker compose -f deploy/docker-compose.yml logs -f backend
```

默认访问：

| 服务 | 地址 |
|------|------|
| 前端页面（由后端托管） | http://localhost:8000/ |
| 后端 API | http://localhost:8000/api/ |
| API 文档 | http://localhost:8000/docs |
| PostgreSQL | localhost:5432（`linkmind/linkmind`，库 `linkmind`） |
| Neo4j Browser | http://localhost:7474 |
| Neo4j Bolt | bolt://localhost:7687 |

知识仓库默认挂载 `docs/示例知识库` 到容器 `/app/knowledge`，可用 `KNOWLEDGE_HOST_PATH` 覆盖：

```bash
KNOWLEDGE_HOST_PATH=/absolute/path/to/knowledge \
  docker compose -f deploy/docker-compose.yml up -d --build
```

### 方式二：本地开发

```bash
# 1. 只启动数据库依赖
docker compose -f deploy/docker-compose.yml up -d postgres neo4j

# 2. 安装并启动后端（默认连接 localhost:5432 / localhost:7687）
cd backend
python -m pip install -e .
cd src
python main.py
# 等价于 uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. 启动前端开发服务器（/api 代理到 localhost:8000）
cd frontend
npm install
npm run dev
# 打开 http://localhost:5173/
```

后端配置可写入 `backend/src/.env`，常用变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgresql+asyncpg://linkmind:linkmind@localhost:5432/linkmind` | PostgreSQL 连接串 |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | `bolt://localhost:7687` / `neo4j` / `password` | Neo4j 连接 |
| `KNOWLEDGE_ROOT` | `/app/knowledge` | 服务端知识仓库根目录；本地开发建议指向实际目录 |
| `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` | `LinkMind` / `linkmind@local` | Git 提交身份 |
| `GIT_OPERATION_TIMEOUT` | `60` | Git 命令超时（秒） |
| `GIT_MAX_FILE_BYTES` | `262144` | 冲突/合并内容上限（256KB） |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | `5` / `10` | 连接池配置 |

## 🧪 测试与质量检查

```bash
# 后端：Git 服务与路径安全（14 个测试函数）
cd backend && python -m pytest -q

# 后端：语法检查
cd backend && python -m compileall src

# 前端：类型检查、Vitest（2 个文件 / 23 个用例）与生产构建
cd frontend && npm run typecheck && npm run test && npm run build

# 部署：compose 配置解析
docker compose -f deploy/docker-compose.yml config
```

手工冒烟建议：

1. `#/` 新建地图并进入脑图，新增节点与笔记，刷新页面确认 localStorage 持久化。
2. `#/git` 登记 `docs/示例知识库` 下的仓库，修改 Markdown 后勾选提交，确认提交历史与动作记录。
3. 使用本地裸远端验证拉取、推送与冲突解决（保留本地/远端/自定义内容）。
4. 在脑图中点击笔记「查看」进入 `#/note`，确认 Markdown 正文、大纲与滚动高亮。
5. 调用 `/api/v1/health`、`/api/v1/health/postgres`、`/api/v1/health/neo4j` 检查依赖连通性。

## 📖 文档

| 文档 | 路径 |
|------|------|
| 项目概览 | [docs/01_项目概览.md](docs/01_项目概览.md) |
| 部署手册 | [docs/02_部署手册.md](docs/02_部署手册.md) |
| API 接口文档 | [docs/03_API接口文档.md](docs/03_API接口文档.md) |
| 前端功能 PRD | [docs/04_前端功能PRD.md](docs/04_前端功能PRD.md) |
| 运维手册 | [docs/05_运维手册.md](docs/05_运维手册.md) |
| 用户手册 | [docs/06_用户手册.md](docs/06_用户手册.md) |
| 测试指南 | [docs/07_测试指南.md](docs/07_测试指南.md) |
| 安全策略 | [docs/08_安全策略.md](docs/08_安全策略.md) |
| 前端开发联调指南 | [docs/09_前端开发联调指南.md](docs/09_前端开发联调指南.md) |
| 项目技术栈说明 | [docs/10_项目技术栈说明.md](docs/10_项目技术栈说明.md) |
| 产品开发技术指南 | [docs/11_产品开发技术指南.md](docs/11_产品开发技术指南.md) |
| **架构设计** | [docs/12_架构设计.md](docs/12_架构设计.md) |
| **概要设计** | [docs/13_概要设计.md](docs/13_概要设计.md) |
| **详细设计** | [docs/14_详细设计.md](docs/14_详细设计.md) |
| 原型界面归档 | [docs/原型界面/README.md](docs/原型界面/README.md) |

## 📝 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件。
