# API 接口评审报告

> 评审对象：[15_API接口列表.md](./15_API接口列表.md)、[16_待确认问题.md](./16_待确认问题.md)
> 对照基准：React 前端工程源码（`frontend/src`，逐文件核对）
> 后端技术栈约束：FastAPI + Pydantic v2 + PostgreSQL
> 评审日期：2026-11-26
> 评审范围：31 项接口（现有 14 + 待设计 17）+ 13 项待确认问题

---

## 一、评审范围与方法

1. **完整性核对**：以 [git/api.ts](file:///coding/linkmind/frontend/src/features/git/api.ts) 与 [utils/api.ts](file:///coding/linkmind/frontend/src/utils/api.ts) 两个封装层为起点，追踪全部调用链（store → 组件），逐条比对文档条目。
2. **规范性检查**：RESTful 路径/方法语义、分页与命名一致性。
3. **字段完整性**：请求/响应字段的类型、必填性、Pydantic v2 可映射性、PostgreSQL 类型、错误码、鉴权。
4. **业务闭环**：CRUD 成对性、状态流转、导入导出闭环。

**前端技术事实（核对确认）**：
- 数据请求仅有两个自研 fetch 封装（无 axios、无 React Query/SWR、无 msw、无 mock 目录）；
- 数据源为 zustand 内存 store + 硬编码种子数据 `SEED_MAPS`（[config/maps.ts](file:///coding/linkmind/frontend/src/config/maps.ts#L18-L124)）；
- 路由为 HashRouter 4 条（`/`、`/map/:mapId`、`/git`、`/note`），无权限守卫。

---

## 二、完整性核对结果

### 2.1 前端 API 调用 ↔ 文档条目对照（结论：无遗漏）

| # | 前端封装方法 | 调用点 | 文档条目 | 覆盖 |
|---|--------------|--------|----------|------|
| 1 | `gitApi.listRepos`（[api.ts L67-70](file:///coding/linkmind/frontend/src/features/git/api.ts#L67-L70)） | [store.ts L73](file:///coding/linkmind/frontend/src/features/git/store.ts#L73)、[Modals.tsx L417](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L417) | 总览 1（A-1） | ✓ |
| 2 | `gitApi.getRepo`（L72-74） | [store.ts L93](file:///coding/linkmind/frontend/src/features/git/store.ts#L93) | 总览 2（A-2） | ✓ |
| 3 | `gitApi.createRepo`（L76-78） | [store.ts L101](file:///coding/linkmind/frontend/src/features/git/store.ts#L101)、[RepoDialog.tsx L58-63](file:///coding/linkmind/frontend/src/features/git/components/RepoDialog.tsx#L58-L63)、[Modals.tsx L636-641](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L636-L641) | 总览 3（A-3） | ✓ |
| 4 | `gitApi.deleteRepo`（L80-82） | [store.ts L109](file:///coding/linkmind/frontend/src/features/git/store.ts#L109) | 总览 4（A-4） | ✓ |
| 5 | `gitApi.commit`（L84-86） | [GitPage.tsx L50-60](file:///coding/linkmind/frontend/src/pages/GitPage.tsx#L50-L60)→[store.ts L125](file:///coding/linkmind/frontend/src/features/git/store.ts#L125) | 总览 5（A-5） | ✓ |
| 6 | `gitApi.pull`（L88-90） | [store.ts L135](file:///coding/linkmind/frontend/src/features/git/store.ts#L135) | 总览 6（A-6） | ✓ |
| 7 | `gitApi.push`（L92-94） | [store.ts L145](file:///coding/linkmind/frontend/src/features/git/store.ts#L145) | 总览 7（A-7） | ✓ |
| 8 | `gitApi.resolveConflict`（L96-101） | [store.ts L151-159](file:///coding/linkmind/frontend/src/features/git/store.ts#L151-L159) | 总览 8（A-8） | ✓ |
| 9 | `gitApi.continueMerge`（L103-105） | [store.ts L166](file:///coding/linkmind/frontend/src/features/git/store.ts#L166) | 总览 9（A-9） | ✓ |
| 10 | `gitApi.abortMerge`（L107-109） | [store.ts L176](file:///coding/linkmind/frontend/src/features/git/store.ts#L176) | 总览 10（A-10） | ✓ |
| 11 | `gitApi.log`（L111-114） | 无调用点 | 总览 11（A-11，已标注） | ✓ |
| 12 | `gitApi.actions`（L116-121） | 无调用点 | 总览 12（A-12，已标注） | ✓ |
| 13 | `gitApi.listDirs`（L123-125） | [RepoDialog.tsx L28](file:///coding/linkmind/frontend/src/features/git/components/RepoDialog.tsx#L28)、[Modals.tsx L433/L447](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L430-L456) | 总览 13（B-1） | ✓ |
| 14 | `fetchFsTree`（[utils/api.ts L19-26](file:///coding/linkmind/frontend/src/utils/api.ts#L19-L26)） | [Modals.tsx L469](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L462-L480) | 总览 14（B-2） | ✓ |

内存态隐含需求（地图/节点/属性/笔记的 17 个待设计接口）已按模块 C/D/E/F 覆盖，无遗漏。

### 2.2 冗余接口清单（文档有、前端未用）

| 条目 | 状态 | 处置建议 |
|------|------|----------|
| A-11 log、A-12 actions | 已封装未调用 | 保留至 Q1 决议；历史数据实际随 `GitRepo` 内嵌返回 |
| C-6 整树批量保存 | 与 D/E/F 互斥未决 | 决议前冻结（见 P2） |
| C-8 地图导出 | 纯前端 Blob 实现 | 后端接口列为可选（Q10） |
| F-3 读取文档全文 | 前端未调用（规划） | 保留，作为 fs/tree 截断的兜底通道 |
| 附录 8 组后端接口（note/link/graph/expand/search/cluster/markdown/health） | 前端零调用 | 标注"去留由图谱功能规划决定"，避免误判为前端需求 |

---

## 三、问题清单

| 序号 | 问题类型 | 涉及接口 | 问题描述 | 修改建议 | 严重级别 |
|------|----------|----------|----------|----------|----------|
| P1 | 完整性/数据一致性 | 4.3 统计信息 | 统计"已调用 10（Git 仓库 4 + Git 操作冲突 4）"与总览表矛盾：总览 1-10 行均标"已调用"，加文件系统 2 项实为 **12**；"Git 操作冲突 4"漏计 continue/abort（实为 6） | 修正统计行：已调用 12 = Git 仓库 4 + Git 操作与冲突 6 + 文件系统 2；补"现有接口合计 14" | **高** |
| P2 | 业务闭环/方案未决 | C-6 vs D/E/F | 整树批量保存与细粒度节点/属性/笔记接口并存，互斥方案未决，直接阻塞持久层建模与前端 store 改造方向 | 明确分工：D/E/F 为常规落库唯一通道，C-6 限定为"画布批量操作/导入后的同步通道"并标注互斥关系；Q9+P2 决议前**不得启动持久层开发** | **高** |
| P3 | 规范性/分页 | A-11、A-12、C-1 | 分页不统一：log/actions 用 `limit`（无翻页），C-1 无分页参数，列表响应均无 `total` | 统一 `page: int = 1` / `page_size: int = 20`（上限 100），列表响应统一 `{total: int, items: list[T]}`；log/actions 待 Q1 决议后一并改造 | 中 |
| P4 | 规范性/字段命名 | fs 模块 vs git 模块 | JSON 命名混用：fs 用 camelCase（`rootName/hasChildren/mdCount`），git/地图用 snake_case（`fs_path/short_hash/remote_url`） | 新接口一律 snake_case；存量 camelCase 由 Pydantic v2 `alias_generator=to_camel` + `populate_by_name` 过渡兼容，前端随持久化改造统一 | 中 |
| P5 | 字段/类型映射 | GitCommit.date、GitAction.ts | 声明为 `str`，无格式约定，无法映射 Pydantic datetime | 统一 `datetime`（ISO8601 带时区输出），PostgreSQL 用 `timestamptz`（对应 Q7） | 中 |
| P6 | 字段/类型映射 | TreeMap/TreeNode/GitRepo 等主键 | 全部声明 `str`，未明确 UUID | 主键统一 `uuid.UUID`（Pydantic v2），PostgreSQL 用 `uuid` 列；`'ROOT'` 为前端虚拟约定不落库 | 中 |
| P7 | 规范性/错误码 | 全部接口 | 未定义错误响应规范：HTTP 状态码与 body.code 映射、422/404 场景响应体结构缺失 | 补充映射表：`200` 成功；`400` 业务规则错误；`404` 资源不存在；`422` Pydantic 校验失败；`500` 服务器异常；body 统一 `{code, msg, data: null}`。前端 `request()` 按 `code!==200` 判错 + HTTP status 兜底，天然兼容 | 中 |
| P8 | 规范性/鉴权 | 全部接口 | 未标注鉴权方案与请求头约定（Q11 待确认） | 文档预留 `Authorization: Bearer <JWT>` 头位，声明"当前匿名访问"；Q11 决议后补 401/403 场景定义 | 中 |
| P9 | 字段/存储映射 | 模块 C/D/E/F | 待设计接口未给 PostgreSQL 存储映射（主键、时间戳、树形存储方式） | 增加存储建议小节：maps 表（uuid PK、timestamptz）、nodes 关系表（parent_id + sort_order）、props 关系表（note_tags 用 jsonb）；备选整树 jsonb 方案与 C-6 匹配，随 P2 决议二选一 | 中 |
| P10 | 字段/缺失 | E-1、E-2、TreeNodeProp | 响应声明"含后端生成的属性 id"，但数据模型未正式定义 `prop_id` 字段，实现时必踩 | `TreeNodeProp` 正式增加 `prop_id: str`（uuid）；E-1/E-2/F-1/F-2 字段表同步标注；前端 `propIndex` → `propId` 改造（Q12） | 中 |
| P11 | 字段/缺失 | B-2 fs/tree、FsTreeNodeProp | 大目录响应体量不可控，无截断标记与原始长度 | `FsTreeNodeProp` 增加 `truncated: bool = False`、`content_length: int`；配合 F-3 全文拉取（Q2） | 中 |
| P12 | 规范性/路径风格 | A-5~A-10、C-7 | 动作类端点（/commit、/pull、/conflicts/resolve、/merge/*、/import）为 RPC 风格，与纯 CRUD 混排易误读 | 可保留（git 动作天然命令式），文档注明"动作类端点为 RPC 风格，POST 且非幂等，属有意设计" | 低 |
| P13 | 规范性/路径 | F-3 GET /docs/content | 用 query 传文档路径，与 REST 层级风格不一致 | 建议 `GET /api/v1/docs/{doc_path:path}/content`（FastAPI path converter），或保留 query 并注明理由；越权校验与 /fs/* 同标准 | 低 |
| P14 | 业务闭环 | C-7/C-8 | 导入只有目录来源，JSON 导出后无回流入口，闭环缺失 | 补 `POST /maps/import-json`（Body 为导出格式），依赖 Q10 决议；未确认前列为可选 | 低 |
| P15 | 业务闭环/前瞻 | 模块 D | 节点无移动/排序接口；当前前端不支持拖拽改父级，暂不阻塞 | 前瞻预留 `PATCH /maps/{map_id}/nodes/{node_id}`（`parent_id`、`sort_order`）；画布支持拖拽重组时启动 | 低 |
| P16 | 完整性/冗余 | A-11/A-12、C-6、C-8、F-3、附录 | 文档含前端未使用接口，未逐一标注"去留决策" | 总览状态列已标注；附录补"去留由图谱功能规划决定"注记；A-11/A-12 由 Q1 决议 | 低 |
| P17 | 前端代码缺陷 | types/global.d.ts | [global.d.ts L1](file:///coding/linkmind/frontend/src/types/global.d.ts#L1) 引用 `@/types` 中不存在的 `ExportDataPayload/OperationResult`（原型遗留 `window.linkmind` 机制），类型检查报错风险 | 删除失效引用或补齐类型定义；与接口文档无直接耦合，列入前端整改清单 | 低 |
| P18 | 完整性/性能 | C-1 地图列表 | `TreeMapSummary.node_count/prop_count` 需递归聚合，大地图查询有开销 | 聚合 SQL 或落库时维护计数列；接口结构不变 | 低 |

---

## 四、遗漏接口补充建议

| 建议接口 | 方法 | 路径 | 优先级 | 依赖 |
|----------|------|------|--------|------|
| JSON 导入回流（导出闭环） | POST | `/api/v1/maps/import-json` | 可选 | Q10 决议（P14） |
| 节点移动/排序（拖拽重组） | PATCH | `/api/v1/maps/{map_id}/nodes/{node_id}` | 前瞻预留 | 画布支持拖拽改父级后启动（P15） |

**明确范围外（避免误判为遗漏）**：
- 单文件 stage/unstage、discard 变更：前端无对应功能，`commit(all/paths)` 已覆盖现有场景；
- 地图克隆、节点后端搜索：前端内存搜索 + C-5 全量树加载已满足当前规模；
- 401/403 异常场景：依赖 Q11 鉴权决议，当前匿名访问下不适用。

---

## 五、已直接修正项（同步更新 15_API接口列表.md）

| 序号 | 修正内容 | 对应问题 |
|------|----------|----------|
| 1 | 统计信息修正：已调用 10 → 12（Git 操作与冲突 4 → 6），补"现有接口合计 14" | P1 |
| 2 | 4.2 请求封装约定补充：错误码映射表、鉴权预留、字段命名约定、RPC 风格注记 | P4/P7/P8/P12 |
| 3 | TreeNodeProp 模型正式增加 `prop_id` 字段 | P10 |
| 4 | FsTreeNodeProp 模型增加 `truncated`/`content_length` 字段 | P11 |
| 5 | E-1/E-2 响应字段明确 `prop_id: str`（uuid） | P10 |
| 6 | A-11/A-12 补充分页统一建议注记 | P3 |
| 7 | C-6 补充互斥关系与"决议前冻结"标注 | P2 |
| 8 | F-3 补充路径设计建议 | P13 |
| 9 | 新增"存储映射建议（PostgreSQL）"小节 | P9 |
| 10 | 文档版本号 v1.1、末尾新增变更记录 | 全部 |

---

## 六、评审结论

**结论：需修改后通过。**

### 高严重级别问题（逐条列示）

| 序号 | 问题 | 当前状态 | 通过条件 |
|------|------|----------|----------|
| P1 | 统计口径与总览表矛盾（已调用 10 vs 实际 12） | **已修正**（15 号文档 v1.1） | 无需进一步动作 |
| P2 | 整树保存（C-6）与细粒度接口（D/E/F）互斥方案未决，阻塞持久层实现 | 待决议 | Q9/P2 给出明确分工（建议：D/E/F 为常规通道，C-6 仅作批量同步），并同步冻结未选方案 |

### 通过前提

1. P2 由产品/架构双侧决议（关联 Q9）；
2. 中级别 P3–P11 纳入接口定稿前必改项（本次文档层已补注记，字段定稿时落实）；
3. 低级别 P12–P18 随迭代处理，不阻塞通过。

### 遗留依赖

13 项待确认问题（[16_待确认问题.md](./16_待确认问题.md)）中，**Q9（P2 关联）、Q12（P10 关联）为持久层开发的硬前置**，建议优先安排答复。
