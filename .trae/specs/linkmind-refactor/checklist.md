# 评审检查清单

## 范围与决策

- [x] 五项要求均有对应交付物（原型归档、设计文档、React+TS 前端、PostgreSQL 方案、FastAPI 后端，另含真实 Git 能力）。
- [x] PostgreSQL 为主库、Neo4j 为派生索引，代码/compose/文档一致（README、docs/10、12/13/14 均已修正）。
- [x] Git 为真实后端实现，前端无 localStorage 假数据回退（`grep lm-demo-git frontend/src` 无结果）。
- [x] 知识仓库限定在 `KNOWLEDGE_ROOT` 内，与产品工程仓库无关（`resolve_repo_path` 边界校验）。

## Git 能力

- [x] 支持仓库登记/移除、状态、勾选提交、提交全部、拉取、推送（`routes/git.py` 12 个端点）。
- [x] 冲突可查看 ours/theirs/working，支持保留本地/远端/编辑内容，标记解决（`GitConflict` + `ResolveStrategy`）。
- [x] 支持完成合并与放弃合并，状态机与原型一致（`merge/continue`、`merge/abort`）。
- [x] 提交历史、Git 动作审计可查询（`/log`、`/actions`，实测返回真实提交与审计记录）。
- [x] 所有命令 `shell=False`、有超时、有路径边界校验、单仓库串行锁（`git_service.py` + `_LOCKS`）。
- [x] 失败动作写入审计并返回统一错误结构（`git_registry_service.py` 失败分支 `ok=False`，`BusinessError` 统一处理）。
- [x] 后端 pytest 覆盖初始化/状态/提交/冲突/继续/放弃/推送/路径安全（17 passed）。

## 前端

- [x] 路由：`#/`、`#/map/:datasetId`、`#/git`、`#/note`（`App.tsx` HashRouter）。
- [x] 首页地图 CRUD 正常；脑图页无回归（`HomePage` + `DatasetModal` + `MindMapPage`）。
- [x] Git 页加载/错误/空态齐全，操作后刷新后端视图（`GitPage` 统一接收后端返回的最新仓库视图）。
- [x] 笔记页 Markdown 安全且大纲可用（先转义、标题 id、滚动高亮）。
- [x] Vitest、typecheck、build 全部通过（23 passed / tsc 零错误 / 构建成功）。

## 后端与数据库

- [x] `pg.py`、`db_models.py`、`pg_base.py`、`001_init.sql` 相互一致（迁移实际建出 10 张表）。
- [x] 表含主键、外键级联、唯一约束与 B-tree/GIN/BRIN/ivfflat 索引（6 UNIQUE、3 GIN、2 BRIN、1 ivfflat）。
- [x] 路由不写 SQL；仓储只接收 `AsyncSession`。
- [x] 数据库不可用不阻塞启动；`/health/postgres` 结构统一（实测 `{code,msg,data}`）。
- [x] `python -m compileall` 与 pytest 通过。

## 部署

- [x] compose 可解析；迁移挂载路径存在；postgres 健康检查生效（`docker compose config` 通过，postgres 实际启动并执行迁移）。
- [x] backend 注入 `DATABASE_URL` 与 Git 身份，等待 postgres 健康。
- [x] 知识目录可写；Dockerfile 安装 git 且复制顺序正确。
- [x] 无失效 nacos 挂载残留。

## 文档

- [x] 原型归档副本一致（三份 `diff` 一致），README/index 可导航（三个链接齐全）。
- [x] 12/13/14 文档含 Git 模块设计、API、表结构与测试策略，且与代码一致（10 表、12 Git 端点、porcelain 状态机）。
- [x] README 与 10 号文档技术栈更新（PostgreSQL 主库、Neo4j 派生索引）。
- [x] 验证命令可执行，验收标准完整。
