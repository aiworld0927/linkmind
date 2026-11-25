# LinkMind 原型归档、React 重构、PostgreSQL 主库与真实 Git 管理 规格说明

> 状态：待评审（Spec Mode，已按反馈修订：**本轮实现真实 Git 能力**）
> 适用仓库：`/coding/linkmind`
> 语言：中文

## 1. 目标与范围

落实用户本轮要求：

1. 将三张前端原型（`frontend/public/demo-mindmap.html`、`demo-git.html`、`demo-note.html`）完整归档到 `docs/原型界面/`。
2. 规范化模块化架构，输出架构设计、概要设计、详细设计文档，并与代码一致。
3. 前端严格采用 React + TypeScript，组件符合 React 最佳实践。
4. 数据库以 PostgreSQL 为主库，完成表结构、索引、数据访问层规范。
5. 后端采用 Python + FastAPI，保持 RESTful、自动接口文档、参数校验与统一异常处理。
6. **Git 能力本轮落地为真实后端实现**：按原型实现多知识仓库登记、状态查看、勾选提交、拉取、推送、冲突解决、合并继续/放弃、历史与动作审计，并补齐设计与自动化测试。
7. 同步更新 `deploy/docker-compose.yml`、`backend/Dockerfile` 等部署文件。

### 1.1 已确认决策

- **PostgreSQL 为主数据存储**；**Neo4j 降级为派生图索引/查询加速**，现有 Neo4j 接口行为保持不变。
- 三张原型全部以 React 页面落地：首页、脑图、笔记、Git 管理。
- **Git 使用服务器真实仓库 + `git` CLI 执行**，不再使用 localStorage 假数据；被管理仓库是独立知识仓库，与产品工程仓库无关。
- 前端路由使用 **HashRouter**，避免静态托管深链接 404。
- 知识仓库根目录由 `KNOWLEDGE_ROOT` 限定，所有 Git 仓库必须位于该目录内。

### 1.2 非目标

- 不提供 Git 凭证管理 UI（SSH key / HTTPS token 由部署环境预先配置）。
- 不重写现有 Neo4j 业务路由（note/link/graph/expand/search/cluster/fs）。
- 不引入用户认证与权限体系。
- 不实现 Git 分支切换、rebase、cherry-pick、子模块等原型外能力。
- 不在本轮执行 Alembic 迁移编排（提供基线 SQL 与后续规范）。

## 2. 现状与差距

| 领域 | 现状 | 本轮改动 |
|------|------|----------|
| 原型归档 | 三张 HTML 仅在 `frontend/public/` | 归档到 `docs/原型界面/` 并加导航/说明 |
| 前端路由 | 单页画布，无路由 | 增加首页/脑图/笔记/Git 四页 |
| 首页 | 仅数据集切换标签 | 地图卡片新建/编辑/删除/进入 |
| Git | 仅原型 localStorage 假数据 | 后端真实 Git API + React 页面 |
| 笔记阅读 | 仅原型 HTML | React Markdown 阅读页 + 大纲 |
| 数据库 | 仅 Neo4j；compose 中 postgres 为 nacos 遗留且挂载文件缺失 | PostgreSQL 主库、表结构、索引、DAL |
| 后端 | FastAPI + Neo4j 分层清晰 | 增加 PG 连接、模型、Git 模块、健康检查 |
| 测试 | 无自动化测试 | 后端 Git pytest + 前端 Vitest |
| 文档 | 01–11 已有 | 新增 12/13/14 设计文档并更新 README/10 |

## 3. 总体方案

### 3.1 部署拓扑

```
浏览器 (React HashRouter)
   │  /api/v1/*
   ▼
FastAPI (routes → services → repositories)
   ├── PostgreSQL 17 + pgvector   ← 主数据（仓库登记/地图/节点/属性/文档/Git 审计）
   ├── Neo4j 5.26                 ← 派生图索引（关系查询、聚类、全文）
   └── git CLI（asyncio 线程池）  ← 知识仓库真实操作（KNOWLEDGE_ROOT 内）
```

### 3.2 前端模块划分

