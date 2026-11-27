# LinkMind Backend（app/ 分层重构版）

> 技术栈：Python 3.12+ / FastAPI / SQLAlchemy 2.0（asyncpg）/ Pydantic v2 / Alembic / PostgreSQL 17 / uvicorn
> 接口契约：[docs/15_API接口列表.md](../docs/15_API接口列表.md)（31 项）；工程蓝图：[docs/18_后端工程结构设计.md](../docs/18_后端工程结构设计.md)

## 目录结构

```
backend/
  app/
    main.py                    # FastAPI 实例、CORS、路由注册、全局异常、lifespan
    core/                      # 公共基础设施
      config.py                # Settings（pydantic-settings，读 backend/.env）
      security.py              # OAuth2PasswordBearer + JWT + current_user（ALLOW_ANONYMOUS 放行）
      exceptions.py            # AppException + 全局异常处理（统一 {code,msg,data}）
      constants.py             # ErrorCode 枚举 + NODE_ROOT_ID
      deps.py                  # get_db / Pagination / current_user 依赖
      logging.py               # 统一日志
      pagination.py            # Page[T] = {total, items}
      response.py              # ApiResponse[T] = {code, msg, data}
    db/
      base.py                  # DeclarativeBase + 命名约定 + TimestampMixin + uuid 主键
      session.py               # create_async_engine(asyncpg) + async_sessionmaker
      seed.py                  # 种子数据（python -m app.db.seed）
    api/v1/
      router.py                # 汇总路由（prefix=/api/v1）
      health/router.py         # /health、/health/postgres、/health/neo4j
      git/                     # 模块 A：12 端点（router/schemas/service/repository/models）
      fs/                      # 模块 B-1/B-2/F-3：3 端点（router/schemas/service）
      mindmap/                 # 模块 C/D/E/F：16 端点（models/repository/service/schemas/routers）
  alembic/                     # 迁移（async env，versions/0001_baseline 建全部 5 表）
  tests/                       # pytest + pytest-asyncio + httpx
  .env.example                 # 环境变量模板
```

**分层调用链**：router（校验/依赖/response_model）→ service（业务，全 async）→ repository（AsyncSession + select）→ models（Mapped[]）。

## 快速开始

```bash
cd backend

# 1. 安装依赖（uv，已配置清华镜像）
uv sync --extra dev        # 或 .venv/bin/python -m pip install -e ".[dev]"

# 2. 准备环境变量
cp .env.example .env       # 按需修改 DATABASE_URL / KNOWLEDGE_ROOT / SECRET_KEY

# 3. 数据库迁移（空库一次成功）
.venv/bin/python -m alembic upgrade head

# 4.（可选）种子数据
.venv/bin/python -m app.db.seed

# 5. 启动
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- Swagger UI：<http://localhost:8000/docs>（可调试全部接口）
- 前端 Vite（5173）已代理 `/api` → `8000`；CORS 在 `CORS_ORIGINS` 中配置

## 约定

- 统一响应 `{code, msg, data}`，`code === 200` 为成功；错误码映射 200/400/403/404/422/500
- 分页：`page`/`page_size`（1~100，默认 20），响应 `{total, items}`
- 鉴权：`Authorization: Bearer <JWT>`；`ALLOW_ANONYMOUS=true` 时匿名放行（默认）
- `'ROOT'` 为前端虚拟根节点：不落库，节点重命名=改地图标题，属性挂地图级（`props.node_id` 为 null）
- git 安全约束：subprocess `shell=False` + 超时 + 仓库限定 KNOWLEDGE_ROOT + 单仓库串行 + 审计写 `git_actions`

## 测试

```bash
cd backend && .venv/bin/python -m pytest tests -v
```

测试使用独立的 `linkmind_test` 数据库（自动建库/迁移/清表）。
