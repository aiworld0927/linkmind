# LinkMind 前端功能 PRD

## 一、产品概述

LinkMind 知识图谱前端是一个基于 React + X6 的可视化知识管理系统，提供知识节点管理、关系管理、分层浏览、笔记管理等核心功能。

## 二、功能架构

### 功能模块

```
┌─────────────────────────────────────────────────────────────┐
│                    顶部工具栏 (Toolbar)                      │
│  搜索框 | 展示模式切换 | 新增节点 | 重置画布 | 导入/导出    │
├─────────────────────────────────────────────────────────────┤
│                  面包屑导航 (Breadcrumbs)                    │
│  根节点 > 层级1 > 层级2 > 当前节点                          │
├─────────────────────────────────────────────────────────────┤
│                    知识画布 (GraphCanvas)                    │
│  X6图编辑引擎 | 节点展示 | 关系连线 | 展开/折叠 | 双击下钻   │
├─────────────────────────────────────────────────────────────┤
│              三种展示模式 (Display Modes)                    │
│  inner(内嵌) | popover(悬浮) | drawer(抽屉)                 │
└─────────────────────────────────────────────────────────────┘
```

### 功能列表

| 功能模块 | 功能点 | 优先级 | 状态 |
|----------|--------|--------|------|
| 节点管理 | 新增节点 | P0 | ✅ |
| 节点管理 | 编辑节点 | P0 | ✅ |
| 节点管理 | 删除节点 | P0 | ✅ |
| 节点管理 | 循环依赖检测 | P1 | ✅ |
| 关系管理 | 添加依赖 | P0 | ✅ |
| 关系管理 | 删除依赖 | P0 | ✅ |
| 知识画布 | X6图渲染 | P0 | ✅ |
| 知识画布 | 节点展开/折叠 | P0 | ✅ |
| 知识画布 | 双击下钻 | P0 | ✅ |
| 知识画布 | 搜索筛选 | P1 | ✅ |
| 笔记管理 | 新增笔记 | P0 | ✅ |
| 笔记管理 | 编辑笔记 | P0 | ✅ |
| 笔记管理 | 删除笔记 | P0 | ✅ |
| 笔记管理 | 批量删除 | P1 | ✅ |
| 笔记管理 | 标签/备注 | P1 | ✅ |
| 展示模式 | 内嵌模式 | P0 | ✅ |
| 展示模式 | 悬浮弹窗 | P0 | ✅ |
| 展示模式 | 右侧抽屉 | P0 | ✅ |
| 面包屑 | 导航回退 | P0 | ✅ |
| 数据导入导出 | 导出数据 | P1 | ✅ |
| 数据导入导出 | 导入数据 | P1 | ✅ |

## 三、交互设计

### 3.1 节点交互

| 交互 | 触发方式 | 行为 |
|------|----------|------|
| 选中 | 单击节点 | 高亮节点 |
| 展开/折叠 | 单击节点（inner模式） | 切换展开状态，显示/隐藏附属列表 |
| 下钻 | 双击节点 | 进入子层级，更新面包屑 |
| 编辑 | 点击编辑按钮 | 弹出编辑弹窗 |
| 删除 | 点击删除按钮 | 弹出确认弹窗 |
| 悬浮展示 | 单击节点（popover模式） | 显示悬浮弹窗 |
| 抽屉展示 | 单击节点（drawer模式） | 打开右侧抽屉 |

### 3.2 列表交互

| 交互 | 触发方式 | 行为 |
|------|----------|------|
| 新增笔记 | 点击添加按钮 | 弹出表单弹窗 |
| 编辑笔记 | 点击编辑按钮 | 弹出编辑弹窗，回显内容 |
| 删除笔记 | 点击删除按钮 | 弹出确认弹窗 |
| 批量删除 | 勾选多选框后点击批量删除 | 弹出确认弹窗 |
| 空状态 | 无数据时 | 显示空状态文案和引导按钮 |

### 3.3 搜索交互

| 交互 | 触发方式 | 行为 |
|------|----------|------|
| 实时搜索 | 输入关键词 | 实时过滤节点，高亮匹配项 |
| 清空搜索 | 删除关键词 | 恢复显示所有节点 |

### 3.4 面包屑交互

| 交互 | 触发方式 | 行为 |
|------|----------|------|
| 层级回退 | 点击面包屑项 | 回退到对应层级 |
| 当前层级 | 最后一项 | 显示为粗体，不可点击 |