```
frontend/src/
├── App.tsx                       # 路由壳层 + ConfigProvider + bootstrap + window.linkmind
├── main.tsx                      # 入口与样式
├── pages/
│   ├── HomePage.tsx              # 首页地图卡片
│   ├── MindMapPage.tsx           # 脑图画布（复用现有组件）
│   ├── GitPage.tsx               # Git 管理（真实 API）
│   └── NotePage.tsx              # Markdown 阅读
├── features/
│   ├── git/
│   │   ├── types.ts              # 与后端响应对应的类型
│   │   ├── labels.ts             # 状态码 → 中文标签/样式
│   │   ├── labels.test.ts        # Vitest
│   │   ├── api.ts                # /api/v1/git 客户端（统一解包 code/msg/data）
│   │   ├── store.ts              # zustand：仓库列表/当前仓库/加载/错误/动作
│   │   └── components/
│   │       ├── RepoDialog.tsx        # 登记仓库（目录浏览 + 可选 init）
│   │       ├── FileChangeTable.tsx   # 变更文件与勾选
│   │       ├── ConflictPanel.tsx     # 冲突三选一/编辑/完成合并
│   │       └── HistoryPanels.tsx     # 提交历史 + 动作记录
│   └── notes/
│       ├── markdown.ts           # 安全 Markdown → HTML + 大纲
│       ├── markdown.test.ts      # Vitest
│       └── MarkdownView.tsx
├── components/
│   ├── DatasetModal.tsx          # 首页地图表单
│   └── GitStatusBadge.tsx        # 状态徽标
├── store/index.ts                # 增加数据集 CRUD
├── types/index.ts                # 保持现有领域模型
└── styles/pages.css              # 首页/Git/笔记样式
```

### 3.3 后端模块划分

```
backend/
├── src/
│   ├── config/settings.py        # DATABASE_URL、GIT_* 配置
│   ├── database/pg.py            # SQLAlchemy 2.x async engine/session
│   ├── models/
│   │   ├── git.py                # Git Pydantic 请求/响应模型
│   │   └── db_models.py          # SQLAlchemy ORM 模型
│   ├── repositories/
│   │   ├── pg_base.py            # AsyncSession 仓储基类
│   │   └── git_repository.py     # knowledge_repository / git_action 读写
│   ├── services/
│   │   ├── git_service.py        # 纯 Git CLI 操作（同步、可单测）
│   │   └── git_registry_service.py # 注册表 + 视图组装 + 审计
│   ├── routes/
│   │   ├── git.py                # Git REST API
│   │   └── health.py             # 增加 /health/postgres
│   ├── utils/errors.py           # GitError / BusinessError + 统一处理
│   └── main.py                   # 注册 git 路由、PG lifespan
├── migrations/001_init.sql       # 基线 DDL（含 git_action）
├── tests/
│   ├── conftest.py               # 临时真实 git 仓库/裸远端夹具
│   ├── test_git_service.py       # 提交/状态/拉取/冲突/推送
│   └── test_git_registry.py      # 路径安全/名称校验（纯函数）
└── pytest.ini
```

## 4. Git 能力详细设计（本轮核心）

### 4.1 REST API（统一 `{code,msg,data}`，前缀 `/api/v1`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/git/repos` | 仓库列表（含状态、文件、冲突内容、最近提交、动作记录） |
| POST | `/git/repos` | 登记仓库：`{name, fs_path, init?, remote_url?}` |
| GET | `/git/repos/{id}` | 刷新单个仓库视图 |
| DELETE | `/git/repos/{id}` | 仅移除登记，不删除文件 |
| POST | `/git/repos/{id}/commit` | `{message, paths?, all?}` |
| POST | `/git/repos/{id}/pull` | fetch + merge 上游 |
| POST | `/git/repos/{id}/push` | 推送上游 |
| POST | `/git/repos/{id}/conflicts/resolve` | `{path, strategy: ours\|theirs\|content, content?}` |
| POST | `/git/repos/{id}/merge/continue` | 完成合并 |
| POST | `/git/repos/{id}/merge/abort` | 放弃合并 |
| GET | `/git/repos/{id}/log?limit=20` | 提交历史 |
| GET | `/git/repos/{id}/actions?limit=60` | Git 动作审计 |
| GET | `/health/postgres` | 主库连通性 |

仓库视图 `GitRepoView`：

```
id, name, path(展示), fs_path, branch, upstream, ahead, behind, remote,
merging, files: GitFileView[], conflicts: GitConflictView[],
counts: {total, staged, unstaged, untracked, conflict},
log: GitCommitView[], actions: GitActionView[]
```

