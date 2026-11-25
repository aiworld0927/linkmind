import { create } from 'zustand';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import {
  APP_CONFIG,
  DEFAULT_CANVAS_VIEW,
  ROOT_LEVEL_ID,
} from '@/config/app';
import { getSeedDatasets } from '@/config/datasets';
import { getDataSource } from '@/data/source';
import type {
  BreadItem,
  CanvasController,
  CanvasViewState,
  DisplayMode,
  ExportDataPayload,
  GraphDataset,
  LevelHistory,
  ListItem,
  NodeDraft,
  NodeItem,
  NoteDraft,
  OperationEntry,
  OperationResult,
  OperationType,
} from '@/types';
import type { PersistedSession } from '@/utils/storage';
import {
  detectCycle,
  hasDuplicateName,
  normalizeImportPayload,
  validateNodeDraft,
  validateNoteDraft,
} from '@/utils/validation';

export interface NodePosition {
  x: number;
  y: number;
}

interface UndoSnapshot {
  activeDatasetId: string;
  datasets: GraphDataset[];
  rootNodes: NodeItem[];
  currentNodes: NodeItem[];
  currentLevelId: string;
  breadcrumbs: BreadItem[];
  levelHistory: LevelHistory[];
}

export interface CanvasStore {
  // ---- 数据层 ----
  datasets: GraphDataset[];
  activeDatasetId: string;
  rootNodes: NodeItem[];
  currentNodes: NodeItem[];
  currentLevelId: string;
  breadcrumbs: BreadItem[];
  levelHistory: LevelHistory[];

  // ---- 视图状态 ----
  globalDisplayMode: DisplayMode;
  canvasView: CanvasViewState;
  searchKeyword: string;
  popoverVisibleNodeId: string | null;
  drawerVisible: boolean;
  drawerTargetNodeId: string | null;
  logVisible: boolean;
  isLoading: boolean;
  nodePositions: Record<string, NodePosition>;
  lastError: string | null;

  // ---- 可追溯 ----
  operationLog: OperationEntry[];
  undoStack: UndoSnapshot[];

  // ---- 画布控制器（由画布注册，工具栏消费）----
  canvasController: CanvasController | null;

  // ---- 生命周期 ----
  bootstrap: () => void;
  syncToStorage: () => void;
  resetCanvas: () => void;
  switchDataset: (datasetId: string) => OperationResult;
  createDataset: (title: string, description: string) => OperationResult;
  updateDataset: (
    datasetId: string,
    patch: { title?: string; description?: string },
  ) => OperationResult;
  deleteDataset: (datasetId: string) => OperationResult;
  importData: (payload: unknown) => OperationResult;
  exportData: () => ExportDataPayload;

  // ---- 节点 CRUD ----
  addNode: (draft: NodeDraft) => OperationResult;
  updateNode: (nodeId: string, patch: Partial<NodeItem>) => OperationResult;
  deleteNode: (nodeId: string, isCascade: boolean) => OperationResult;
  toggleNodeExpand: (nodeId: string) => OperationResult;
  setAllExpanded: (expanded: boolean) => OperationResult;

  // ---- 笔记 CRUD ----
  addListItem: (parentNodeId: string, draft: NoteDraft) => OperationResult;
  updateListItem: (parentNodeId: string, itemId: string, patch: Partial<ListItem>) => OperationResult;
  deleteListItem: (parentNodeId: string, itemIds: string[]) => OperationResult;

  // ---- 依赖关系 CRUD ----
  addDependency: (sourceId: string, targetId: string) => OperationResult;
  removeDependency: (sourceId: string, targetId: string) => OperationResult;
  updateDependency: (
    oldSourceId: string,
    oldTargetId: string,
    newSourceId: string,
    newTargetId: string,
  ) => OperationResult;

  // ---- 层级导航 ----
  drillDown: (targetNodeId: string) => void;
  backToBreadLevel: (targetIndex: number) => void;
  resetToRoot: () => void;

  // ---- 交互状态 ----
  setGlobalDisplayMode: (mode: DisplayMode) => void;
  openPopover: (nodeId: string) => void;
  closePopover: () => void;
  openDrawer: (nodeId: string) => void;
  closeDrawer: () => void;
  openLogDrawer: () => void;
  closeLogDrawer: () => void;
  setCanvasView: (view: Partial<CanvasViewState>) => void;
  setSearchKeyword: (keyword: string) => void;
  updateNodePosition: (nodeId: string, position: NodePosition) => void;
  resetNodePositions: () => void;
  registerCanvasController: (controller: CanvasController | null) => void;

