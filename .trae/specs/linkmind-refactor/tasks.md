# 任务清单

> 依据 `spec.md` 执行；每项完成后更新状态。

## T1 原型归档

- [x] 创建 `docs/原型界面/`。
- [x] 复制 `frontend/public/demo-mindmap.html`、`demo-git.html`、`demo-note.html`（原样）。
- [x] 新增 `docs/原型界面/README.md`：来源、功能、打开方式、与 React 页面映射。
- [x] 新增 `docs/原型界面/index.html`：三张原型入口导航。
- 验证：副本与源文件 `diff` 一致；导航链接可用。

## T2 前端路由与页面骨架

- [x] `cd frontend && npm install react-router-dom@^6.26.2`。
- [x] 重写 `src/App.tsx`：`ConfigProvider` + `HashRouter` + `Routes`，保留 `bootstrap`、`window.linkmind`、全局错误提示。
- [x] 新增 `src/pages/MindMapPage.tsx`：迁移原画布组合；按 `datasetId` 同步 `switchDataset`，无效回首页。
- [x] 修改 `src/components/Toolbar.tsx`：品牌返回首页、新增「Git 管理」。
- 验证：`npm run typecheck`。

## T3 首页与数据集 CRUD

- [x] `src/store/index.ts` 增加 `createDataset`、`updateDataset`、`deleteDataset`（持久化 + 操作日志）。
- [x] 新增 `src/components/DatasetModal.tsx`（新建/编辑共用，校验标题必填、≤60、重名）。
- [x] 新增 `src/pages/HomePage.tsx`（卡片、统计、进入、编辑、删除、新建、Git 入口）。
- [x] 新增 `src/styles/pages.css` 并在 `main.tsx` 引入。
- 验证：刷新后数据保持；路由数据集正确。

## T4 后端 PostgreSQL 基础

- [x] `settings.py` 增加 `DATABASE_URL`、连接池、`GIT_AUTHOR_*`、`GIT_OPERATION_TIMEOUT`。
- [x] 新增 `database/pg.py`（异步引擎/会话/初始化/关闭/连通性）。
- [x] 新增 `models/db_models.py`（与 DDL 一致）。
- [x] 新增 `repositories/pg_base.py`。
- [x] 新增 `migrations/001_init.sql`（扩展、表、约束、索引、全文/向量索引）。
- [x] 修改 `routes/health.py` 增加 `/health/postgres`。
- [x] 修改 `main.py` lifespan 初始化/释放 PG。
- [x] `pyproject.toml` 增加 `sqlalchemy`、`asyncpg`、`pytest`。
- 验证：`python -m compileall backend/src`。

## T5 后端真实 Git 能力

- [x] 新增 `src/utils/errors.py`、`src/models/git.py`。
- [x] 新增 `src/services/git_service.py`：status/conflicts/log/commit/pull/push/resolve/continue/abort/init，全部 `shell=False`。
- [x] 新增 `src/repositories/git_repository.py`：仓库登记与 `git_action` 审计。
- [x] 新增 `src/services/git_registry_service.py`：路径安全、视图组装、动作编排、每仓库锁。
- [x] 新增 `src/routes/git.py`：12 个 REST 端点。
- [x] `main.py` 注册路由与 `GitError` 异常处理。
- [x] `migrations/001_init.sql` 增加 `git_action` 表与索引。
- 验证：接口经 `/docs` 可见；错误返回 `{code,msg}`。

## T6 后端 Git 自动化测试

- [x] 新增 `backend/tests/conftest.py`（临时仓库 + 裸远端 + Git 环境隔离）。
- [x] 新增 `tests/test_git_service.py`：初始化/状态/提交/冲突解决/继续/放弃/推送。
- [x] 新增 `tests/test_git_registry.py`：路径越界与名称校验。
- [x] 新增 `backend/pytest.ini`（`pythonpath=src`）。
- 验证：`cd backend && python -m pytest -q` 全绿（17 passed）。

## T7 前端 Git 管理页（真实 API）

- [x] 新增 `features/git/types.ts`、`labels.ts`、`api.ts`、`store.ts`。
- [x] 新增 `RepoDialog.tsx`、`FileChangeTable.tsx`、`ConflictPanel.tsx`、`HistoryPanels.tsx`。
- [x] 新增 `pages/GitPage.tsx`：加载/错误/空态、仓库操作、提交、拉取、推送、冲突、合并、历史与动作。
- [x] 不读取 `lm-demo-git-v1`，不回退假数据。
- 验证：登记示例知识库后可完成提交/历史刷新；类型检查通过。

## T8 笔记阅读页

- [x] 新增 `features/notes/markdown.ts`、`MarkdownView.tsx`、`pages/NotePage.tsx`。
- [x] 修改 `NoteList.tsx` 增加「查看」跳转。
- 验证：标题大纲、代码块、列表、HTML 转义正确。

## T9 前端自动化测试

- [x] 安装并配置 Vitest（`vitest.config.ts`、`package.json` scripts）。
- [x] 新增 `features/git/labels.test.ts`、`features/notes/markdown.test.ts`。
- 验证：`npm run test` 全绿（23 passed）。

## T10 部署文件

- [x] 修改 `deploy/docker-compose.yml`：postgres 主库化、迁移挂载、backend `DATABASE_URL`/Git 环境、知识目录可写、移除失效 nacos 挂载。
- [x] 修改 `backend/Dockerfile`：安装 git/openssh-client/ca-certificates，修正复制顺序。
- 验证：`docker compose -f deploy/docker-compose.yml config` 通过。

## T11 设计文档

- [x] 新增 `docs/12_架构设计.md`（分层、模块、拓扑、ADR）。
- [x] 新增 `docs/13_概要设计.md`（模块、页面、领域模型、Git API 概览）。
- [x] 新增 `docs/14_详细设计.md`（文件职责、Git 状态机、API 契约、DB 表/索引、DAL、测试）。
- [x] 更新 `README.md`、`docs/10_项目技术栈说明.md`。
- 验证：文档路径与代码一致。

## T12 最终验证

- [x] `cd frontend && npm run test && npm run typecheck && npm run build`（23 passed，tsc 零错误，构建成功）。
- [x] `cd backend && python -m pytest -q && python -m compileall src`（17 passed，compileall 通过）。
- [x] `docker compose -f deploy/docker-compose.yml config`（通过）。
- [x] 浏览器冒烟四个路由与一次真实 Git 提交（本环境浏览器无法访问沙箱端口，改用构建产物 + HTTP/API 实测：SPA 静态资源、`/api/v1/git/repos`、登记→提交→历史→审计全链路通过）。
- [x] 汇报变更与验证结果。
