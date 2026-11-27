import { create } from 'zustand';
import type { NotePayload, RepoRef, TreeNode, TreeNodeProp, TreeMap } from '@/types';
import { countNodes, countProps, VIEW_MAX_K, VIEW_MIN_K } from '@/utils/layout';
import { errorMessage } from '@/utils/http';
import { mindmapApi } from '@/features/mindmap/api';
import type { ImportMapPayload, MapSummary } from '@/features/mindmap/api';

// ---------- Modal 类型 ----------
export interface MapModalState {
  kind: 'map';
  mode: 'create' | 'edit' | 'delete';
  /** map 索引；create 时为 -1 */
  index: number;
}

export interface NodeModalState {
  kind: 'node';
  mode: 'add-child' | 'rename' | 'delete';
  /** add-child 时为父节点 id（ROOT_ID 或具体 id）；rename/delete 为目标节点 id */
  nodeId: string;
}

export interface PropModalState {
  kind: 'prop';
  mode: 'add' | 'edit' | 'delete';
  /** 所在节点 id（ROOT_ID 或具体 id） */
  nodeId: string;
  /** 属性在 props 数组中的索引 */
  propIndex: number;
}

export interface PickerModalState {
  kind: 'picker';
}

export interface RepoModalState {
  kind: 'repo';
}

export type ModalState =
  | MapModalState
  | NodeModalState
  | PropModalState
  | PickerModalState
  | RepoModalState;

export interface LogEntry {
  t: string;
  text: string;
}

export interface ViewState {
  k: number;
  x: number;
  y: number;
}

export interface CtxMenuState {
  x: number;
  y: number;
  nodeId: string;
}

const MAX_LOG = 200;

// ---------- 递归查找 / 替换工具 ----------
function findNode(
  map: TreeMap,
  id: string,
): { node: TreeNode; parent: TreeNode | null; parentIsMap: boolean } | null {
  function iter(
    list: TreeNode[],
    parent: TreeNode | null,
  ): { node: TreeNode; parent: TreeNode | null; parentIsMap: boolean } | null {
    for (const n of list) {
      if (n.id === id) return { node: n, parent, parentIsMap: false };
      const res = iter(n.children || [], n);
      if (res) return res;
    }
    return null;
  }
  return iter(map.nodes, null);
}

/** 取某个节点（ROOT 取地图级）的属性数组 */
function propsOf(map: TreeMap, nodeId: string): TreeNodeProp[] {
  if (nodeId === 'ROOT') return map.props || [];
  return findNode(map, nodeId)?.node.props || [];
}

/** 统一整理服务端 MapOut：补默认值 + 重新计算计数 */
function withCounts(map: TreeMap): TreeMap {
  const normalized: TreeMap = {
    ...map,
    desc: map.desc ?? '',
    props: map.props ?? [],
    nodes: map.nodes ?? [],
    loaded: true,
  };
  return {
    ...normalized,
    node_count: countNodes(normalized.nodes),
    prop_count: countProps(normalized),
  };
}

/** C-1 列表摘要 → 前端 TreeMap（未加载整树） */
function summaryToMap(item: MapSummary): TreeMap {
  return {
    id: item.id,
    title: item.title,
    desc: item.desc ?? '',
    props: [],
    nodes: [],
    repo: item.repo ?? null,
    node_count: item.node_count ?? 0,
    prop_count: item.prop_count ?? 0,
    loaded: false,
  };
}

// ---------- Store ----------
interface StoreState {
  maps: TreeMap[];
  activeMapId: string | null;
  collapsed: Set<string>;
  selectedId: string | null;
  view: ViewState;
  searchKeyword: string;
  log: LogEntry[];
  sideOpen: boolean;
  ctxMenu: CtxMenuState | null;
  modal: ModalState | null;
  logOpen: boolean;

  // —— 加载状态 ——
  mapsLoading: boolean;
  mapsError: string | null;
  treeLoading: boolean;
  treeError: string | null;

  // —— 视图控制 ——
  enterMap: (mapId: string) => void;
  setActiveMap: (mapId: string | null) => void;
  goHome: () => void;
  toggleCollapse: (id: string) => void;
  selectNode: (id: string | null) => void;
  expandAll: () => void;
  toLevel: (d: number) => void;
  fitView: () => void;
  zoom: (f: number) => void;
  setView: (v: Partial<ViewState>) => void;
  search: (q: string) => void;
  toggleLog: (force?: boolean) => void;
  openSide: () => void;
  closeSide: () => void;
  openCtx: (x: number, y: number, nodeId: string) => void;
  closeCtx: () => void;

