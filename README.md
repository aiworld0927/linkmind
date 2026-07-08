# LinkMind 知识图谱

基于 Neo4j + FastAPI + React 的知识图谱可视化系统，帮助用户构建、管理和探索个人知识库。

## ✨ 功能特性

- 🗂️ **节点管理**：创建、编辑、删除知识节点，支持循环依赖检测
- 🔗 **关系管理**：管理节点间关联关系，支持多依赖节点
- 🎨 **知识画布**：基于 X6 图编辑引擎的可视化知识图谱
- 📝 **笔记管理**：为节点添加附属笔记，支持标签和备注
- 🧩 **三种展示模式**：内嵌、悬浮弹窗、右侧抽屉
- 📊 **分层浏览**：双击下钻、面包屑导航回退
- 📤 **数据导入导出**：完整数据备份与恢复
- 🔍 **搜索筛选**：全文检索、多条件筛选

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | FastAPI | 0.115.0 |
| 数据库 | Neo4j | 5.26.0 |
| 前端框架 | React | 18.x |
| 前端构建 | Vite | 5.x |
| 状态管理 | Zustand | 4.x |
| 图编辑引擎 | X6 | 2.x |
| UI 组件库 | Ant Design | 5.x |

## 📁 项目结构

```
linkmind/
├── backend/          # 后端服务
│   ├── src/          # 源代码
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/         # 前端页面
│   ├── src/          # 源代码
│   ├── package.json
│   └── vite.config.ts
├── deploy/           # 部署配置
│   └── docker-compose.yml
├── docs/             # 项目文档
├── scripts/          # 脚本文件
└── LICENSE
```

## 🚀 快速开始

### 前置要求

- Python 3.12+
- Node.js 20.x+
- Docker 20.10+

### 开发模式

```bash
# 1. 启动 Neo4j 数据库
docker run -d --name neo4j-dev \
  -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5.26.0

# 2. 启动后端服务
cd backend
uv pip install -e .
cd src
python main.py

# 3. 启动前端服务
cd ../../frontend
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173/ |
| 后端 API | http://localhost:8000/api/ |
| API 文档 | http://localhost:8000/docs |
| Neo4j 控制台 | http://localhost:7474 |

## 📖 文档

| 文档 | 路径 |
|------|------|
| 项目概览 | [docs/01_项目概览.md](docs/01_项目概览.md) |
| 部署手册 | [docs/02_部署手册.md](docs/02_部署手册.md) |
| API 接口文档 | [docs/03_API接口文档.md](docs/03_API接口文档.md) |
| 前端功能 PRD | [docs/04_前端功能PRD.md](docs/04_前端功能PRD.md) |
| 运维手册 | [docs/05_运维手册.md](docs/05_运维手册.md) |

## 📋 开发工具

### 后端

```bash
# 代码格式化
uv run black src/

# 代码检查
uv run flake8 src/

# 类型检查
uv run mypy src/
```

### 前端

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 类型检查
npm run typecheck

# 构建验证
npm run build
```

## 📝 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件