`GitFileView`: `path, code, state(modified|added|deleted|untracked|conflict|renamed|copied|changed), staged, conflict`
`GitConflictView`: `path, ours, theirs, working`（单文件内容上限 256KB）
`GitCommitView`: `hash, short_hash, author, date, subject`
`GitActionView`: `id, ts, action, message, files[], ok`

### 4.2 Git 服务（`services/git_service.py`）

- 同步实现，全部通过 `subprocess.run([...], shell=False, cwd=repo, timeout=60, env=...)` 调用 `git`。
- 环境变量：`GIT_TERMINAL_PROMPT=0`、`GIT_CONFIG_NOSYSTEM=1`（测试）、`HOME`（测试用临时目录）、提交身份通过 `-c user.name` / `-c user.email` 注入。
- 核心方法：
  - `is_repo()` → `git rev-parse --is-inside-work-tree`
  - `init(default_branch, initial_commit)` → `git init -b`；有文件且首次初始化时提交初始版本
  - `status()` → 解析 `git status --porcelain=v1 -z --branch`，得到分支/上游/ahead/behind/合并中/文件状态；冲突码 `UU/AA/DD/AU/UA/DU/UD`
  - `conflicts()` → `git show :2:path`、`:3:path`、工作区内容（按上限截断）
  - `log(limit)` → `git log -n ... --pretty=format:%h%x09%an%x09%ad%x09%s`
  - `commit(message, paths, all)` → `git add -- <paths>` 或 `git add -A`，再 `git commit -m`
  - `pull()` → `git rev-parse @{u}` 校验上游 → `git fetch --prune` → `git merge --no-edit @{u}`
  - `push()` → 校验上游，`git push`
  - `resolve_conflict(path, strategy, content)` → `checkout --ours/--theirs` 或写入内容 → `git add -- path`
  - `continue_merge()` → 有冲突则拒绝；`git commit --no-edit`（无 MERGE_HEAD 时提示无可继续合并）
  - `abort_merge()` → `git merge --abort`
- 错误统一抛 `GitError(status_code, message)`；路由层注册异常处理器转换为 `{code,msg}`。

### 4.3 安全与并发

- 仓库路径必须解析到 `KNOWLEDGE_ROOT` 内（拒绝符号链接逃逸、`..`、绝对路径越界）。
- 所有 Git 文件路径必须是仓库内相对路径，且经过 `resolve()` 边界校验；不接受以 `-` 开头的路径参数。
- 单文件读写上限 256KB；输出截断并标注。
- 每个仓库一把 `threading.Lock`，Git 操作串行；锁表使用全局锁保护。
- 禁止在 `KNOWLEDGE_ROOT` 外执行任何 Git 命令；`DELETE` 仅删登记。

### 4.4 注册表与审计（PostgreSQL）

- 复用 `knowledge_repository` 表登记仓库（`name` 唯一、`fs_path` 唯一）。
- 新增 `git_action` 表记录每次动作（成功/失败、消息、文件列表）。
- 注册时校验：名称非空且 ≤120 字；`fs_path` 存在且目录；非 Git 仓库时需 `init=true`。
- 同一仓库重复登记返回 409。

## 5. 数据库设计（PostgreSQL）

扩展 `pgvector`；`timestamptz`；`uuid` 主键；基线 DDL 幂等。

| 表 | 关键字段 | 约束/索引 |
|----|----------|-----------|
| `knowledge_repository` | name, fs_path, git_remote, default_branch, last_synced_at | `UNIQUE(name)`、`UNIQUE(fs_path)` |
| `knowledge_map` | repository_id FK, title, description, source_path, git_status | `UNIQUE(repository_id,title)`、`INDEX(repository_id)` |
| `map_node` | map_id FK, parent_id FK, name, path, depth, sort_order, is_expanded, display_mode | 根/子分区唯一索引；`INDEX(map_id,depth,sort_order)`；`CHECK(display_mode IN ('inner','popover','drawer'))` |
| `node_property` | node_id FK, label, content, tags text[], remark, document_path, sort_order | `INDEX(node_id,sort_order)`、`GIN(tags)`、全文 GIN |
| `document` | repository_id FK, relative_path, title, content, checksum, git_status | `UNIQUE(repository_id,relative_path)`、`INDEX(repository_id,git_status)`、全文 GIN |
| `node_document_link` | node_id, document_id | 复合主键，双向级联 |
| `node_link` | source_node_id, target_node_id | 复合主键、`CHECK(source<>target)`、`INDEX(target)` |
| `operation_audit` | map_id, actor, action, target_type, target_id, summary, payload jsonb | `INDEX(map_id,created_at DESC)`、`BRIN(created_at)` |
| `git_action` | repository_id FK, action, message, files jsonb, ok, detail | `INDEX(repository_id,created_at DESC)` |
| `document_embedding` | document_id PK/FK, model, embedding vector(1536) | `ivfflat(vector_cosine_ops) WITH (lists=100)` |

