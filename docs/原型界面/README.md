# 原型界面归档

本目录归档 LinkMind 前端原型的完整静态版本，便于设计评审、交互对照与回归参考。

## 文件说明

| 文件 | 对应 React 页面 | 功能 |
|------|-----------------|------|
| `demo-mindmap.html` | `#/`、`#/map/:datasetId` | 首页知识地图卡片、脑图画布、节点属性抽屉、目录导入、Git 状态徽标 |
| `demo-note.html` | `#/note` | Markdown 笔记阅读、文档大纲、滚动高亮 |
| `demo-git.html` | `#/git` | 多知识仓库、变更勾选提交、拉取、推送、冲突解决、合并继续/放弃、提交历史、Git 动作记录 |
| `index.html` | - | 三张原型的入口导航 |

## 来源与版本

- 源文件：`frontend/public/demo-mindmap.html`、`demo-git.html`、`demo-note.html`
- 归档方式：原样复制，未做修改
- 归档时间：2026-11-25
- 原型中的 Git 数据存储在浏览器 `localStorage`，key 为 `lm-demo-git-v1`

## 打开方式

1. 直接双击 `index.html` 或任一 HTML 文件，用浏览器打开。
2. 原型为纯静态页面，样式与脚本均内联，无需构建。
3. `demo-mindmap.html` 的「目录导入」会请求 `/api/v1/fs/dirs`，需要后端服务已启动并通过同源访问；其余功能可离线体验。

## 与正式实现的差异

- 正式前端采用 React 18 + TypeScript + HashRouter，页面位于 `frontend/src/pages/`。
- 正式 Git 管理对接后端真实接口（`/api/v1/git/*`），执行服务器上的真实 Git 操作；原型仅使用本地演示数据。
- 正式脑图复用 AntV X6 画布，按层级下钻承载原型中的递归节点结构。
- 正式笔记页由 `features/notes/markdown.ts` 渲染，规则与原型保持一致。
