# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- ✅ 节点管理：新增、编辑、删除知识节点
- ✅ 关系管理：节点依赖关系的添加与删除
- ✅ 循环依赖检测：阻止形成循环依赖的操作
- ✅ 知识画布：基于 X6 图编辑引擎的可视化图谱
- ✅ 三种展示模式：内嵌模式、悬浮弹窗、右侧抽屉
- ✅ 笔记管理：为节点添加附属笔记，支持标签和备注
- ✅ 批量操作：笔记的批量删除功能
- ✅ 分层浏览：双击下钻、面包屑导航回退
- ✅ 搜索筛选：实时搜索和过滤节点
- ✅ 数据导入导出：完整数据备份与恢复，支持版本兼容
- ✅ 画布记忆：刷新页面后保持画布状态
- ✅ 防误触校验：删除操作前弹出确认提示

### Changed

- 📦 前端技术栈从 D3.js 迁移到 React + X6 + Zustand
- 📦 构建工具从 Webpack 迁移到 Vite
- 📦 状态管理从 Context API 迁移到 Zustand
- 📋 数据持久化方式从纯后端 API 改为 localStorage + API 双模式

### Fixed

- 🔧 导出文件包含函数属性导致 JSON 序列化失败
- 🔧 导入旧版本备份文件格式不兼容
- 🔧 虚拟机磁盘膨胀问题（Docker 镜像缓存占比 60%）
- 🔧 节点展开/折叠状态同步问题
- 🔧 事件冲突导致多次触发的问题

### Security

- 🔒 添加输入验证，防止恶意数据注入
- 🔒 循环依赖检测防止数据结构异常
- 🔒 删除操作二次确认防止误删

## [0.1.0] - 2024-01-15

### Added

- 🎯 项目初始化
- 🎯 基础架构搭建（FastAPI + React）
- 🎯 Neo4j 数据库集成
- 🎯 基础 API 接口定义
- 🎯 项目文档模板

[Unreleased]: https://github.com/linkmind/linkmind/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/linkmind/linkmind/releases/tag/v0.1.0
