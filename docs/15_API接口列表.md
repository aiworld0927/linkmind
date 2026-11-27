# API 接口列表（前端视角梳理）

> 本文档基于前端工程源码（React 18 + TypeScript + Vite，`frontend/src`）通读梳理，
> 列出前端当前已调用、已封装未调用、以及隐含需要（内存态数据）的全部后端接口能力。
> 仅做梳理，不含后端代码实现。
>
> 梳理日期：2026-11-26（含第二屏脑图编辑相关接口补充）
> 版本：v1.2（2026-11-27 前后端联调修正，详见 [前后端联调报告.md](./前后端联调报告.md) 与文末变更记录）
> 前端 API 统一前缀：`/api/v1`（见 [git/api.ts](file:///coding/linkmind/frontend/src/features/git/api.ts#L11)、[utils/api.ts](file:///coding/linkmind/frontend/src/utils/api.ts#L4)）
> 统一响应包裹：`{ code: number, msg: string, data: T }`，前端约定 `code === 200` 为成功
> （见 [git/api.ts L23-32](file:///coding/linkmind/frontend/src/features/git/api.ts#L23-L32)、[utils/api.ts L6-10](file:///coding/linkmind/frontend/src/utils/api.ts#L6-L10)）

**屏幕与模块对应关系**：
- 第一屏（首页 `/`）：地图列表、新建/编辑/删除地图、导入知识地图、导出、Git 管理入口
- 第二屏（脑图页 `/map/:mapId`）：节点增删改（右键菜单）、属性/文档增删改（属性抽屉）、画布交互
- 第三屏（笔记页 `/note`）：文档内容查看与编辑模式（Vditor），保存写回脑图
- Git 管理页（`/git`）：仓库登记、提交、拉取、推送、冲突处理

---

## 一、接口总览表

| 序号 | 模块 | 接口名称 | 请求方法 | 接口路径 | 前端调用状态 | 对应前端文件位置 |
|------|------|----------|----------|----------|--------------|------------------|
| 1 | Git 仓库 | 列出知识仓库 | GET | `/api/v1/git/repos` | 已调用 | [git/api.ts L67-70](file:///coding/linkmind/frontend/src/features/git/api.ts#L67-L70) |
| 2 | Git 仓库 | 查询单个仓库详情 | GET | `/api/v1/git/repos/{repo_id}` | 已调用 | [git/api.ts L72-74](file:///coding/linkmind/frontend/src/features/git/api.ts#L72-L74) |
| 3 | Git 仓库 | 登记（创建）知识仓库 | POST | `/api/v1/git/repos` | 已调用 | [git/api.ts L76-78](file:///coding/linkmind/frontend/src/features/git/api.ts#L76-L78) |
| 4 | Git 仓库 | 移除知识仓库 | DELETE | `/api/v1/git/repos/{repo_id}` | 已调用 | [git/api.ts L80-82](file:///coding/linkmind/frontend/src/features/git/api.ts#L80-L82) |
| 5 | Git 操作 | 提交变更 | POST | `/api/v1/git/repos/{repo_id}/commit` | 已调用 | [git/api.ts L84-86](file:///coding/linkmind/frontend/src/features/git/api.ts#L84-L86) |
| 6 | Git 操作 | 拉取远端 | POST | `/api/v1/git/repos/{repo_id}/pull` | 已调用 | [git/api.ts L88-90](file:///coding/linkmind/frontend/src/features/git/api.ts#L88-L90) |
| 7 | Git 操作 | 推送远端 | POST | `/api/v1/git/repos/{repo_id}/push` | 已调用 | [git/api.ts L92-94](file:///coding/linkmind/frontend/src/features/git/api.ts#L92-L94) |
| 8 | Git 冲突 | 解决合并冲突 | POST | `/api/v1/git/repos/{repo_id}/conflicts/resolve` | 已调用 | [git/api.ts L96-101](file:///coding/linkmind/frontend/src/features/git/api.ts#L96-L101) |
| 9 | Git 冲突 | 继续合并 | POST | `/api/v1/git/repos/{repo_id}/merge/continue` | 已调用 | [git/api.ts L103-105](file:///coding/linkmind/frontend/src/features/git/api.ts#L103-L105) |
| 10 | Git 冲突 | 中止合并 | POST | `/api/v1/git/repos/{repo_id}/merge/abort` | 已调用 | [git/api.ts L107-109](file:///coding/linkmind/frontend/src/features/git/api.ts#L107-L109) |
| 11 | Git 历史 | 查询提交历史 | GET | `/api/v1/git/repos/{repo_id}/log` | 已封装未调用 | [git/api.ts L111-114](file:///coding/linkmind/frontend/src/features/git/api.ts#L111-L114) |
| 12 | Git 历史 | 查询 Git 动作记录 | GET | `/api/v1/git/repos/{repo_id}/actions` | 已封装未调用 | [git/api.ts L116-121](file:///coding/linkmind/frontend/src/features/git/api.ts#L116-L121) |
| 13 | 文件系统 | 列出知识库子目录 | GET | `/api/v1/fs/dirs` | 已调用 | [git/api.ts L123-125](file:///coding/linkmind/frontend/src/features/git/api.ts#L123-L125) |
| 14 | 文件系统 | 扫描目录生成知识树 | GET | `/api/v1/fs/tree` | 已调用 | [utils/api.ts L19-26](file:///coding/linkmind/frontend/src/utils/api.ts#L19-L26) |
| 15 | 知识地图 | 地图列表 | GET | `/api/v1/maps`（待设计） | 未封装（内存态） | [store/index.ts L143-147](file:///coding/linkmind/frontend/src/store/index.ts#L143-L147) |
| 16 | 知识地图 | 创建地图 | POST | `/api/v1/maps`（待设计） | 未封装（内存态） | [store/index.ts L251-262](file:///coding/linkmind/frontend/src/store/index.ts#L251-L262) |
| 17 | 知识地图 | 更新地图元信息 | PUT | `/api/v1/maps/{map_id}`（待设计） | 未封装（内存态） | [store/index.ts L263-268](file:///coding/linkmind/frontend/src/store/index.ts#L263-L268) |
| 18 | 知识地图 | 删除地图 | DELETE | `/api/v1/maps/{map_id}`（待设计） | 未封装（内存态） | [store/index.ts L269-276](file:///coding/linkmind/frontend/src/store/index.ts#L269-L276) |
| 19 | 知识地图 | 查询整棵地图树 | GET | `/api/v1/maps/{map_id}/tree`（待设计） | 未封装（内存态） | [MindMapPage.tsx L27-41](file:///coding/linkmind/frontend/src/pages/MindMapPage.tsx#L27-L41) |
| 20 | 知识地图 | 整树批量保存 | PUT | `/api/v1/maps/{map_id}/tree`（待设计） | 未封装（内存态） | [store/index.ts L288-408](file:///coding/linkmind/frontend/src/store/index.ts#L288-L408) |
| 21 | 知识地图 | 地图导入落库 | POST | `/api/v1/maps/import`（待设计） | 未封装（内存态） | [Modals.tsx L462-480](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L462-L480) |
| 22 | 知识地图 | 地图导出 | GET | `/api/v1/maps/export`（待设计） | 未封装（内存态） | [store/index.ts L411-430](file:///coding/linkmind/frontend/src/store/index.ts#L411-L430) |
| 23 | 脑图节点编辑 | 新增子节点 | POST | `/api/v1/maps/{map_id}/nodes`（待设计） | 未封装（内存态） | [CtxMenu.tsx L42-53](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L42-L53) |
| 24 | 脑图节点编辑 | 重命名节点 | PUT | `/api/v1/maps/{map_id}/nodes/{node_id}`（待设计） | 未封装（内存态） | [CtxMenu.tsx L54-61](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L54-L61) |
| 25 | 脑图节点编辑 | 删除节点 | DELETE | `/api/v1/maps/{map_id}/nodes/{node_id}`（待设计） | 未封装（内存态） | [CtxMenu.tsx L62-72](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L62-L72) |
| 26 | 属性文档编辑 | 新增属性 | POST | `/api/v1/maps/{map_id}/nodes/{node_id}/props`（待设计） | 未封装（内存态） | [SideDrawer.tsx L22-30](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L22-L30) |
| 27 | 属性文档编辑 | 编辑属性 | PUT | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}`（待设计） | 未封装（内存态） | [SideDrawer.tsx L71-98](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L71-L98) |
| 28 | 属性文档编辑 | 删除属性 | DELETE | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}`（待设计） | 未封装（内存态） | [Modals.tsx L310-328](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L310-L328) |
| 29 | 文档内容编辑 | 读取笔记内容 | GET | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note`（待设计） | 未封装（内存态） | [SideDrawer.tsx L78-96](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L78-L96) |
| 30 | 文档内容编辑 | 保存笔记内容 | PUT | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note`（待设计） | 未封装（内存态） | [NotePage.tsx L95-128](file:///coding/linkmind/frontend/src/pages/NotePage.tsx#L95-L128) |
| 31 | 文档内容编辑 | 读取文档全文 | GET | `/api/v1/docs/content`（待设计） | 未封装（内存态） | [Modals.tsx L738-756](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L738-L756) |

- 「已调用」= 前端组件/store 中存在实际请求调用点；
- 「已封装未调用」= 前端 API 层已定义方法，但无组件调用点；
- 「未封装（内存态）」= 前端目前使用内存 store / 种子数据，数据不落库，隐含需要后端提供能力，接口路径为建议值（待双方商定）。

---

## 二、按模块分组详细说明

### 模块 A：Git 仓库管理（10 个已调用 + 2 个已封装未调用）

前端封装层：[features/git/api.ts](file:///coding/linkmind/frontend/src/features/git/api.ts#L66-L125)
状态管理层：[features/git/store.ts](file:///coding/linkmind/frontend/src/features/git/store.ts)
页面入口：[GitPage.tsx](file:///coding/linkmind/frontend/src/pages/GitPage.tsx#L36-L38)（挂载时 `load()` 拉取仓库列表）

#### A-1. 列出知识仓库

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/git/repos` |
| 请求参数 | 无 |
| 响应 data | `repos: list[GitRepo]`（前端解包 `result.data.repos`，见 [api.ts L68-69](file:///coding/linkmind/frontend/src/features/git/api.ts#L68-L69)） |
| 前端调用点 | [store.ts L73](file:///coding/linkmind/frontend/src/features/git/store.ts#L73)（`load`）；[Modals.tsx L417](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L417)（导入知识地图弹窗选择仓库） |
| 备注 | 后端已实现（[routes/git.py L31](file:///coding/linkmind/backend/src/routes/git.py#L31)）。注意 `data` 是 `{"repos": [...]}` 包裹结构而非裸数组 |

#### A-2. 查询单个仓库详情

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/git/repos/{repo_id}` |
| 请求参数 | `repo_id: str`（路径参数，必填） |
| 响应 data | `GitRepo` |
| 前端调用点 | [store.ts L93](file:///coding/linkmind/frontend/src/features/git/store.ts#L93)（`refresh` 刷新当前仓库状态） |
| 备注 | 后端已实现（[routes/git.py L48](file:///coding/linkmind/backend/src/routes/git.py#L48)） |

#### A-3. 登记（创建）知识仓库

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos` |
| 请求参数 | Body(JSON)：`name: str`（必填，≤30/120 字）；`fs_path: str`（必填，相对知识库根目录）；`init: bool`（必填，目录未初始化时是否执行 git init）；`remote_url: str \| None`（可选） |
| 响应 data | `GitRepo` |
| 前端调用点 | [RepoDialog.tsx L28-63](file:///coding/linkmind/frontend/src/features/git/components/RepoDialog.tsx#L28-L63)（登记仓库对话框，含目录浏览）；[Modals.tsx L636-641](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L636-L641)（导入流程内快速添加仓库） |
| 备注 | 后端已实现（[routes/git.py L37](file:///coding/linkmind/backend/src/routes/git.py#L37)）。仓库必须位于服务端 KNOWLEDGE_ROOT 内（[RepoDialog.tsx L177-179](file:///coding/linkmind/frontend/src/features/git/components/RepoDialog.tsx#L177-L179) 提示文案） |

#### A-4. 移除知识仓库

| 字段 | 内容 |
|------|------|
| 请求方法 | DELETE |
| 接口路径 | `/api/v1/git/repos/{repo_id}` |
| 请求参数 | `repo_id: str`（路径参数，必填） |
| 响应 data | `removed: bool` |
| 前端调用点 | [store.ts L109](file:///coding/linkmind/frontend/src/features/git/store.ts#L109)（`removeRepo`，GitPage 顶栏触发） |
| 备注 | 后端已实现（[routes/git.py L54](file:///coding/linkmind/backend/src/routes/git.py#L54)） |

#### A-5. 提交变更

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos/{repo_id}/commit` |
| 请求参数 | Body(JSON)：`message: str`（必填，提交说明）；`paths: list[str] \| undefined`（可选，勾选的文件路径列表）；`all: bool`（必填，是否提交全部变更文件） |
| 响应 data | `GitRepo`（前端用返回的仓库对象整体覆盖本地状态） |
| 前端调用点 | [GitPage.tsx L50-60](file:///coding/linkmind/frontend/src/pages/GitPage.tsx#L50-L60)（`doCommit` 组装 payload）→ [store.ts L125](file:///coding/linkmind/frontend/src/features/git/store.ts#L125) |
| 备注 | 后端已实现（[routes/git.py L60](file:///coding/linkmind/backend/src/routes/git.py#L60)）。`all=true` 时前端仍会传全部未冲突文件路径 |

#### A-6. 拉取远端

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos/{repo_id}/pull` |
| 请求参数 | 无 Body |
| 响应 data | `GitRepo` |
| 前端调用点 | [store.ts L135](file:///coding/linkmind/frontend/src/features/git/store.ts#L135)（GitPage 拉取按钮） |
| 备注 | 后端已实现（[routes/git.py L75](file:///coding/linkmind/backend/src/routes/git.py#L75)）。产生冲突时依赖响应中 `merging/conflicts` 字段驱动冲突面板 |

#### A-7. 推送远端

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos/{repo_id}/push` |
| 请求参数 | 无 Body |
| 响应 data | `GitRepo` |
| 前端调用点 | [store.ts L145](file:///coding/linkmind/frontend/src/features/git/store.ts#L145)（GitPage 推送按钮） |
| 备注 | 后端已实现（[routes/git.py L81](file:///coding/linkmind/backend/src/routes/git.py#L81)） |

#### A-8. 解决合并冲突

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos/{repo_id}/conflicts/resolve` |
| 请求参数 | Body(JSON)：`path: str`（必填，冲突文件路径）；`strategy: str`（必填，枚举 `'ours' \| 'theirs' \| 'content'`）；`content: str \| undefined`（strategy 为 `content` 时必填，手工编辑后的文件内容） |
| 响应 data | `GitRepo` |
| 前端调用点 | [store.ts L151-159](file:///coding/linkmind/frontend/src/features/git/store.ts#L151-L159)（`resolveConflict`）→ GitPage 冲突面板（[ConflictPanel.tsx](file:///coding/linkmind/frontend/src/features/git/components/ConflictPanel.tsx)） |
| 备注 | 后端已实现（[routes/git.py L87](file:///coding/linkmind/backend/src/routes/git.py#L87)）。冲突三方内容由 `GitConflict.ours/theirs/working` 提供 |

#### A-9. 继续合并

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos/{repo_id}/merge/continue` |
| 请求参数 | 无 Body |
| 响应 data | `GitRepo` |
| 前端调用点 | [store.ts L166](file:///coding/linkmind/frontend/src/features/git/store.ts#L166)（冲突面板「继续合并」） |
| 备注 | 后端已实现（[routes/git.py L102](file:///coding/linkmind/backend/src/routes/git.py#L102)） |

#### A-10. 中止合并

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/git/repos/{repo_id}/merge/abort` |
| 请求参数 | 无 Body |
| 响应 data | `GitRepo` |
| 前端调用点 | [store.ts L176](file:///coding/linkmind/frontend/src/features/git/store.ts#L176)（冲突面板「放弃合并」） |
| 备注 | 后端已实现（[routes/git.py L108](file:///coding/linkmind/backend/src/routes/git.py#L108)） |

#### A-11. 查询提交历史（已封装未调用）

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/git/repos/{repo_id}/log` |
| 请求参数 | Query：`page: int = 1`、`page_size: int = 20`（page≥1，page_size 1~100） |
| 响应 data | `Page[GitCommit]`：`{ total: int, items: list[GitCommit] }`（v1.2 联调修正；前端 [api.ts L122-131](file:///coding/linkmind/frontend/src/features/git/api.ts#L122-L131) 已按此后端契约调整，移除旧 `limit`/`data.log` 解析） |
| 前端调用点 | 无（提交历史当前由 `GitRepo.log` 内嵌返回，[HistoryPanels.tsx L13-28](file:///coding/linkmind/frontend/src/features/git/components/HistoryPanels.tsx#L13-L28) 直接读 `repo.log`） |
| 备注 | Q1 已随实现定稿：统一 page/page_size + total/items（评审 P3）。后端实现见 [git/router.py L159-170](file:///coding/linkmind/backend/app/api/v1/git/router.py#L159-L170) |

#### A-12. 查询 Git 动作记录（已封装未调用）

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/git/repos/{repo_id}/actions` |
| 请求参数 | Query：`page: int = 1`、`page_size: int = 60`（page≥1，page_size 1~100） |
| 响应 data | `Page[GitAction]`：`{ total: int, items: list[GitAction] }`（v1.2 联调修正；前端 [api.ts L133-142](file:///coding/linkmind/frontend/src/features/git/api.ts#L133-L142) 已同步） |
| 前端调用点 | 无（动作记录当前由 `GitRepo.actions` 内嵌返回，[HistoryPanels.tsx L31-51](file:///coding/linkmind/frontend/src/features/git/components/HistoryPanels.tsx#L31-L51) 直接读 `repo.actions`） |
| 备注 | Q1 已随实现定稿：统一 page/page_size + total/items（评审 P3）。后端实现见 [git/router.py L173-186](file:///coding/linkmind/backend/app/api/v1/git/router.py#L173-L186) |

#### Git 模块响应数据模型（Pydantic 风格）

来源：[features/git/types.ts](file:///coding/linkmind/frontend/src/features/git/types.ts)

```python
class GitFileState(str, Enum):
    """types.ts L1-9"""
    modified = "modified"    # 已修改
    added = "added"          # 新增
    deleted = "deleted"      # 删除
    untracked = "untracked"  # 未跟踪
    conflict = "conflict"    # 冲突
    renamed = "renamed"      # 重命名
    copied = "copied"        # 复制
    changed = "changed"      # 变更（语义待确认，见 Q6）

class GitFile(BaseModel):        # types.ts L11-17
    path: str                    # 文件相对路径
    code: str                    # git 状态码（含义待确认，见 Q6）
    state: GitFileState          # 归一化状态
    staged: bool                 # 是否已暂存
    conflict: bool               # 是否处于冲突

class GitConflict(BaseModel):    # types.ts L19-24
    path: str                    # 冲突文件路径
    ours: str                    # 本地版本内容
    theirs: str                  # 远端版本内容
    working: str                 # 工作区当前内容

class GitCommit(BaseModel):      # types.ts L26-32
    hash: str
    short_hash: str
    author: str
    date: datetime               # ISO 8601（v1.2 联调确认，如 2026-11-27T01:31:53Z）
    subject: str

class GitAction(BaseModel):      # types.ts L34-41
    id: str                      # uuid 字符串（v1.2 修正：原前端误标 int）
    ts: datetime                 # ISO 8601（v1.2 联调确认）
    action: str                  # 动作类型（commit/pull/push/... 由 labels.ts 映射展示名）
    message: str
    files: list[str]
    ok: bool                     # 动作是否成功

class GitCounts(BaseModel):      # types.ts L43-49
    total: int
    staged: int
    unstaged: int
    untracked: int
    conflict: int

class GitRepo(BaseModel):        # types.ts L51-67
    id: str
    name: str
    path: str                    # 显示用路径（前端展示 r.path，Modals.tsx L527）
    fs_path: str                 # 文件系统真实路径
    branch: str
    upstream: str | None
    ahead: int
    behind: int
    remote: str | None
    merging: bool                # 是否处于合并中
    files: list[GitFile]
    conflicts: list[GitConflict]
    counts: GitCounts
    log: list[GitCommit]         # 内嵌提交历史
    actions: list[GitAction]     # 内嵌动作记录

class GitRepoCreatePayload(BaseModel):   # types.ts L69-74（请求体）
    name: str
    fs_path: str
    init: bool
    remote_url: str | None

class GitCommitPayload(BaseModel):       # types.ts L76-80（请求体）
    message: str
    paths: list[str] | None
    all: bool

ResolveStrategy = Literal['ours', 'theirs', 'content']   # types.ts L82
```

---

### 模块 B：文件系统（知识库目录扫描，2 个已调用）

前端封装层：[utils/api.ts](file:///coding/linkmind/frontend/src/utils/api.ts)、[git/api.ts L123-125](file:///coding/linkmind/frontend/src/features/git/api.ts#L123-L125)

#### B-1. 列出知识库子目录

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/fs/dirs` |
| 请求参数 | Query：`path: str`（可选，空串/缺省表示知识库根目录；相对路径，后端需拦截路径遍历越权） |
| 响应 data | `FsDirListing` |
| 前端调用点 | [RepoDialog.tsx L28](file:///coding/linkmind/frontend/src/features/git/components/RepoDialog.tsx#L28)（登记仓库时的目录浏览器，初始传 `''`）；[Modals.tsx L433](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L433)（导入弹窗进入仓库根目录，传 `repo.fs_path`）；[Modals.tsx L447](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L447)（导入弹窗目录逐级下钻/上一级） |
| 备注 | 后端已实现（[routes/fs.py L70](file:///coding/linkmind/backend/src/routes/fs.py#L70)）。前端依赖 `parent: null` 判断"已是根目录、禁用上一级"（[Modals.tsx L576-579](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L576-L579)） |

#### B-2. 扫描目录生成知识树

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/fs/tree` |
| 请求参数 | Query：`path: str`（必填，目标目录路径，来自 `fs/dirs` 返回的 `listing.path`；后端需拦截路径遍历） |
| 响应 data | `FsTreeNode`（递归树） |
| 前端调用点 | [utils/api.ts L19-26](file:///coding/linkmind/frontend/src/utils/api.ts#L19-L26)（`fetchFsTree`）→ [Modals.tsx L469](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L469)（`onImport` 导入知识地图） |
| 备注 | 后端已实现（[routes/fs.py L120](file:///coding/linkmind/backend/src/routes/fs.py#L120)）。前端用 `mapFromTree`（[Modals.tsx L738-765](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L738-L765)）把树转成脑图：目录名 → 节点名，md 文档 → 属性（`props[].label`、`props[].content` 填入笔记正文，`props[].path` 填入备注，`doc=true` 标记文档属性） |

#### FS 模块响应数据模型（Pydantic 风格）

```python
class FsDirEntry(BaseModel):     # git/types.ts L84-89
    name: str                    # 目录名
    path: str                    # 相对知识库根目录的路径
    hasChildren: bool            # 是否含子目录
    mdCount: int                 # 该目录下 md 文档数

class FsDirListing(BaseModel):   # git/types.ts L91-98
    rootName: str                # 知识库根目录名称
    path: str                    # 当前目录路径
    name: str                    # 当前目录名
    parent: str | None           # 上一级目录路径；None 表示当前已是根目录
    dirs: list[FsDirEntry]
    mdCount: int                 # 当前目录 md 文档数

class FsTreeNodeProp(BaseModel): # utils/api.ts L15
    label: str                   # 文档标题（md 文件名去后缀）
    content: str | None          # 文档内容（是否截断待确认，见 Q2）
    path: str | None             # 文档相对路径
    doc: bool | None             # 是否为文档属性
    truncated: bool = False      # content 是否被截断（v1.1 评审补充 P11，见 Q2）
    content_length: int = 0      # 文档原始总长度（v1.1 评审补充 P11）

class FsTreeNode(BaseModel):     # utils/api.ts L12-17（递归）
    name: str                    # 目录名（根节点=目录名，作为地图标题）
    path: str
    props: list[FsTreeNodeProp] | None   # 目录下 md 文档转出的属性
    children: list["FsTreeNode"] | None  # 子目录
```

---

### 模块 C：知识地图持久化（8 个待设计）

> **现状**：前端 Zustand store（[store/index.ts](file:///coding/linkmind/frontend/src/store/index.ts)）中全部知识地图数据来源于硬编码种子数据 `SEED_MAPS`（[config/maps.ts L18-124](file:///coding/linkmind/frontend/src/config/maps.ts#L18-L124)）。
> 地图、节点、属性（含笔记）的增删改全部只发生在内存中（深拷贝 `JSON.parse(JSON.stringify(...))`），
> **页面刷新即丢失，无任何后端读写调用**。以下接口为前端数据模型隐含需要的能力，路径为 RESTful 建议值，需与现有设计文档（[03_API接口文档.md](file:///coding/linkmind/docs/03_API接口文档.md)）对齐后再定稿。

#### C-1. 地图列表

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/maps`（建议） |
| 请求参数 | 无（或 Query：`keyword: str` 用于首页搜索） |
| 响应 data | `items: list[TreeMapSummary]` |
| 数据来源（前端行为） | 首页地图网格 [HomePage.tsx L21-65](file:///coding/linkmind/frontend/src/pages/HomePage.tsx#L21-L65)；初始化种子数据 [store/index.ts L143-147](file:///coding/linkmind/frontend/src/store/index.ts#L143-L147) |
| 备注 | `TreeMapSummary` 含 `id: str, title: str, desc: str, node_count: int, prop_count: int, repo: RepoRef | None`（首页卡片展示节点数/属性数/仓库名，[HomePage.tsx L34-42](file:///coding/linkmind/frontend/src/pages/HomePage.tsx#L34-L42)） |

#### C-2. 创建地图

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/maps`（建议） |
| 请求参数 | Body(JSON)：`title: str`（必填，≤30 字）；`desc: str`（可选，≤80 字） |
| 响应 data | `TreeMap` |
| 数据来源（前端行为） | `createMap` [store/index.ts L251-262](file:///coding/linkmind/frontend/src/store/index.ts#L251-L262)；弹窗校验 [Modals.tsx L128-139](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L128-L139) |
| 备注 | 前端校验：名称必填、≤30 字、全局同名不可重复 |

#### C-3. 更新地图元信息

| 字段 | 内容 |
|------|------|
| 请求方法 | PUT |
| 接口路径 | `/api/v1/maps/{map_id}`（建议） |
| 请求参数 | `map_id: str`（路径参数）；Body(JSON)：`title: str`（可选）；`desc: str`（可选）；`repo: RepoRef | None`（可选，绑定的知识仓库） |
| 响应 data | `TreeMap` |
| 数据来源（前端行为） | `updateMap` [store/index.ts L263-268](file:///coding/linkmind/frontend/src/store/index.ts#L263-L268)；编辑地图弹窗 [Modals.tsx L128-139](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L128-L139) |
| 备注 | `RepoRef = { id: str, name: str }`（[types/index.ts L21-24](file:///coding/linkmind/frontend/src/types/index.ts#L21-L24)），导入地图时由 `mapFromTree` 写入（[Modals.tsx L761](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L761)） |

#### C-4. 删除地图

| 字段 | 内容 |
|------|------|
| 请求方法 | DELETE |
| 接口路径 | `/api/v1/maps/{map_id}`（建议） |
| 请求参数 | `map_id: str`（路径参数） |
| 响应 data | `removed: bool` |
| 数据来源（前端行为） | `deleteMap` [store/index.ts L269-276](file:///coding/linkmind/frontend/src/store/index.ts#L269-L276)；删除确认弹窗 [Modals.tsx L102-123](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L102-L123) |
| 备注 | 前端提示"删除后无法恢复"（当前仅删内存，若后端删除是否级联处理文档需确认，见 Q8） |

#### C-5. 查询整棵地图树

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/maps/{map_id}/tree`（建议） |
| 请求参数 | `map_id: str`（路径参数） |
| 响应 data | `TreeMap`（含完整递归节点树） |
| 数据来源（前端行为） | 进入脑图页 `enterMap` [MindMapPage.tsx L27-33](file:///coding/linkmind/frontend/src/pages/MindMapPage.tsx#L27-L33)；画布渲染 `build(map, collapsed)` [MindMapPage.tsx L38-41](file:///coding/linkmind/frontend/src/pages/MindMapPage.tsx#L38-L41) |
| 备注 | 前端画布/抽屉/搜索均基于整棵递归树，进入第二屏时必须一次性拿到全量树数据 |

#### C-6. 整树批量保存

| 字段 | 内容 |
|------|------|
| 请求方法 | PUT |
| 接口路径 | `/api/v1/maps/{map_id}/tree`（建议） |
| 请求参数 | `map_id: str`（路径参数）；Body(JSON)：完整 `TreeMap.nodes`（递归树） |
| 响应 data | `TreeMap` |
| 数据来源（前端行为） | 节点增删改：`addNode` [store/index.ts L288-309](file:///coding/linkmind/frontend/src/store/index.ts#L288-L309)、`renameNode` [L310-327](file:///coding/linkmind/frontend/src/store/index.ts#L310-L327)、`deleteNode` [L328-349](file:///coding/linkmind/frontend/src/store/index.ts#L328-L349)；属性增删改：`addProp` [L352-370](file:///coding/linkmind/frontend/src/store/index.ts#L352-L370)、`updateProp` [L371-389](file:///coding/linkmind/frontend/src/store/index.ts#L371-L389)、`deleteProp` [L390-408](file:///coding/linkmind/frontend/src/store/index.ts#L390-L408) |
| 备注 | **备选方案**：前端所有操作都是对整树的不可变替换，天然适合整树保存；若采用模块 D/E/F 的细粒度接口，则本接口可作为"画布拖拽/批量操作后的统一落库通道"保留，二者需二选一或明确分工。**与 D/E/F 为互斥方案，决议（Q9 / 评审 P2）前冻结持久层开发** |

#### C-7. 地图导入落库

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/maps/import`（建议） |
| 请求参数 | Body(JSON)：`repo_id: str`；`path: str`（选中的仓库目录）；或直接提交转换后的 `TreeMap` |
| 响应 data | `TreeMap` |
| 数据来源（前端行为） | 导入流程 [Modals.tsx L462-480](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L462-L480)：`fetchFsTree` → `mapFromTree` → `importMap`（[store/index.ts L277-285](file:///coding/linkmind/frontend/src/store/index.ts#L277-L285)，同名地图拒绝重复导入） |
| 备注 | 当前仅内存追加。落库时需明确：同名去重规则（title 判断，store L279）、节点 id 生成（前端 uuid，[Modals.tsx L7](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L7)）与后端主键的关系 |

#### C-8. 地图导出

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/maps/export`（建议，或维持纯前端实现） |
| 请求参数 | 无 |
| 响应 data | `{ app: str, version: int, exportedAt: datetime, maps: list[TreeMap] }` |
| 数据来源（前端行为） | `exportMaps` [store/index.ts L411-430](file:///coding/linkmind/frontend/src/store/index.ts#L411-L430)：纯前端 Blob 下载 `linkmind-maps.json` |
| 备注 | 现为纯前端实现，无后端依赖；是否需要服务端备份/跨端导出待定（见 Q10） |

---

### 模块 D：脑图节点编辑（第二屏右键菜单，3 个待设计）

> **现状**：第二屏（脑图页）节点增删改全部走内存 store（深拷贝整树后原地替换），操作入口为画布右键菜单 [CtxMenu.tsx](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L34-L84) → 弹窗 [Modals.tsx NodeModal](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L168-L273) → store action。
> 若采用细粒度接口（而非 C-6 整树保存），需要以下三个接口。
> **特殊约定**：`node_id = 'ROOT'` 为虚拟根节点（[types/index.ts L60](file:///coding/linkmind/frontend/src/types/index.ts#L60)）——根节点即地图标题，重命名 ROOT 等价于更新地图 title（[Modals.tsx L227-231](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L227-L231)），根节点不可删除（[CtxMenu.tsx L64](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L64) 禁用按钮）。

#### D-1. 新增子节点

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/maps/{map_id}/nodes`（建议） |
| 请求参数 | `map_id: str`（路径参数）；Body(JSON)：`parent_id: str`（必填，`'ROOT'` 表示挂地图根级，否则为具体节点 id）；`name: str`（必填，≤30 字，同级不可重名） |
| 响应 data | `node: TreeNode`（含后端生成的节点 id） |
| 数据来源（前端行为） | 右键菜单「新增子节点」[CtxMenu.tsx L42-53](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L42-L53) → 弹窗 [Modals.tsx L191-217](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L191-L217)（父节点名回显、同级重名校验）→ `addNode` [store/index.ts L288-309](file:///coding/linkmind/frontend/src/store/index.ts#L288-L309) |
| 备注 | 节点 id 现由前端 uuid 生成（store L289）；落库后应由后端统一生成 id 并返回，前端画布的折叠/选中/父子关系均以 id 为主键 |

#### D-2. 重命名节点

| 字段 | 内容 |
|------|------|
| 请求方法 | PUT |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}`（建议） |
| 请求参数 | `map_id: str`、`node_id: str`（路径参数，`node_id='ROOT'` 表示地图标题）；Body(JSON)：`name: str`（必填，≤30 字，同级不可重名） |
| 响应 data | `node: TreeNode` 或 `TreeMap` |
| 数据来源（前端行为） | 右键菜单「修改节点」[CtxMenu.tsx L54-61](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L54-L61) → 弹窗 [Modals.tsx L219-247](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L219-L247) → `renameNode` [store/index.ts L310-327](file:///coding/linkmind/frontend/src/store/index.ts#L310-L327) |
| 备注 | `node_id='ROOT'` 时前端直接调 `updateMap` 改 title（[Modals.tsx L227-231](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L227-L231)），后端应支持该语义或由前端改调 C-3 |

#### D-3. 删除节点

| 字段 | 内容 |
|------|------|
| 请求方法 | DELETE |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}`（建议） |
| 请求参数 | `map_id: str`、`node_id: str`（路径参数） |
| 响应 data | `removed: bool` 或更新后的 `TreeMap` |
| 数据来源（前端行为） | 右键菜单「删除节点」[CtxMenu.tsx L62-72](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L62-L72) → 弹窗 [Modals.tsx L249-270](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L249-L270) → `deleteNode` [store/index.ts L328-349](file:///coding/linkmind/frontend/src/store/index.ts#L328-L349) |
| 备注 | **级联删除**：该节点的所有子节点与属性一并删除（弹窗文案 [Modals.tsx L263-267](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L263-L267)）；删除后前端把选中态重置为 ROOT（store L345） |

---

### 模块 E：属性与文档编辑（第二屏属性抽屉，3 个待设计）

> **现状**：属性（笔记）的增删改入口为属性抽屉「＋ 新增属性」[SideDrawer.tsx L22-30、L105-107](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L22-L30) 与右键菜单「属性编辑」（[CtxMenu.tsx L74-82](file:///coding/linkmind/frontend/src/features/mindmap/CtxMenu.tsx#L74-L82)）→ 弹窗 [Modals.tsx PropModal](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L276-L380) → store action，全部内存操作。
> **特殊约定**：`node_id = 'ROOT'` 时属性挂在地图级 `TreeMap.props` 上（store [L357-359](file:///coding/linkmind/frontend/src/store/index.ts#L357-L359)、[L377-379](file:///coding/linkmind/frontend/src/store/index.ts#L377-L379)、[L396-398](file:///coding/linkmind/frontend/src/store/index.ts#L396-L398)）。
> 属性分两类：普通笔记属性（`doc=false/undefined`，内容为手写笔记）与文档属性（`doc=true`，来自导入的 md 文档，`note.r` 存文档路径）。

#### E-1. 新增属性

| 字段 | 内容 |
|------|------|
| 请求方法 | POST |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}/props`（建议） |
| 请求参数 | `map_id: str`、`node_id: str`（路径参数，`'ROOT'` 表示根级属性）；Body(JSON)：`label: str`（必填，≤30 字）；`note: NotePayload`（必填：`c: str` 正文 ≤500 字、`t: list[str]` 标签、`r: str` 备注 ≤60 字） |
| 响应 data | `prop: TreeNodeProp`（含后端生成的稳定 `prop_id: str`，uuid，见 Q12 / 评审 P10） |
| 数据来源（前端行为） | 属性抽屉 [SideDrawer.tsx L22-30](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L22-L30) → 弹窗 [Modals.tsx L331-344](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L331-L344)（标签按 `,，、空格` 拆分）→ `addProp` [store/index.ts L352-370](file:///coding/linkmind/frontend/src/store/index.ts#L352-L370) |
| 备注 | 前端校验：属性名必填 ≤30 字、正文 ≤500 字（[Modals.tsx L332-335](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L332-L335)） |

#### E-2. 编辑属性

| 字段 | 内容 |
|------|------|
| 请求方法 | PUT |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}`（建议） |
| 请求参数 | 路径参数同上 + `prop_id: str`；Body(JSON)：`label: str`、`note: NotePayload`（结构同 E-1） |
| 响应 data | `prop: TreeNodeProp`（含 `prop_id: str`） |
| 数据来源（前端行为） | 属性卡片「编辑」[SideDrawer.tsx L71-98](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L71-L98) → 弹窗回填 [Modals.tsx L290-306](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L290-L306) → `updateProp` [store/index.ts L371-389](file:///coding/linkmind/frontend/src/store/index.ts#L371-L389) |
| 备注 | 当前前端以 **propIndex 数组索引**定位属性（弹窗 L341、笔记页 URL），若后端改用稳定 prop_id 需同步改造（见 Q12）；文档属性（`doc=true`）编辑后是否需 git 提交回知识仓库见 Q9 |

#### E-3. 删除属性

| 字段 | 内容 |
|------|------|
| 请求方法 | DELETE |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}`（建议） |
| 请求参数 | 路径参数同上 + `prop_id: str` |
| 响应 data | `removed: bool` |
| 数据来源（前端行为） | 属性卡片「删除」→ 弹窗 [Modals.tsx L310-328](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L310-L328)（确认文案含"及其笔记内容"）→ `deleteProp` [store/index.ts L390-408](file:///coding/linkmind/frontend/src/store/index.ts#L390-L408) |
| 备注 | 删除文档属性（`doc=true`）是否同时删除知识仓库中的 md 文件（或仅解除关联）需明确（见 Q8/Q9） |

---

### 模块 F：文档内容编辑模式（第三屏笔记页，3 个待设计）

> **现状**：笔记页 [NotePage.tsx](file:///coding/linkmind/frontend/src/pages/NotePage.tsx#L50-L170) 支持两种模式——`mode=view` 预览（MarkdownView）/ `mode=edit` 编辑（Vditor ir 即时渲染）。
> 进入方式：属性抽屉「查看笔记」链接 [SideDrawer.tsx L78-96](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L78-L96) 跳转 `/note?title=...&node=...&md=...&mapId=...&nodeId=...&propIndex=...&mode=view`，
> **笔记全文 Markdown 经 URL query 传递**（`encodeURIComponent` 整篇文档）。
> 「保存到脑图」把 Vditor 内容经 `parseNoteMarkdown`（[NotePage.tsx L17-42](file:///coding/linkmind/frontend/src/pages/NotePage.tsx#L17-L42)）反解析为 `{content, tags, remark}` 写回内存 store（L115-118），**刷新即丢**。

#### F-1. 读取笔记内容

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note`（建议） |
| 请求参数 | `map_id: str`、`node_id: str`（`'ROOT'` 支持根级属性）、`prop_id: str`（路径参数） |
| 响应 data | `{ label: str, node_path: str, content: str, tags: list[str], remark: str, doc: bool, doc_path: str \| None }`（`node_path` 为"所属节点"层级路径，前端用 ` > ` 分隔展示，[NotePage.tsx L134-137](file:///coding/linkmind/frontend/src/pages/NotePage.tsx#L134-L137)） |
| 数据来源（前端行为） | [SideDrawer.tsx L78-96](file:///coding/linkmind/frontend/src/features/mindmap/SideDrawer.tsx#L78-L96)（`onOpenNote` 组装跳转参数）；[NotePage.tsx L51-59](file:///coding/linkmind/frontend/src/pages/NotePage.tsx#L51-L59)（从 URL 读 title/node/md/mapId/nodeId/propIndex/mode） |
| 备注 | 接口化后 URL 只需携带 `mapId/nodeId/propId/mode`，md 全文改为按 id 拉取，规避 URL 长度限制（见 Q13）；`markdownize` 拼装的 `# 标题 / **标签**：… / **备注**：…` 约定行由本接口返回的结构化字段替代 |

#### F-2. 保存笔记内容

| 字段 | 内容 |
|------|------|
| 请求方法 | PUT |
| 接口路径 | `/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note`（建议） |
| 请求参数 | 路径参数同 F-1；Body(JSON)：`content: str`（必填，Markdown 全文）；`tags: list[str]`（可选）；`remark: str`（可选） |
| 响应 data | `prop: TreeNodeProp` 或 `TreeMap` |
| 数据来源（前端行为） | 「保存到脑图」[NotePage.tsx L95-128](file:///coding/linkmind/frontend/src/pages/NotePage.tsx#L95-L128)：`vditorRef.getValue()` 取全文 → `parseNoteMarkdown`（L17-42，把 `**标签**：a, b` / `**备注**：xxx` 约定行反解析回 `{content, tags, remark}`）→ `updateProp` 写回内存 store |
| 备注 | 保存成功后前端切回预览模式（L121）；文档属性（`doc=true`）保存后是否回写知识仓库 md 文件并触发 git 提交，见 Q9 |

#### F-3. 读取文档全文

| 字段 | 内容 |
|------|------|
| 请求方法 | GET |
| 接口路径 | `/api/v1/docs/content`（建议） |
| 请求参数 | Query：`path: str`（必填，文档相对知识库根目录/仓库的路径；可另加 `repo_id: str` 约定仓库归属；后端需拦截路径遍历） |
| 响应 data | `{ path: str, name: str, content: str }`（`content` 为 md 全文） |
| 数据来源（前端行为） | 文档属性（`doc=true`）的「查看笔记」：内容目前来自导入时 `fs/tree` 内联的 `props[].content`（[Modals.tsx L742-746](file:///coding/linkmind/frontend/src/features/mindmap/Modals.tsx#L742-L746)），之后经 URL 传入笔记页 |
| 备注 | 为 `fs/tree` 截断问题（Q2）的兜底通道：目录扫描只返回摘要/前 N 字，点开笔记时按需拉全文；路径越权校验必须与 `/fs/tree` 同标准。路径设计建议（评审 P13）：可改为 `GET /api/v1/docs/{doc_path:path}/content` 层级风格 |

---

### 知识地图数据模型（Pydantic 风格）

来源：[types/index.ts](file:///coding/linkmind/frontend/src/types/index.ts)

```python
class NotePayload(BaseModel):      # types/index.ts L1-5
    c: str                         # 笔记正文（Markdown，属性弹窗限 ≤500 字）
    t: list[str]                   # 标签列表
    r: str                         # 备注（文档属性时存文档相对路径）

class TreeNodeProp(BaseModel):     # types/index.ts L7-12（后端定稿模型）
    prop_id: str | None            # 后端生成的稳定主键（uuid），替代数组索引定位（Q12 / 评审 P10）
    label: str                     # 属性名（≤30 字）
    note: NotePayload
    doc: bool | None               # 是否来自导入的文档属性
    path: str | None               # 文档相对路径

class TreeNode(BaseModel):         # types/index.ts L14-19（递归）
    id: str                        # 前端 uuid；'ROOT' 为虚拟根，等价于地图 title
    name: str                      # 节点名（≤30 字，同级不重名）
    props: list[TreeNodeProp]
    children: list["TreeNode"]

class RepoRef(BaseModel):          # types/index.ts L21-24
    id: str
    name: str

class TreeMap(BaseModel):          # types/index.ts L26-33
    id: str
    title: str                     # 地图名（=根节点名，≤30 字，全局不重名）
    desc: str | None               # 描述（≤80 字）
    props: list[TreeNodeProp]      # 根级属性（nodeId='ROOT' 时的属性挂载点）
    nodes: list[TreeNode]          # 一级节点列表
    repo: RepoRef | None           # 关联知识仓库
```

### 存储映射建议（PostgreSQL，v1.1 评审补充）

> 仅列建议，最终以模块 C/D/E/F 方案决议（Q9 / 评审 P2）后定稿。

```python
# maps 表
id: uuid (PK)                    # TreeMap.id
title: varchar(30) unique        # 全局不重名
desc: varchar(80)
repo_id: uuid (FK, nullable)     # RepoRef.id → git_repos.id
created_at / updated_at: timestamptz

# nodes 关系表方案（与细粒度接口 D/E/F 匹配）
id: uuid (PK)                    # TreeNode.id（'ROOT' 为前端虚拟约定，不落库）
map_id: uuid (FK)
parent_id: uuid (FK, nullable)   # null = 一级节点
name: varchar(30)
sort_order: int
created_at / updated_at: timestamptz

# props 关系表方案（prop_id 为主键，替代数组索引，Q12）
id: uuid (PK)
map_id: uuid (FK)
node_id: uuid (FK, nullable)     # null = 挂在地图级（nodeId='ROOT'）
label: varchar(30)
note_content: text               # NotePayload.c（Markdown）
note_tags: jsonb                 # NotePayload.t
note_remark: varchar(60)         # NotePayload.r
doc: boolean
doc_path: varchar                # 文档相对路径
created_at / updated_at: timestamptz

# 备选：nodes 整树 jsonb 方案（与整树接口 C-6 匹配，牺牲关系查询能力）
# tree: jsonb —— 与关系表方案二选一，随 Q9 / 评审 P2 决议
```

---

## 三、待确认问题

> 全部 13 项待确认问题（Q1–Q13）已提取至 **[16_待确认问题.md](./16_待确认问题.md)**，
> 后续结合具体功能场景逐项答复并回填「答复」字段，本节仅保留索引，不再展开明细。

| 编号 | 一句话主题 | 状态 |
|------|------------|------|
| Q1 | Git 历史接口冗余（内嵌 vs 独立查询） | 待确认 |
| Q2 | fs/tree 文档内容返回全文还是摘要 | 待确认 |
| Q3 | fs/dirs 的 path 参数口径与越权拦截 | 待确认 |
| Q4 | fs/dirs 与 fs/tree 的 path 口径一致性 | 待确认 |
| Q5 | GET /git/repos 响应包裹结构不统一 | 待确认 |
| Q6 | GitFile.code 字段语义未确认 | 待确认 |
| Q7 | Git 时间字段无格式约定 | 待确认 |
| Q8 | 删除操作与知识仓库文件的联动关系 | 待确认 |
| Q9 | 笔记保存方案（整树 vs 细粒度 / 是否回写仓库） | 待确认 |
| Q10 | 地图导出是否需要服务端闭环 | 待确认 |
| Q11 | 鉴权体系与匿名访问策略 | 待确认 |
| Q12 | 属性以 propIndex 索引定位、缺稳定主键 | 待确认 |
| Q13 | 笔记全文经 URL query 传递的长度与安全风险 | 待确认 |

---

## 四、附录

### 4.1 前端未调用、但后端已存在的接口（供核对，不属于本次前端需求）

后端（[backend/src/main.py L76-85](file:///coding/linkmind/backend/src/main.py#L76-L85)）还挂载了以下路由，前端当前均未调用：

| 模块 | 接口 | 后端位置 |
|------|------|----------|
| Health | GET `/api/v1/health`、`/api/v1/health/neo4j`、`/api/v1/health/postgres` | [routes/health.py](file:///coding/linkmind/backend/src/routes/health.py#L9-L20) |
| Note | POST/GET/PUT/DELETE `/api/v1/note*` | [routes/note.py](file:///coding/linkmind/backend/src/routes/note.py#L15-L49) |
| Link | POST/GET/PUT/DELETE `/api/v1/link*` | [routes/link.py](file:///coding/linkmind/backend/src/routes/link.py#L15-L49) |
| Import | POST `/api/v1/markdown` | [routes/markdown_import.py](file:///coding/linkmind/backend/src/routes/markdown_import.py#L14) |
| Graph | GET `/api/v1/graph/` | [routes/graph.py](file:///coding/linkmind/backend/src/routes/graph.py#L8) |
| Expand | GET/POST `/api/v1/expand/neighborhood`、`/api/v1/expand/path` | [routes/expand.py](file:///coding/linkmind/backend/src/routes/expand.py#L21-L61) |
| Search | GET/POST `/api/v1/search/fulltext`、`/api/v1/search/filter`、`/api/v1/search/review/*` | [routes/search.py](file:///coding/linkmind/backend/src/routes/search.py#L29-L110) |
| Cluster | POST `/api/v1/cluster/louvain`、GET `/api/v1/cluster/statistics` | [routes/cluster.py](file:///coding/linkmind/backend/src/routes/cluster.py#L8-L20) |

### 4.2 请求封装约定（影响所有接口）

- **统一包裹**：所有响应必须是 `{code, msg, data}`，`code === 200` 视为成功；非 200 时前端取 `msg` 直接抛错展示（[git/api.ts L55-58](file:///coding/linkmind/frontend/src/features/git/api.ts#L55-L58)、[utils/api.ts L24](file:///coding/linkmind/frontend/src/utils/api.ts#L24)）。
- **错误兜底**：网络失败（fetch 异常）提示"无法连接后端服务"（status 0）；JSON 解析失败提示"服务响应格式异常"（[git/api.ts L41-53](file:///coding/linkmind/frontend/src/features/git/api.ts#L41-L53)）。
- **Content-Type**：所有请求固定 `application/json`（[git/api.ts L38](file:///coding/linkmind/frontend/src/features/git/api.ts#L38)）。
- **基础地址**：前端统一走 `VITE_API_BASE_URL`（缺省 `/api/v1`）。开发环境 [.env.development](file:///coding/linkmind/frontend/.env.development#L3) 默认直连 `http://localhost:8000/api/v1`（需后端 CORS 放行 5173）；将变量改为 `/api/v1` 时则走 Vite `server.proxy`。生产由 nginx 同源转发。
- **错误码映射（v1.1 评审补充）**：HTTP 200 且 `code=200` 成功；HTTP 400 业务规则错误、404 资源不存在、500 服务器异常，body 均为 `{code, msg, data: null}`；HTTP 422 为参数校验失败（`code=422`，`msg` 含校验明细）。前端 `request()` 以 `code !== 200` 判错并以 HTTP status 兜底，与该映射兼容。
- **鉴权（预留）**：当前匿名访问（Q11 待确认）；请求头预留 `Authorization: Bearer <JWT>` 位置，引入鉴权后需补充 401/403 场景定义。
- **字段命名（v1.1 评审补充）**：存量响应混用两种风格——fs 模块 camelCase（`rootName/hasChildren/mdCount`）、git 模块 snake_case（`fs_path/short_hash`）。新接口一律 snake_case；存量由后端 Pydantic v2 `alias_generator` 过渡兼容，统一时机随持久化改造确定。
- **动作类端点（v1.1 评审补充）**：`/commit`、`/pull`、`/push`、`/conflicts/resolve`、`/merge/*`、`/maps/import` 为 RPC 风格子资源（POST、非幂等），与 CRUD 端点并存属有意设计。

### 4.3 统计信息

| 统计项 | 数量 | 说明 |
|--------|------|------|
| 前端已调用接口 | 12 | Git 仓库 4 + Git 操作与冲突 6 + 文件系统 2；后端均已实现（v1.1 修正，原误记 10） |
| 已封装未调用 | 2 | git/log、git/actions（历史数据随 GitRepo 内嵌返回） |
| 现有接口合计 | 14 | 上述两项之和 |
| 知识地图持久化（模块 C） | 8 | 地图 CRUD、整树读写、导入落库、导出（第一屏 + 跨屏基础） |
| 脑图节点编辑（模块 D） | 3 | 新增子节点 / 重命名 / 级联删除（第二屏右键菜单） |
| 属性文档编辑（模块 E） | 3 | 属性新增 / 编辑 / 删除（第二屏属性抽屉） |
| 文档内容编辑（模块 F） | 3 | 笔记读取 / 笔记保存 / 文档全文拉取（第三屏笔记页） |
| **待设计接口合计** | **17** | 模块 C+D+E+F，前端现为内存态 + 种子数据 |
| 存疑项 | 13 | 详见 [16_待确认问题.md](./16_待确认问题.md) |

### 4.4 主要风险点

1. **知识地图数据不落库（最高风险）**：全部地图/节点/属性/笔记操作仅存在于 Zustand 内存（[store/index.ts](file:///coding/linkmind/frontend/src/store/index.ts)），刷新即丢，种子数据硬编码（[config/maps.ts](file:///coding/linkmind/frontend/src/config/maps.ts#L18-L124)）。模块 C/D/E/F 共 17 个接口是第二屏编辑与第三屏笔记可用的前提。
2. **持久化方案二选一未决**：整树批量保存（C-6）与细粒度节点/属性/笔记接口（D/E/F）并存，需尽快确定采用哪种（或明确分工：细粒度走 D/E/F、画布批量操作走 C-6），否则前端 store 改造方向不定。
3. **属性以数组索引定位**（Q12）：`propIndex` 无法作为持久层主键，属性删除/插入后索引漂移会导致编辑错位，必须引入稳定 `prop_id` 并改造前端。
4. **笔记全文经 URL 传递**（Q13）：长文档会被 URL 长度限制截断，链接分享/刷新携带全文，需接口化（F-1）。
5. **前后端数据模型脱节**：后端已有 note/link/graph/search 等面向 Neo4j 图谱的接口，但前端脑图走的是完全不同的递归树模型，两套模型之间没有映射层。
6. **fs/tree 的文档内容体量不可控**：目录下 md 文档全部内联进树响应（Q2），大知识库会造成响应膨胀，需确认截断或懒加载策略（F-3 兜底）。
7. **Git 历史接口冗余**（Q1）：log/actions 双通道（内嵌 + 独立查询）易造成数据口径不一致。
8. **无鉴权体系**（Q11）：所有接口匿名可访问，Git 写操作（commit/push）暴露在无认证的 HTTP 接口上，安全策略需明确。

---

## 五、变更记录

| 版本 | 日期 | 变更内容 | 依据 |
|------|------|----------|------|
| v1.0 | 2026-11-26 | 初稿：31 项接口梳理（现有 14 + 待设计 17）+ 13 项待确认问题 | 前端源码通读 |
| v1.1 | 2026-11-26 | 评审修正：①统计口径修正（已调用 10→12，补"现有接口合计 14"）；②请求封装约定补充错误码映射、鉴权预留、字段命名约定、RPC 风格注记；③TreeNodeProp 正式增加 `prop_id`；④FsTreeNodeProp 增加 `truncated/content_length`；⑤E-1/E-2 响应明确 `prop_id`；⑥A-11/A-12 补充分页统一建议；⑦C-6 补充互斥关系与决议前冻结标注；⑧F-3 补充路径设计建议；⑨新增"存储映射建议（PostgreSQL）"小节；⑩版本号与本变更记录 | [17_API接口评审报告.md](./17_API接口评审报告.md)（P1–P13） |
| v1.2 | 2026-11-27 | 前后端联调修正：①A-11/A-12 正式改为 `Page{total,items}` + page/page_size，前端 `gitApi.log/actions` 同步；②`GitAction.id` 由 int 修正为 uuid 字符串、`GitCommit.date`/`GitAction.ts` 明确 ISO 8601；③`TreeNodeProp` 增加可选 `prop_id`（持久层主键回填）；④前端基础地址改由 `VITE_API_BASE_URL` 注入，补开发环境直连与 CORS 说明；⑤后端 CORS 由 `*` 改为显式源列表、SECRET_KEY 长度修正、Neo4j 健康检查协程泄漏修复；⑥GitPage 初始加载失败显式提示。完整记录见 [前后端联调报告.md](./前后端联调报告.md) | 联调实测（197/197） |