  // ---- 操作日志 ----
  undoLastOperation: () => OperationResult;
  clearOperationLog: () => void;

  // ---- 校验工具（供表单复用）----
  checkCircleDepend: (nodeList: NodeItem[], newDependIds: string[], selfId: string) => boolean;
  checkNodeNameRepeat: (nodeList: NodeItem[], name: string, excludeId?: string) => boolean;
}

const now = (): string => dayjs().format('YYYY-MM-DD HH:mm:ss');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const makeEntry = (
  type: OperationType,
  summary: string,
  target?: { id?: string; name?: string },
  undoable = true,
): OperationEntry => {
  const entry: OperationEntry = { id: uuidv4(), type, summary, time: now(), undoable };
  if (target?.id) entry.targetId = target.id;
  if (target?.name) entry.targetName = target.name;
  return entry;
};

const snapshotOf = (state: CanvasStore): UndoSnapshot => ({
  activeDatasetId: state.activeDatasetId,
  datasets: clone(state.datasets),
  rootNodes: clone(state.rootNodes),
  currentNodes: clone(state.currentNodes),
  currentLevelId: state.currentLevelId,
  breadcrumbs: clone(state.breadcrumbs),
  levelHistory: clone(state.levelHistory),
});

const toSession = (state: CanvasStore): PersistedSession => ({
  storageVersion: APP_CONFIG.storageVersion,
  activeDatasetId: state.activeDatasetId,
  datasets: state.datasets,
  currentNodes: state.currentNodes,
  currentLevelId: state.currentLevelId,
  breadcrumbs: state.breadcrumbs,
  globalDisplayMode: state.globalDisplayMode,
  canvasView: state.canvasView,
  levelHistory: state.levelHistory,
  operationLog: state.operationLog,
});

const convertListItemToNodeItem = (listItem: ListItem): NodeItem => ({
  id: listItem.id,
  name: listItem.content.substring(0, 20) + (listItem.content.length > 20 ? '...' : ''),
  dependencies: [],
  children: [],
  isExpanded: false,
  displayMode: 'inner',
  createTime: listItem.createTime,
});