  // —— Modal ——
  openModal: (m: ModalState) => void;
  closeModal: () => void;

  // —— 服务端数据加载 ——
  loadMaps: (keyword?: string) => Promise<void>;
  ensureTree: (mapId: string) => Promise<TreeMap | null>;
  refreshTree: (mapId: string) => Promise<TreeMap | null>;

  // —— 地图 CRUD（全部走后端落库）——
  createMap: (title: string, desc?: string) => Promise<TreeMap>;
  updateMap: (
    mapId: string,
    patch: { title?: string; desc?: string; repo?: RepoRef | null },
  ) => Promise<TreeMap>;
  deleteMap: (mapId: string) => Promise<void>;
  importMap: (payload: ImportMapPayload) => Promise<TreeMap>;

  // —— 节点 CRUD ——
  addNode: (parentId: string, name: string) => Promise<TreeNode>;
  renameNode: (nodeId: string, name: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;

  // —— 属性 CRUD ——
  addProp: (nodeId: string, prop: { label: string; note: NotePayload }) => Promise<void>;
  updateProp: (nodeId: string, idx: number, prop: TreeNodeProp) => Promise<void>;
  deleteProp: (nodeId: string, idx: number) => Promise<void>;

  // —— 笔记 ——
  saveNote: (
    mapId: string,
    nodeId: string,
    propId: string,
    payload: { content: string; tags?: string[]; remark?: string },
  ) => Promise<void>;

  // —— 内部工具 ——
  logOp: (text: string) => void;
  exportMaps: () => Promise<void>;
}

export const useAppStore = create<StoreState>((set, get) => {
  const logOp = (text: string): void => {
    set((s) => {
      const next = [{ t: new Date().toISOString(), text }, ...s.log];
      if (next.length > MAX_LOG) next.length = MAX_LOG;
      return { log: next };
    });
  };

  /** 用服务端返回的整树替换本地缓存 */
  const applyTree = (map: TreeMap): void => {
    const next = withCounts(map);
    set((s) => {
      const exists = s.maps.some((m) => m.id === next.id);
      return {
        maps: exists ? s.maps.map((m) => (m.id === next.id ? next : m)) : [...s.maps, next],
        treeError: null,
      };
    });
  };

  return {
    maps: [],
    activeMapId: null,
    collapsed: new Set<string>(),
    selectedId: null,
    view: { k: 1, x: 24, y: 24 },
    searchKeyword: '',
    log: [],
    sideOpen: false,
    ctxMenu: null,
    modal: null,
    logOpen: false,

    mapsLoading: false,
    mapsError: null,
    treeLoading: false,
    treeError: null,

    // 视图
    enterMap: (mapId) => {
      set({
        activeMapId: mapId,
        collapsed: new Set<string>(),
        selectedId: null,
        searchKeyword: '',
        ctxMenu: null,
        sideOpen: false,
        view: { k: 1, x: 24, y: 24 },
      });
    },
    setActiveMap: (mapId) => {
      set({ activeMapId: mapId });
    },
    goHome: () => {
      set({
        activeMapId: null,
        selectedId: null,
        collapsed: new Set<string>(),
        ctxMenu: null,
        sideOpen: false,
        searchKeyword: '',
      });
    },
    toggleCollapse: (id) => {
      set((s) => {
        const next = new Set(s.collapsed);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { collapsed: next };
      });
    },
    selectNode: (id) => {
      set({ selectedId: id, ctxMenu: null });
    },
    expandAll: () => set({ collapsed: new Set<string>() }),
    toLevel: (d) => {
      const state = get();
      if (!state.activeMapId) {
        logOp(`收起到第 ${d} 层`);
        return;
      }
      const next = new Set<string>(state.collapsed);
      state.maps.forEach((m) => {
        if (m.id !== state.activeMapId) return;
        (m.nodes || []).forEach((n) => {
          if (n.children && n.children.length) next.add(n.id);
        });
      });
      set({ collapsed: next });
      logOp(`收起到第 ${d} 层`);
    },
    fitView: () => {
      get().logOp('居中布局');
    },
    zoom: (f) => {
      set((s) => {
        const nk = Math.max(VIEW_MIN_K, Math.min(VIEW_MAX_K, s.view.k * f));
        return { view: { ...s.view, k: nk } };
      });
    },
    setView: (v) => set((s) => ({ view: { ...s.view, ...v } })),
    search: (q) => set({ searchKeyword: q.trim() }),
    toggleLog: (force) => {
      set((s) => ({ logOpen: typeof force === 'boolean' ? force : !s.logOpen }));
    },
    openSide: () => set({ sideOpen: true }),
    closeSide: () => set({ sideOpen: false }),
    openCtx: (x, y, nodeId) => set({ ctxMenu: { x, y, nodeId } }),
    closeCtx: () => set({ ctxMenu: null }),

    openModal: (m) => set({ modal: m }),
    closeModal: () => set({ modal: null }),

    // ---------------- 服务端加载 ----------------
    loadMaps: async (keyword) => {
      set({ mapsLoading: true, mapsError: null });
      try {
        const collected: MapSummary[] = [];
        let page = 1;
        let total = 0;
        do {
          const { data } = await mindmapApi.listMaps(page, 100, keyword);
          collected.push(...data.items);
          total = data.total;
          page += 1;
          if (data.items.length === 0) break;
        } while (collected.length < total);

        set((s) => {
          const existing = new Map(s.maps.map((m) => [m.id, m]));
          const next = collected.map((item) => {
            const cached = existing.get(item.id);
            // 已加载整树的缓存保留树，只刷新摘要字段
            if (cached?.loaded) {
              return {
                ...cached,
                title: item.title,
                desc: item.desc ?? '',
                repo: item.repo ?? null,
                node_count: item.node_count ?? cached.node_count,
                prop_count: item.prop_count ?? cached.prop_count,
              };
            }
            return summaryToMap(item);
          });
          return { maps: next, mapsLoading: false, mapsError: null };
        });
      } catch (err) {
        set({ mapsLoading: false, mapsError: errorMessage(err, '加载知识地图失败') });
      }
    },

    ensureTree: async (mapId) => {
      const cached = get().maps.find((m) => m.id === mapId);
      if (cached?.loaded) return cached;
      return get().refreshTree(mapId);
    },

    refreshTree: async (mapId) => {
      set({ treeLoading: true, treeError: null });
      try {
        const { data } = await mindmapApi.getTree(mapId);
        applyTree(data);
        set({ treeLoading: false });
        return withCounts(data);
      } catch (err) {
        set({ treeLoading: false, treeError: errorMessage(err, '加载脑图失败') });
        return null;
      }
    },

    // ---------------- 地图 CRUD ----------------
    createMap: async (title, desc) => {
      const { data } = await mindmapApi.createMap(title, desc || '');
      const map = withCounts(data);
      set((s) => ({ maps: [...s.maps, map] }));
      logOp(`新建地图：${title}`);
      return map;
    },

    updateMap: async (mapId, patch) => {
      const body: { title?: string; desc?: string; repo?: { id: string; name?: string } } = {};
      if (patch.title !== undefined) body.title = patch.title;
      if (patch.desc !== undefined) body.desc = patch.desc;
      if (patch.repo) body.repo = { id: patch.repo.id, name: patch.repo.name };
      const { data } = await mindmapApi.updateMap(mapId, body);
      const map = withCounts(data);
      applyTree(map);
      logOp(`修改地图：${map.title}`);
      return map;
    },

    deleteMap: async (mapId) => {
      await mindmapApi.deleteMap(mapId);
      set((s) => ({
        maps: s.maps.filter((m) => m.id !== mapId),
        activeMapId: s.activeMapId === mapId ? null : s.activeMapId,
        selectedId: s.activeMapId === mapId ? null : s.selectedId,
      }));
      logOp('删除地图');
    },

    importMap: async (payload) => {
      const { data } = await mindmapApi.importMap(payload);
      const map = withCounts(data);
      set((s) => ({
        maps: s.maps.some((m) => m.id === map.id) ? s.maps : [...s.maps, map],
      }));
      logOp(`导入知识地图：${map.title}`);
      return map;
    },

    // ---------------- 节点 CRUD ----------------
    addNode: async (parentId, name) => {
      const mapId = get().activeMapId;
      if (!mapId) throw new Error('请先进入一张知识地图');
      const { data } = await mindmapApi.createNode(mapId, parentId, name);
      await get().refreshTree(mapId);
      logOp(`新增节点：${name}`);
      return data;
    },

    renameNode: async (nodeId, name) => {
      const mapId = get().activeMapId;
      if (!mapId) throw new Error('请先进入一张知识地图');
      const { data } = await mindmapApi.renameNode(mapId, nodeId, name);
      if ('nodes' in data) {
        applyTree(data);
      } else {
        await get().refreshTree(mapId);
      }
      logOp(`修改节点：${name}`);
    },

    deleteNode: async (nodeId) => {
      const mapId = get().activeMapId;
      if (!mapId) throw new Error('请先进入一张知识地图');
      await mindmapApi.deleteNode(mapId, nodeId);
      await get().refreshTree(mapId);
      set((s) => ({ selectedId: s.selectedId === nodeId ? 'ROOT' : s.selectedId }));
      logOp('删除节点');
    },

    // ---------------- 属性 CRUD ----------------
    addProp: async (nodeId, prop) => {
      const mapId = get().activeMapId;
      if (!mapId) throw new Error('请先进入一张知识地图');
      await mindmapApi.createProp(mapId, nodeId, { label: prop.label, note: prop.note });
      await get().refreshTree(mapId);
      logOp(`新增属性：${prop.label}`);
    },

    updateProp: async (nodeId, idx, prop) => {
      const mapId = get().activeMapId;
      if (!mapId) throw new Error('请先进入一张知识地图');
      const map = get().maps.find((m) => m.id === mapId);
      const existing = map ? propsOf(map, nodeId)[idx] : undefined;
      if (!existing?.prop_id) throw new Error('属性缺少 prop_id，请刷新页面后重试');
      await mindmapApi.updateProp(mapId, nodeId, existing.prop_id, {
        label: prop.label,
        note: prop.note,
      });
      await get().refreshTree(mapId);
      logOp(`修改属性：${prop.label}`);
    },

    deleteProp: async (nodeId, idx) => {
      const mapId = get().activeMapId;
      if (!mapId) throw new Error('请先进入一张知识地图');
      const map = get().maps.find((m) => m.id === mapId);
      const existing = map ? propsOf(map, nodeId)[idx] : undefined;
      if (!existing?.prop_id) throw new Error('属性缺少 prop_id，请刷新页面后重试');
      await mindmapApi.deleteProp(mapId, nodeId, existing.prop_id);
      await get().refreshTree(mapId);
      logOp('删除属性');
    },

    // ---------------- 笔记 ----------------
    saveNote: async (mapId, nodeId, propId, payload) => {
      await mindmapApi.updateNote(mapId, nodeId, propId, payload);
      await get().refreshTree(mapId);
      logOp('保存笔记');
    },

    logOp,
    exportMaps: async () => {
      try {
        const { data } = await mindmapApi.exportMaps();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'linkmind-maps.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        logOp('导出数据');
      } catch (err) {
        set({ mapsError: errorMessage(err, '导出失败') });
      }
    },
  };
});

/** 辅助：根据 id 拿当前 active 的地图 */
export function useActiveMap(): TreeMap | null {
  return useAppStore((s) => {
    if (!s.activeMapId) return null;
    return s.maps.find((m) => m.id === s.activeMapId) ?? null;
  });
}

/** 辅助：根据 ROOT_ID 或节点 id 拿 TreeNode / props / path */
export interface SelectedInfo {
  isRoot: boolean;
  name: string;
  map: TreeMap;
  node: TreeNode | null;
  props: TreeNodeProp[];
  path: string[];
  siblings: TreeNode[];
}

export function selectInfo(
  map: TreeMap,
  selectedId: string | null,
): SelectedInfo | null {
  if (!map || selectedId == null) return null;
  if (selectedId === 'ROOT') {
    return {
      isRoot: true,
      name: map.title,
      map,
      node: null,
      props: map.props || [],
      path: [map.title],
      siblings: map.nodes || [],
    };
  }
  function iter(
    list: TreeNode[],
    path: string[],
    parentList: TreeNode[] | null,
  ): SelectedInfo | null {
    for (const n of list) {
      if (n.id === selectedId) {
        return {
          isRoot: false,
          name: n.name,
          map,
          node: n,
          props: n.props || [],
          path: [...path, n.name],
          siblings: (parentList ?? list).filter((x) => x.id !== n.id),
        };
      }
      const res = iter(n.children || [], [...path, n.name], n.children);
      if (res) return res;
    }
    return null;
  }
  return iter(map.nodes || [], [], null);
}