## 四、UI设计规范

### 4.1 节点样式

| 属性 | 值 |
|------|------|
| 宽度 | 240px |
| 默认高度 | 60px |
| 背景色 | #ffffff |
| 边框颜色 | #333333 |
| 展开边框 | 2px solid #10b981 |
| 搜索高亮边框 | 2px solid #1890ff |
| 边框圆角 | 8px |
| 阴影 | 0 2px 8px rgba(0,0,0,0.15) |

### 4.2 按钮样式

| 按钮类型 | 颜色 | 用途 |
|----------|------|------|
| 主按钮 | #10b981 | 新增节点 |
| 危险按钮 | #ef4444 | 删除、重置 |
| 次要按钮 | #444444 | 导入、导出 |

### 4.3 颜色规范

| 颜色 | 用途 |
|------|------|
| #1f1f1f | 工具栏背景 |
| #2a2a2a | 面包屑背景 |
| #333333 | 输入框背景 |
| #ffffff | 节点背景 |
| #10b981 | 成功/展开状态 |
| #ef4444 | 危险/删除操作 |
| #1890ff | 搜索高亮 |
| #faad14 | 警告提示 |

## 五、组件设计

### 5.1 GraphCanvas 组件

**职责**：知识画布主组件，基于 X6 图编辑引擎

**Props**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| onEditNode | (node: NodeItem) => void | 是 | 编辑节点回调 |

**内部状态**：

| 状态 | 类型 | 说明 |
|------|------|------|
| graphRef | RefObject<Graph> | X6图实例引用 |
| isReady | boolean | 画布是否初始化完成 |
| popoverVisible | boolean | 悬浮弹窗是否显示 |
| popoverVisibleNodeId | string \| null | 当前悬浮节点ID |
| popoverPosition | { x: number; y: number } | 悬浮弹窗位置 |

**核心方法**：

| 方法 | 说明 |
|------|------|
| initGraph | 初始化X6图实例 |
| renderAllGraph | 全量渲染图（仅初始使用） |
| updateGraphIncrementally | 增量更新图 |
| handleNodeClick | 处理节点单击 |
| handleNodeDoubleClick | 处理节点双击 |
| handleEditNode | 编辑节点 |
| handleDeleteNode | 删除节点 |

### 5.2 Toolbar 组件

**职责**：顶部工具栏

**内部状态**：

| 状态 | 类型 | 说明 |
|------|------|------|
| showAddModal | boolean | 新增节点弹窗 |
| isExporting | boolean | 导出加载状态 |
| isImporting | boolean | 导入加载状态 |

**核心方法**：

| 方法 | 说明 |
|------|------|
| handleClearLevel | 重置画布 |
| handleExport | 导出数据 |
| handleImport | 导入数据 |

### 5.3 Breadcrumbs 组件

**职责**：面包屑导航

**核心逻辑**：

- 根据 store 中的 breadcrumbs 数组渲染
- 点击面包屑项触发 backToBreadLevel
- 最后一项为当前层级，不可点击

### 5.4 NodeModal 组件

**职责**：节点新增/编辑弹窗

**Props**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visible | boolean | 是 | 弹窗可见性 |
| onCancel | () => void | 是 | 取消回调 |
| editingNode | NodeItem \| null | 否 | 编辑的节点 |

**表单字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 节点名称 |
| dependencies | string[] | 否 | 依赖节点 |
| displayMode | DisplayMode | 否 | 展示模式 |

### 5.5 NoteList 组件

**职责**：通用笔记列表（三种模式共用）

**Props**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| items | ListItem[] | 是 | 笔记列表 |
| parentNodeId | string | 是 | 父节点ID |
| onAdd | (parentId, item) => void | 是 | 新增笔记回调 |
| onEdit | (parentId, itemId, patch) => void | 是 | 编辑笔记回调 |
| onDelete | (parentId, itemIds) => void | 是 | 删除笔记回调 |

**内部状态**：

| 状态 | 类型 | 说明 |
|------|------|------|
| showAddModal | boolean | 新增弹窗 |
| editingItem | ListItem \| null | 编辑项 |
| selectedIds | string[] | 选中项ID |
| selectAll | boolean | 是否全选 |

**核心方法**：

| 方法 | 说明 |
|------|------|
| handleAdd | 新增笔记 |
| handleEdit | 编辑笔记 |
| handleDelete | 删除单条 |
| handleBatchDelete | 批量删除 |