const seed = getSeedDatasets();
const firstSeed = seed[0];

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<CanvasStore>()((set, get) => {
  const persist = (immediate: boolean): void => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const write = () => {
      try {
        const result = getDataSource().save(toSession(get()));
        if (!result.ok) {
          set({ lastError: result.message });
          console.warn('[linkmind] 持久化失败:', result.message);
        }
      } catch (error) {
        console.error('[linkmind] 持久化异常:', error);
        set({ lastError: '数据保存异常，请检查存储状态' });
      }
    };
    if (immediate) write();
    else persistTimer = setTimeout(write, 400);
  };

  /** 原子提交节点变更：一次 set 完成数据、数据集镜像、日志与快照 */
  const commitNodes = (
    updater: (nodes: NodeItem[]) => NodeItem[],
    entry: OperationEntry,
    extra: Partial<CanvasStore> = {},
  ): void => {
    const state = get();
    const nextNodes = updater(state.currentNodes);
    const atRoot = state.currentLevelId === ROOT_LEVEL_ID;
    const nextRoot = atRoot ? nextNodes : state.rootNodes;
    const nextDatasets = atRoot
      ? state.datasets.map((dataset) =>
          dataset.id === state.activeDatasetId ? { ...dataset, nodes: nextNodes } : dataset,
        )
      : state.datasets;

    set({
      currentNodes: nextNodes,
      rootNodes: nextRoot,
      datasets: nextDatasets,
      operationLog: [entry, ...state.operationLog].slice(0, APP_CONFIG.limits.operationLogSize),
      undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
      lastError: null,
      ...extra,
    });
    persist(true);
  };

  const commitSilent = (updater: (nodes: NodeItem[]) => NodeItem[], extra: Partial<CanvasStore> = {}): void => {
    const state = get();
    const nextNodes = updater(state.currentNodes);
    const atRoot = state.currentLevelId === ROOT_LEVEL_ID;
    const nextDatasets = atRoot
      ? state.datasets.map((dataset) =>
          dataset.id === state.activeDatasetId ? { ...dataset, nodes: nextNodes } : dataset,
        )
      : state.datasets;
    set({
      currentNodes: nextNodes,
      rootNodes: atRoot ? nextNodes : state.rootNodes,
      datasets: nextDatasets,
      ...extra,
    });
    persist(true);
  };

  const updateNodeInList = (
    nodes: NodeItem[],
    nodeId: string,
    updater: (node: NodeItem) => NodeItem,
  ): NodeItem[] => nodes.map((node) => (node.id === nodeId ? updater(node) : node));

  return {
    datasets: seed,
    activeDatasetId: firstSeed.id,
    rootNodes: firstSeed.nodes,
    currentNodes: firstSeed.nodes,
    currentLevelId: ROOT_LEVEL_ID,
    breadcrumbs: [],
    levelHistory: [],
    globalDisplayMode: APP_CONFIG.defaultDisplayMode,
    canvasView: { ...DEFAULT_CANVAS_VIEW },
    searchKeyword: '',
    popoverVisibleNodeId: null,
    drawerVisible: false,
    drawerTargetNodeId: null,
    logVisible: false,
    isLoading: false,
    nodePositions: {},
    lastError: null,
    operationLog: [],
    undoStack: [],
    canvasController: null,

    bootstrap: () => {
      const loaded = getDataSource().load();
      if (loaded.ok && loaded.data) {
        const session = loaded.data;
        const activeDataset =
          session.datasets.find((item) => item.id === session.activeDatasetId) ?? session.datasets[0];
        set({
          datasets: session.datasets,
          activeDatasetId: activeDataset.id,
          rootNodes: activeDataset.nodes,
          currentNodes: session.currentNodes,
          currentLevelId: session.currentLevelId,
          breadcrumbs: session.breadcrumbs,
          globalDisplayMode: session.globalDisplayMode,
          canvasView: session.canvasView,
          levelHistory: session.levelHistory,
          operationLog: session.operationLog,
          isLoading: false,
          lastError: null,
        });
        return;
      }
      if (!loaded.ok) {
        console.warn('[linkmind] 本地数据读取失败，使用默认数据:', loaded.message);
      }
      set({ isLoading: false, lastError: loaded.ok ? null : loaded.message });
    },

    syncToStorage: () => persist(true),

    resetCanvas: () => {
      const seeds = getSeedDatasets();
      const first = seeds[0];
      const state = get();
      set({
        datasets: seeds,
        activeDatasetId: first.id,
        rootNodes: first.nodes,
        currentNodes: clone(first.nodes),
        currentLevelId: ROOT_LEVEL_ID,
        breadcrumbs: [],
        levelHistory: [],
        canvasView: { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        operationLog: [makeEntry('reset', '重置画布为默认数据'), ...state.operationLog].slice(
          0,
          APP_CONFIG.limits.operationLogSize,
        ),
        undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
        lastError: null,
      });
      persist(true);
    },

    switchDataset: (datasetId) => {
      const state = get();
      const dataset = state.datasets.find((item) => item.id === datasetId);
      if (!dataset) return { ok: false, message: '数据集不存在' };
      if (datasetId === state.activeDatasetId) return { ok: true, message: '已经是当前数据集' };

      set({
        activeDatasetId: dataset.id,
        rootNodes: dataset.nodes,
        currentNodes: clone(dataset.nodes),
        currentLevelId: ROOT_LEVEL_ID,
        breadcrumbs: [],
        levelHistory: [],
        canvasView: { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        operationLog: [
          makeEntry('switch-dataset', `切换数据集：${dataset.title}`, { id: dataset.id, name: dataset.title }, false),
          ...state.operationLog,
        ].slice(0, APP_CONFIG.limits.operationLogSize),
        lastError: null,
      });
      persist(true);
      return { ok: true, message: `已切换到「${dataset.title}」` };
    },

    createDataset: (title, description) => {
      const state = get();
      const cleaned = title.trim();
      if (!cleaned) return { ok: false, message: '地图名称不能为空' };
      if (cleaned.length > 60) return { ok: false, message: '地图名称不能超过 60 个字符' };
      if (state.datasets.some((item) => item.title === cleaned)) {
        return { ok: false, message: `已存在同名地图「${cleaned}」` };
      }

      const dataset: GraphDataset = {
        id: `dataset-${uuidv4()}`,
        title: cleaned,
        description: description.trim(),
        nodes: [],
      };
      set({
        datasets: [...state.datasets, dataset],
        activeDatasetId: dataset.id,
        rootNodes: [],
        currentNodes: [],
        currentLevelId: ROOT_LEVEL_ID,
        breadcrumbs: [],
        levelHistory: [],
        canvasView: { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        operationLog: [
          makeEntry('create-dataset', `新建地图：${cleaned}`, { id: dataset.id, name: cleaned }),
          ...state.operationLog,
        ].slice(0, APP_CONFIG.limits.operationLogSize),
        undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
        lastError: null,
      });
      persist(true);
      return { ok: true, message: `地图「${cleaned}」已创建` };
    },

    updateDataset: (datasetId, patch) => {
      const state = get();
      const dataset = state.datasets.find((item) => item.id === datasetId);
      if (!dataset) return { ok: false, message: '地图不存在' };

      const nextTitle = (patch.title ?? dataset.title).trim();
      if (!nextTitle) return { ok: false, message: '地图名称不能为空' };
      if (nextTitle.length > 60) return { ok: false, message: '地图名称不能超过 60 个字符' };
      if (state.datasets.some((item) => item.id !== datasetId && item.title === nextTitle)) {
        return { ok: false, message: `已存在同名地图「${nextTitle}」` };
      }
      const nextDescription = (patch.description ?? dataset.description ?? '').trim();
      const nextDataset: GraphDataset = {
        ...dataset,
        title: nextTitle,
        description: nextDescription,
      };
      const datasets = state.datasets.map((item) => (item.id === datasetId ? nextDataset : item));
      const isActive = state.activeDatasetId === datasetId;

      set({
        datasets,
        rootNodes: isActive ? nextDataset.nodes : state.rootNodes,
        operationLog: [
          makeEntry('update-dataset', `编辑地图：${nextTitle}`, { id: datasetId, name: nextTitle }),
          ...state.operationLog,
        ].slice(0, APP_CONFIG.limits.operationLogSize),
        undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
        lastError: null,
      });
      persist(true);
      return { ok: true, message: '地图信息已更新' };
    },

    deleteDataset: (datasetId) => {
      const state = get();
      if (state.datasets.length <= 1) {
        return { ok: false, message: '至少需要保留一个地图' };
      }
      const dataset = state.datasets.find((item) => item.id === datasetId);
      if (!dataset) return { ok: false, message: '地图不存在' };

      const datasets = state.datasets.filter((item) => item.id !== datasetId);
      const isActive = state.activeDatasetId === datasetId;
      const nextActive = isActive ? datasets[0] : datasets.find((item) => item.id === state.activeDatasetId)!;

      set({
        datasets,
        activeDatasetId: nextActive.id,
        rootNodes: nextActive.nodes,
        currentNodes: isActive ? clone(nextActive.nodes) : state.currentNodes,
        currentLevelId: isActive ? ROOT_LEVEL_ID : state.currentLevelId,
        breadcrumbs: isActive ? [] : state.breadcrumbs,
        levelHistory: isActive ? [] : state.levelHistory,
        canvasView: isActive ? { ...DEFAULT_CANVAS_VIEW } : state.canvasView,
        nodePositions: isActive ? {} : state.nodePositions,
        searchKeyword: isActive ? '' : state.searchKeyword,
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        operationLog: [
          makeEntry('delete-dataset', `删除地图：${dataset.title}`, { id: dataset.id, name: dataset.title }),
          ...state.operationLog,
        ].slice(0, APP_CONFIG.limits.operationLogSize),
        undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
        lastError: null,
      });
      persist(true);
      return { ok: true, message: `地图「${dataset.title}」已删除` };
    },

    importData: (payload: unknown) => {
      const normalized = normalizeImportPayload(payload);
      if (!normalized.ok) return { ok: false, message: normalized.message };

      const { dataset, view, operationLog } = normalized.value;
      const state = get();
      const exists = state.datasets.some((item) => item.id === dataset.id);
      const datasets = exists
        ? state.datasets.map((item) => (item.id === dataset.id ? dataset : item))
        : [...state.datasets, dataset];

      const restoredView = view;
      set({
        datasets,
        activeDatasetId: dataset.id,
        rootNodes: dataset.nodes,
        currentNodes: restoredView ? restoredView.currentNodes : clone(dataset.nodes),
        currentLevelId: restoredView ? restoredView.currentLevelId : ROOT_LEVEL_ID,
        breadcrumbs: restoredView ? restoredView.breadcrumbs : [],
        levelHistory: restoredView ? restoredView.levelHistory : [],
        globalDisplayMode: restoredView ? restoredView.globalDisplayMode : state.globalDisplayMode,
        canvasView: restoredView ? restoredView.canvasView : { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        operationLog: [
          makeEntry('import', `导入数据集「${dataset.title}」（${dataset.nodes.length} 个节点）`, {
            id: dataset.id,
            name: dataset.title,
          }),
          ...operationLog,
          ...state.operationLog,
        ].slice(0, APP_CONFIG.limits.operationLogSize),
        undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
        isLoading: false,
        lastError: null,
      });
      persist(true);
      return { ok: true, message: `导入成功：${dataset.nodes.length} 个节点` };
    },

    exportData: () => {
      const state = get();
      const activeDataset =
        state.datasets.find((item) => item.id === state.activeDatasetId) ?? {
          id: state.activeDatasetId,
          title: '当前画布',
          nodes: state.rootNodes,
        };
      return {
        version: APP_CONFIG.version,
        exportTime: new Date().toISOString(),
        dataset: { ...activeDataset, nodes: state.rootNodes },
        currentLevelId: state.currentLevelId,
        currentNodes: state.currentNodes,
        breadcrumbs: state.breadcrumbs,
        globalDisplayMode: state.globalDisplayMode,
        canvasView: state.canvasView,
        levelHistory: state.levelHistory,
        operationLog: state.operationLog,
      };
    },

    addNode: (draft) => {
      const state = get();
      const validated = validateNodeDraft(state.currentNodes, draft);
      if (!validated.ok) return { ok: false, message: validated.message };

      const newNode: NodeItem = {
        id: `node-${uuidv4()}`,
        name: validated.value.draft.name,
        dependencies: validated.value.draft.dependencies,
        children: [],
        isExpanded: false,
        displayMode: validated.value.draft.displayMode,
        createTime: now(),
      };

      commitNodes(
        (nodes) => [...nodes, newNode],
        makeEntry('create-node', `新增节点「${newNode.name}」`, { id: newNode.id, name: newNode.name }),
      );
      return { ok: true, message: `节点「${newNode.name}」创建成功` };
    },

    updateNode: (nodeId, patch) => {
      const state = get();
      const target = state.currentNodes.find((node) => node.id === nodeId);
      if (!target) return { ok: false, message: '节点不存在或已被删除' };

      const nextName = typeof patch.name === 'string' ? patch.name.trim() : target.name;
      const nextDependencies = patch.dependencies ?? target.dependencies;

      const validated = validateNodeDraft(
        state.currentNodes,
        {
          name: nextName,
          dependencies: nextDependencies,
          displayMode: patch.displayMode ?? target.displayMode,
        },
        nodeId,
      );
      if (!validated.ok) return { ok: false, message: validated.message };

      const updated: NodeItem = {
        ...target,
        ...patch,
        name: validated.value.draft.name,
        dependencies: validated.value.draft.dependencies,
        displayMode: validated.value.draft.displayMode,
        updatedAt: now(),
      };

      commitNodes(
        (nodes) => updateNodeInList(nodes, nodeId, () => updated),
        makeEntry('update-node', `更新节点「${updated.name}」`, { id: nodeId, name: updated.name }),
      );
      return { ok: true, message: `节点「${updated.name}」已更新` };
    },

    deleteNode: (nodeId, isCascade) => {
      const state = get();
      const target = state.currentNodes.find((node) => node.id === nodeId);
      if (!target) return { ok: false, message: '节点不存在或已被删除' };

      let remaining = state.currentNodes.filter((node) => node.id !== nodeId);
      if (isCascade) {
        const removed = new Set<string>([nodeId]);
        let changed = true;
        while (changed) {
          changed = false;
          remaining.forEach((node) => {
            if (!removed.has(node.id) && node.dependencies.some((id) => removed.has(id))) {
              removed.add(node.id);
              changed = true;
            }
          });
        }
        remaining = remaining.filter((node) => !removed.has(node.id));
      } else {
        remaining = remaining.map((node) => ({
          ...node,
          dependencies: node.dependencies.filter((id) => id !== nodeId),
        }));
      }

      const extra: Partial<CanvasStore> = {
        nodePositions: Object.fromEntries(
          Object.entries(state.nodePositions).filter(([id]) => id !== nodeId),
        ),
        popoverVisibleNodeId: state.popoverVisibleNodeId === nodeId ? null : state.popoverVisibleNodeId,
        drawerVisible: state.drawerTargetNodeId === nodeId ? false : state.drawerVisible,
        drawerTargetNodeId: state.drawerTargetNodeId === nodeId ? null : state.drawerTargetNodeId,
      };

      // 若删除的是面包屑上的祖先节点，退回上一层，保持层级状态一致
      const breadcrumbIndex = state.breadcrumbs.findIndex((item) => item.id === nodeId);
      if (breadcrumbIndex !== -1) {
        const newBreadcrumbs = state.breadcrumbs.slice(0, breadcrumbIndex);
        const newHistory = state.levelHistory.slice(0, breadcrumbIndex);
        const fallbackNodes =
          newHistory.length > 0
            ? newHistory[newHistory.length - 1].nodes
            : state.datasets.find((item) => item.id === state.activeDatasetId)?.nodes ?? [];

        set({
          ...extra,
          currentNodes: clone(fallbackNodes),
          currentLevelId:
            newHistory.length > 0 ? newHistory[newHistory.length - 1].levelId : ROOT_LEVEL_ID,
          breadcrumbs: newBreadcrumbs,
          levelHistory: newHistory,
          operationLog: [
            makeEntry('delete-node', `删除节点「${target.name}」`, { id: nodeId, name: target.name }),
            ...state.operationLog,
          ].slice(0, APP_CONFIG.limits.operationLogSize),
          undoStack: [snapshotOf(state), ...state.undoStack].slice(0, APP_CONFIG.limits.undoDepth),
          lastError: null,
        });
        persist(true);
        return { ok: true, message: `节点「${target.name}」已删除` };
      }

      commitNodes(
        () => remaining,
        makeEntry(
          'delete-node',
          `${isCascade ? '级联删除' : '删除'}节点「${target.name}」`,
          { id: nodeId, name: target.name },
        ),
        extra,
      );
      return { ok: true, message: `节点「${target.name}」已${isCascade ? '级联' : ''}删除` };
    },

    toggleNodeExpand: (nodeId) => {
      const state = get();
      const target = state.currentNodes.find((node) => node.id === nodeId);
      if (!target) return { ok: false, message: '节点不存在或已被删除' };
      commitSilent((nodes) =>
        updateNodeInList(nodes, nodeId, (node) => ({ ...node, isExpanded: !node.isExpanded })),
      );
      return { ok: true, message: target.isExpanded ? '已折叠节点' : '已展开节点' };
    },

    setAllExpanded: (expanded) => {
      const state = get();
      if (state.currentNodes.length === 0) return { ok: false, message: '当前没有节点' };
      const entry = makeEntry(
        'toggle-node',
        `${expanded ? '展开' : '折叠'}全部节点（${state.currentNodes.length} 个）`,
      );
      commitNodes(
        (nodes) => nodes.map((node) => ({ ...node, isExpanded: expanded })),
        entry,
      );
      return { ok: true, message: expanded ? '已展开全部节点' : '已折叠全部节点' };
    },

    addListItem: (parentNodeId, draft) => {
      const state = get();
      const parent = state.currentNodes.find((node) => node.id === parentNodeId);
      if (!parent) return { ok: false, message: '父节点不存在或已被删除' };
      if (parent.children.length >= APP_CONFIG.limits.maxNotesPerNode) {
        return { ok: false, message: `单个节点最多 ${APP_CONFIG.limits.maxNotesPerNode} 条笔记` };
      }
      const validation = validateNoteDraft(draft);
      if (!validation.ok) return validation;

      const newItem: ListItem = {
        id: `note-${uuidv4()}`,
        content: draft.content.trim(),
        tagList: [...new Set(draft.tagList)],
        remark: draft.remark.trim(),
        createTime: now(),
        parentNodeId,
      };

      commitNodes(
        (nodes) =>
          updateNodeInList(nodes, parentNodeId, (node) => ({
            ...node,
            isExpanded: true,
            children: [...node.children, newItem],
          })),
        makeEntry('create-note', `为「${parent.name}」新增笔记`, {
          id: newItem.id,
          name: newItem.content.slice(0, 20),
        }),
      );
      return { ok: true, message: '笔记添加成功' };
    },

    updateListItem: (parentNodeId, itemId, patch) => {
      const state = get();
      const parent = state.currentNodes.find((node) => node.id === parentNodeId);
      const target = parent?.children.find((item) => item.id === itemId);
      if (!parent || !target) return { ok: false, message: '笔记不存在或已被删除' };

      const nextContent = typeof patch.content === 'string' ? patch.content.trim() : target.content;
      const nextRemark = typeof patch.remark === 'string' ? patch.remark.trim() : target.remark;
      const validation = validateNoteDraft({
        content: nextContent,
        tagList: patch.tagList ?? target.tagList,
        remark: nextRemark,
      });
      if (!validation.ok) return validation;

      const updated: ListItem = {
        ...target,
        ...patch,
        content: nextContent,
        remark: nextRemark,
        parentNodeId,
        updatedAt: now(),
      };

      commitNodes(
        (nodes) =>
          updateNodeInList(nodes, parentNodeId, (node) => ({
            ...node,
            children: node.children.map((item) => (item.id === itemId ? updated : item)),
          })),
        makeEntry('update-note', `更新「${parent.name}」的笔记`, {
          id: itemId,
          name: nextContent.slice(0, 20),
        }),
      );
      return { ok: true, message: '笔记更新成功' };
    },

    deleteListItem: (parentNodeId, itemIds) => {
      const state = get();
      const parent = state.currentNodes.find((node) => node.id === parentNodeId);
      if (!parent) return { ok: false, message: '父节点不存在或已被删除' };
      if (itemIds.length === 0) return { ok: false, message: '请选择要删除的笔记' };

      const removing = new Set(itemIds);
      const removedCount = parent.children.filter((item) => removing.has(item.id)).length;
      if (removedCount === 0) return { ok: false, message: '笔记不存在或已被删除' };

      commitNodes(
        (nodes) =>
          updateNodeInList(nodes, parentNodeId, (node) => ({
            ...node,
            children: node.children.filter((item) => !removing.has(item.id)),
          })),
        makeEntry(
          'delete-note',
          `删除「${parent.name}」的 ${removedCount} 条笔记`,
          { id: parentNodeId, name: parent.name },
        ),
      );
      return { ok: true, message: `已删除 ${removedCount} 条笔记` };
    },

    addDependency: (sourceId, targetId) => {
      const state = get();
      if (sourceId === targetId) return { ok: false, message: '不能创建自依赖' };
      const source = state.currentNodes.find((node) => node.id === sourceId);
      const target = state.currentNodes.find((node) => node.id === targetId);
      if (!source || !target) return { ok: false, message: '依赖关系涉及的节点不存在' };
      if (target.dependencies.includes(sourceId)) return { ok: false, message: '依赖关系已存在' };
      const nextDependencies = [...target.dependencies, sourceId];
      if (detectCycle(state.currentNodes, nextDependencies, targetId)) {
        return { ok: false, message: '检测到循环依赖，无法建立该关系' };
      }

      commitNodes(
        (nodes) =>
          updateNodeInList(nodes, targetId, (node) => ({
            ...node,
            dependencies: nextDependencies,
            updatedAt: now(),
          })),
        makeEntry('create-link', `新增依赖「${source.name}」→「${target.name}」`, {
          id: targetId,
          name: target.name,
        }),
      );
      return { ok: true, message: '依赖关系已添加' };
    },

    removeDependency: (sourceId, targetId) => {
      const state = get();
      const target = state.currentNodes.find((node) => node.id === targetId);
      if (!target) return { ok: false, message: '节点不存在或已被删除' };
      if (!target.dependencies.includes(sourceId)) return { ok: false, message: '依赖关系不存在' };

      commitNodes(
        (nodes) =>
          updateNodeInList(nodes, targetId, (node) => ({
            ...node,
            dependencies: node.dependencies.filter((id) => id !== sourceId),
            updatedAt: now(),
          })),
        makeEntry('delete-link', `删除依赖关系（目标：${target.name}）`, {
          id: targetId,
          name: target.name,
        }),
      );
      return { ok: true, message: '依赖关系已删除' };
    },

    updateDependency: (oldSourceId, oldTargetId, newSourceId, newTargetId) => {
      const state = get();
      if (newSourceId === newTargetId) return { ok: false, message: '不能创建自依赖' };
      if (oldSourceId === newSourceId && oldTargetId === newTargetId) {
        return { ok: true, message: '依赖关系未发生变化' };
      }

      const source = state.currentNodes.find((node) => node.id === newSourceId);
      if (!source) return { ok: false, message: '源节点不存在' };

      // 先原子地移除旧依赖，再校验并写入新依赖
      const withoutOld = state.currentNodes.map((node) =>
        node.id === oldTargetId
          ? { ...node, dependencies: node.dependencies.filter((id) => id !== oldSourceId) }
          : node,
      );
      const newTarget = withoutOld.find((node) => node.id === newTargetId);
      if (!newTarget) return { ok: false, message: '目标节点不存在' };
      if (newTarget.dependencies.includes(newSourceId)) return { ok: false, message: '依赖关系已存在' };

      const nextDependencies = [...newTarget.dependencies, newSourceId];
      if (detectCycle(withoutOld, nextDependencies, newTargetId)) {
        return { ok: false, message: '检测到循环依赖，无法保存该关系' };
      }

      const nextNodes = withoutOld.map((node) =>
        node.id === newTargetId
          ? { ...node, dependencies: nextDependencies, updatedAt: now() }
          : node,
      );

      commitNodes(
        () => nextNodes,
        makeEntry('update-link', `更新依赖关系（目标：${newTarget.name}）`, {
          id: newTargetId,
          name: newTarget.name,
        }),
      );
      return { ok: true, message: '依赖关系已更新' };
    },

    drillDown: (targetNodeId) => {
      const state = get();
      const node = state.currentNodes.find((item) => item.id === targetNodeId);
      if (!node) {
        set({ lastError: '节点不存在或已被删除' });
        return;
      }
      if (node.children.length === 0) {
        set({ lastError: '该节点没有子节点' });
        return;
      }

      const historyEntry: LevelHistory = {
        levelId: state.currentLevelId,
        nodes: clone(state.currentNodes),
        breadcrumbs: clone(state.breadcrumbs),
      };

      set({
        currentLevelId: node.id,
        breadcrumbs: [...state.breadcrumbs, { id: node.id, name: node.name }],
        currentNodes: node.children.map(convertListItemToNodeItem),
        levelHistory: [...state.levelHistory, historyEntry],
        canvasView: { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        lastError: null,
      });
      persist(true);
    },

    backToBreadLevel: (targetIndex) => {
      const state = get();
      if (targetIndex < 0 || targetIndex > state.breadcrumbs.length) return;

      const newHistory = state.levelHistory.slice(0, targetIndex);
      const datasetNodes =
        state.datasets.find((item) => item.id === state.activeDatasetId)?.nodes ?? state.rootNodes;
      const targetNodes =
        newHistory.length > 0 ? clone(newHistory[newHistory.length - 1].nodes) : clone(datasetNodes);

      set({
        breadcrumbs: state.breadcrumbs.slice(0, targetIndex),
        currentLevelId:
          newHistory.length > 0 ? newHistory[newHistory.length - 1].levelId : ROOT_LEVEL_ID,
        currentNodes: targetNodes,
        levelHistory: newHistory,
        canvasView: { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        lastError: null,
      });
      persist(true);
    },

    resetToRoot: () => {
      const state = get();
      const datasetNodes =
        state.datasets.find((item) => item.id === state.activeDatasetId)?.nodes ?? state.rootNodes;
      set({
        currentLevelId: ROOT_LEVEL_ID,
        breadcrumbs: [],
        currentNodes: clone(datasetNodes),
        levelHistory: [],
        canvasView: { ...DEFAULT_CANVAS_VIEW },
        nodePositions: {},
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        lastError: null,
      });
      persist(true);
    },

    setGlobalDisplayMode: (mode) => {
      set({ globalDisplayMode: mode });
      persist(true);
    },

    openPopover: (nodeId) => set({ popoverVisibleNodeId: nodeId }),
    closePopover: () => set({ popoverVisibleNodeId: null }),
    openDrawer: (nodeId) => set({ drawerVisible: true, drawerTargetNodeId: nodeId }),
    closeDrawer: () => set({ drawerVisible: false, drawerTargetNodeId: null }),
    openLogDrawer: () => set({ logVisible: true }),
    closeLogDrawer: () => set({ logVisible: false }),

    setCanvasView: (view) => {
      set((prev) => ({ canvasView: { ...prev.canvasView, ...view } }));
      persist(false);
    },

    setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

    updateNodePosition: (nodeId, position) => {
      set((prev) => ({ nodePositions: { ...prev.nodePositions, [nodeId]: position } }));
      persist(false);
    },

    resetNodePositions: () => set({ nodePositions: {} }),

    registerCanvasController: (controller) => set({ canvasController: controller }),

    undoLastOperation: () => {
      const state = get();
      const [snapshot, ...rest] = state.undoStack;
      if (!snapshot) return { ok: false, message: '没有可撤销的操作' };

      set({
        ...snapshot,
        undoStack: rest,
        operationLog: [
          makeEntry('undo', '撤销上一步操作', undefined, false),
          ...state.operationLog,
        ].slice(0, APP_CONFIG.limits.operationLogSize),
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        nodePositions: {},
        lastError: null,
      });
      persist(true);
      return { ok: true, message: '已撤销上一步操作' };
    },

    clearOperationLog: () => {
      set({ operationLog: [] });
      persist(true);
    },

    checkCircleDepend: (nodeList, newDependIds, selfId) => detectCycle(nodeList, newDependIds, selfId),

    checkNodeNameRepeat: (nodeList, name, excludeId) => hasDuplicateName(nodeList, name, excludeId),
  };
});