数据访问层规范：

- SQLAlchemy 2.x Declarative（`Mapped`/`mapped_column`），`asyncpg`，`async_sessionmaker(expire_on_commit=False)`。
- 路由不写 SQL；Repository 只接收 `AsyncSession`；服务层持有事务边界。
- 异常统一走 `exception_handler` 转为 `{code,msg,data}`。

## 6. 前端详细设计

### 6.1 路由（HashRouter）

| 路径 | 页面 | 说明 |
|------|------|------|
| `#/` | HomePage | 地图卡片列表 + Git 入口 |
| `#/map/:datasetId` | MindMapPage | 进入指定数据集画布 |
| `#/git` | GitPage | 真实 Git 管理 |
| `#/note?title=&node=&md=` | NotePage | Markdown 阅读 |

### 6.2 状态与数据流

- 现有 `useStore` 继续承载地图/节点/笔记，默认 `localStorage`，保持 `CanvasDataSource` 抽象。
- 新增 `createDataset`、`updateDataset`、`deleteDataset`（校验、切换、持久化、操作日志）。
- `App.tsx` 统一 `bootstrap()` 与 `window.linkmind` 注入；`MindMapPage` 按路由同步数据集，无效则回首页。
- Git 状态独立为 `features/git/store.ts`，不写入画布 store；页面挂载时拉取 `GET /git/repos`。

### 6.3 首页

- 卡片：标题、描述、节点数、笔记数、主题色；悬停「编辑/删除」；末尾「新建知识地图」。
- `DatasetModal`：标题必填 ≤60、同名校验；创建后进入新地图。
- 删除确认；顶部「Git 管理」。

### 6.4 脑图页

- 复用 `Toolbar/Breadcrumbs/GraphCanvas/NodeDrawer/OperationLogDrawer/NodeModal`。
- 品牌区返回首页；新增「Git 管理」按钮。

### 6.5 笔记页

- `markdown.ts` 先转义再渲染 `#/##/###`、列表、引用、代码块、行内语法、分隔线，返回 `{html, headings}`。
- 大纲平滑滚动 + 滚动高亮；空态回首页。
- `NoteList` 增加「查看」，跳转 `/note`。

### 6.6 Git 管理页

- 数据全部来自后端，`api.ts` 统一解包与错误提示。
- 顶部：仓库选择、刷新、拉取、推送、添加仓库、移除仓库；状态摘要（分支/上游/领先/落后/变更/冲突/合并中）。
- 变更表：禁止勾选冲突文件；提交选中/全部；提交信息必填。
- 冲突区：本地/远端只读预览 + 可编辑合并结果 + 保留本地/保留远端/保存并标记解决；全部解决后可完成合并或放弃。
- 历史与动作双栏；所有操作成功后用后端返回的最新视图刷新。
- 无仓库时显示引导；后端不可用时显示错误与重试，不回退假数据。

## 7. 后端基础设计

### 7.1 配置

```python
DATABASE_URL: str = "postgresql+asyncpg://linkmind:linkmind@localhost:5432/linkmind"
DB_POOL_SIZE: int = 5
DB_MAX_OVERFLOW: int = 10
DB_ECHO: bool = False
GIT_AUTHOR_NAME: str = "LinkMind"
GIT_AUTHOR_EMAIL: str = "linkmind@local"
GIT_OPERATION_TIMEOUT: int = 60
```

### 7.2 PostgreSQL 连接（`database/pg.py`）

- 惰性 `create_async_engine`；`get_session()` 依赖注入；`init_pg()`/`close_pg()` 供 lifespan。
- `test_pg_connection()` 执行 `SELECT 1`，返回 `{connected, message}`。
- 数据库不可用时仅告警，不阻塞启动。