### 5.6 ListItemModal 组件

**职责**：笔记新增/编辑弹窗

**Props**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visible | boolean | 是 | 弹窗可见性 |
| onCancel | () => void | 是 | 取消回调 |
| onSubmit | (item) => void | 是 | 提交回调 |
| editingItem | ListItem \| null | 否 | 编辑的笔记 |

**表单字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 笔记内容 |
| tags | string | 否 | 标签（逗号分隔） |
| remark | string | 否 | 备注 |

### 5.7 NodePopover 组件

**职责**：悬浮弹窗展示模式

**Props**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | 是 | 目标节点ID |
| x | number | 是 | 弹窗X位置 |
| y | number | 是 | 弹窗Y位置 |
| onClose | () => void | 是 | 关闭回调 |

**核心逻辑**：

- 使用 Ant Design Popover 组件
- 内容区域嵌入 NoteList
- 列表操作不关闭弹窗，实时刷新

### 5.8 NodeDrawer 组件

**职责**：右侧抽屉展示模式

**核心逻辑**：

- 使用 Ant Design Drawer 组件
- 内容区域嵌入 NoteList
- 抽屉保持打开，列表数据实时刷新

## 六、状态管理

### 6.1 Store 结构

| 状态 | 类型 | 说明 |
|------|------|------|
| currentNodes | NodeItem[] | 当前层级节点列表 |
| currentLevelId | string | 当前层级ID |
| breadcrumbs | BreadItem[] | 面包屑导航 |
| globalDisplayMode | DisplayMode | 全局展示模式 |
| canvasView | CanvasViewState | 画布视图状态 |
| searchKeyword | string | 搜索关键词 |
| popoverVisibleNodeId | string \| null | 悬浮弹窗节点 |
| drawerVisible | boolean | 抽屉是否打开 |
| drawerTargetNodeId | string \| null | 抽屉目标节点 |
| isLoading | boolean | 加载状态 |
| levelHistory | LevelHistory[] | 层级历史 |

### 6.2 Actions

| Action | 参数 | 说明 |
|--------|------|------|
| addNode | node: NodeItem | 新增节点 |
| updateNode | nodeId, patch | 更新节点 |
| deleteNode | nodeId, isCascade | 删除节点 |
| toggleNodeExpand | nodeId | 切换展开状态 |
| addListItem | parentNodeId, item | 新增笔记 |
| updateListItem | parentNodeId, itemId, patch | 更新笔记 |
| deleteListItem | parentNodeId, itemIdList | 删除笔记 |
| drillDown | targetNodeId | 下钻到子层级 |
| backToBreadLevel | targetIndex | 回退到指定层级 |
| resetToRoot | - | 重置到根节点 |
| setGlobalDisplayMode | mode | 设置展示模式 |
| exportData | - | 导出数据 |
| importData | data | 导入数据 |

### 6.3 数据持久化

- 使用 localStorage 存储核心状态
- 每次状态变更自动同步到 localStorage
- 页面加载时从 localStorage 恢复状态

## 七、性能优化

### 7.1 增量更新

- 节点数据变化时使用 `node.setData()` 局部更新
- 避免 `graph.clearCells()` 全量重绘
- React 组件通过 `effect: ['data']` 响应式更新

### 7.2 事件冲突处理

- inner 模式由 React 组件处理点击事件
- popover/drawer 模式由 X6 事件处理
- 使用 `e.stopPropagation()` 阻止事件冒泡

### 7.3 防抖处理

- 搜索输入使用防抖
- 布局更新使用防抖

## 八、数据模型

### 8.1 NodeItem

```typescript
interface NodeItem {
  id: string;
  name: string;
  dependencies: string[];
  children: ListItem[];
  isExpanded: boolean;
  displayMode: DisplayMode;
  createTime: string;
}
```

### 8.2 ListItem

```typescript
interface ListItem {
  id: string;
  content: string;
  tagList: string[];
  remark: string;
  parentNodeId: string;
  createTime: string;
}
```

### 8.3 DisplayMode

```typescript
type DisplayMode = 'inner' | 'popover' | 'drawer';
```

## 九、API 调用

### 9.1 前端代理配置

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

### 9.2 调用方式

- 当前版本前端使用本地 Zustand 状态管理
- 后端 API 用于持久化存储到 Neo4j
- 数据导入导出基于 localStorage 数据

## 十、浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