### 7.3 依赖

`pyproject.toml` 增加 `sqlalchemy>=2.0.36`、`asyncpg>=0.30.0`；开发依赖 `pytest>=8.3`。

## 8. 部署设计

### 8.1 docker-compose.yml

- 移除不存在的 `./nacos/sql/*` 挂载。
- `postgres`：`pgvector/pgvector:pg17`，`linkmind/linkmind/linkmind`，健康检查 `pg_isready -U linkmind -d linkmind`，挂载 `../backend/migrations/001_init.sql:/docker-entrypoint-initdb.d/001_init.sql:ro`。
- `backend`：增加 `DATABASE_URL`、`GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`；`depends_on` 增加 postgres 健康；知识目录改为可写：`${KNOWLEDGE_HOST_PATH:-../docs/示例知识库}:/app/knowledge`。
- Neo4j 保留并注明「派生图索引」。

### 8.2 backend/Dockerfile

- `apt-get install git openssh-client ca-certificates`。
- 先复制 `pyproject.toml` 与 `src` 再 `pip install --no-cache-dir .`，随后复制其余文件。
- `PYTHONDONTWRITEBYTECODE=1`、`PYTHONUNBUFFERED=1`，暴露 8000。

## 9. 文档与归档

- `docs/原型界面/`：三份原样副本 + `README.md` + `index.html` 导航。
- 新增 `docs/12_架构设计.md`、`docs/13_概要设计.md`、`docs/14_详细设计.md`（含 Git 模块 API、状态机、错误码、测试策略）。
- 更新 `README.md`：PostgreSQL 主库、Neo4j 派生、Git 能力、路由、文档索引。
- 更新 `docs/10_项目技术栈说明.md`：数据库定位与新依赖。

## 10. 测试与验证

### 10.1 后端自动化测试（pytest）

- `tests/conftest.py`：临时目录创建本地仓库 + 裸远端，隔离 `HOME`/Git 配置。
- 用例：
  1. `init` 生成仓库与初始提交。
  2. 修改/新增文件后 `status` 状态与计数正确。
  3. 按路径提交后 `log` 出现记录，未选文件保留。
  4. 两个克隆产生冲突 → `pull` 返回冲突 → 保留本地/远端或自定义内容 → `continue_merge` 成功。
  5. `push` 到裸远端后远端提交数增加。
  6. `abort_merge` 恢复正常状态。
  7. 路径越界校验拒绝（注册表纯函数）。
- 运行：`cd backend && python -m pytest -q`。

### 10.2 前端自动化测试（Vitest）

- `labels.test.ts`：状态码到中文标签/样式映射。
- `markdown.test.ts`：标题大纲、列表、代码块、HTML 转义。
- 运行：`cd frontend && npm run test`。

### 10.3 构建与手工验证

- `npm run typecheck`、`npm run build`。
- `python -m compileall backend/src`。
- `docker compose -f deploy/docker-compose.yml config`。
- 浏览器冒烟：`#/`、`#/map/dataset-ml`、`#/git`、`#/note?...`；在 Git 页登记示例知识库并完成一次提交。

## 11. 验收标准

- [ ] 原型归档可独立打开并导航。
- [ ] 四页路由可用；首页 CRUD 正常。
- [ ] Git 页对接真实后端，可登记仓库、勾选提交、拉取、推送、解决冲突、继续/放弃合并、查看历史与动作记录。
- [ ] 后端 Git 操作只作用于 `KNOWLEDGE_ROOT` 内仓库，异常返回统一结构。
- [ ] PostgreSQL 迁移 SQL 可执行，表/索引与 ORM 一致；`/health/postgres` 可用。
- [ ] 后端 pytest 与前端 Vitest 全部通过，typecheck/build 通过。
- [ ] compose 与 Dockerfile 可构建/解析，知识目录可写。
- [ ] 三份设计文档与 README/技术栈文档更新并与代码一致。

## 12. 风险与假设

- 运行环境已安装 `git`；容器镜像会显式安装。
- 推送依赖远端可达与凭证预配置；演示可使用本地裸远端。
- 现有前端节点模型为「节点 + 属性笔记」并通过下钻分层，原型内嵌递归树以现有下钻交互等价承载。
- 新增后端依赖与系统包需重建镜像后生效。
- pgvector 扩展在 `pgvector/pgvector:pg17` 中可用。
