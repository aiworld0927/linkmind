import { create } from 'zustand';
import type {
  RepoRef,
  TreeNode,
  TreeNodeProp,
  TreeMap,
} from '@/types';
import { SEED_MAPS, cloneMaps } from '@/config/maps';
import { newId, stamp } from '@/utils/ids';
import { VIEW_MAX_K, VIEW_MIN_K } from '@/utils/layout';

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
function findNode(map: TreeMap, id: string): { node: TreeNode; parent: TreeNode | null; parentIsMap: boolean } | null {
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

  // —— 地图 CRUD ——
  createMap: (title: string, desc?: string) => TreeMap;
  updateMap: (mapId: string, patch: { title?: string; desc?: string; repo?: RepoRef | null }) => void;
  deleteMap: (mapId: string) => void;
  importMap: (map: TreeMap) => void;

  // —— 节点 CRUD ——
  addNode: (parentId: string, name: string) => TreeNode;
  renameNode: (nodeId: string, name: string) => void;
  deleteNode: (nodeId: string) => void;

  // —— 属性 CRUD ——
  addProp: (nodeId: string, prop: TreeNodeProp) => void;
  updateProp: (nodeId: string, idx: number, prop: TreeNodeProp) => void;
  deleteProp: (nodeId: string, idx: number) => void;

  // —— 内部工具 ——
  logOp: (text: string) => void;
  exportMaps: () => void;
}

function initialState(): {
  maps: TreeMap[];
} {
  return { maps: cloneMaps(SEED_MAPS) };
}

export const useAppStore = create<StoreState>((set, get) => {
  const { maps: initialMaps } = initialState();

  const logOp = (text: string): void => {
    set((s) => {
      const next = [{ t: stamp(), text }, ...s.log];
      if (next.length > MAX_LOG) next.length = MAX_LOG;
      return { log: next };
    });
  };

  return {
    maps: initialMaps,
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
      // 收起到一级：清 folded 后把所有顶层节点（ROOT 的 children）收起来
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
      // 具体 fit 计算需要画布尺寸，在 MindCanvas 组件里做，这里只是占位——实际调用组件内部 fit()。
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

    // 地图 CRUD
    createMap: (title, desc) => {
      const newMap: TreeMap = {
        id: 'map-' + newId(),
        title,
        desc: desc || '',
        props: [],
        nodes: [],
      };
      set((s) => ({ maps: [...s.maps, newMap] }));
      logOp(`新建地图：${title}`);
      return newMap;
    },
    updateMap: (mapId, patch) => {
      set((s) => ({
        maps: s.maps.map((m) => (m.id === mapId ? { ...m, ...patch } : m)),
      }));
      logOp(`修改地图：${patch.title ?? ''}`);
    },
    deleteMap: (mapId) => {
      set((s) => ({
        maps: s.maps.filter((m) => m.id !== mapId),
        activeMapId: s.activeMapId === mapId ? null : s.activeMapId,
        selectedId: s.activeMapId === mapId ? null : s.selectedId,
      }));
      logOp('删除地图');
    },
    importMap: (map) => {
      set((s) => {
        if (s.maps.some((m) => m.title === map.title)) {
          return { maps: s.maps }; // 保留，由调用者在 store 外做重命名或提示
        }
        return { maps: [...s.maps, map] };
      });
      logOp(`导入知识地图：${map.title}`);
    },

    // 节点 CRUD
    addNode: (parentId, name) => {
      const node: TreeNode = { id: newId(), name, props: [], children: [] };
      set((s) => {
        if (!s.activeMapId) return {};
        const maps = s.maps.map((m) => {
          if (m.id !== s.activeMapId) return m;
          // 深拷贝 map
          const nm: TreeMap = JSON.parse(JSON.stringify(m));
          if (parentId === 'ROOT') {
            nm.nodes = [...(nm.nodes || []), node];
          } else {
            const hit = findNode(nm, parentId);
            if (!hit) return nm;
            hit.node.children = [...(hit.node.children || []), node];
          }
          return nm;
        });
        return { maps, collapsed: new Set(s.collapsed) };
      });
      logOp(`新增节点：${name}`);
      return node;
    },
    renameNode: (nodeId, name) => {
      set((s) => {
        if (!s.activeMapId) return {};
        const maps = s.maps.map((m) => {
          if (m.id !== s.activeMapId) return m;
          const nm: TreeMap = JSON.parse(JSON.stringify(m));
          if (nodeId === 'ROOT') {
            nm.title = name;
          } else {
            const hit = findNode(nm, nodeId);
            if (hit) hit.node.name = name;
          }
          return nm;
        });
        return { maps };
      });
      logOp(`修改节点：${name}`);
    },
    deleteNode: (nodeId) => {
      set((s) => {
        if (!s.activeMapId) return {};
        const maps = s.maps.map((m) => {
          if (m.id !== s.activeMapId) return m;
          const nm: TreeMap = JSON.parse(JSON.stringify(m));
          const hit = findNode(nm, nodeId);
          if (!hit) return nm;
          if (hit.parentIsMap) {
            nm.nodes = (nm.nodes || []).filter((x) => x.id !== hit.node.id);
          } else if (hit.parent) {
            hit.parent.children = (hit.parent.children || []).filter((x) => x.id !== hit.node.id);
          }
          return nm;
        });
        return {
          maps,
          selectedId: s.selectedId === nodeId ? 'ROOT' : s.selectedId,
        };
      });
      logOp('删除节点');
    },

    // 属性 CRUD
    addProp: (nodeId, prop) => {
      set((s) => {
        if (!s.activeMapId) return {};
        const maps = s.maps.map((m) => {
          if (m.id !== s.activeMapId) return m;
          const nm: TreeMap = JSON.parse(JSON.stringify(m));
          if (nodeId === 'ROOT') {
            nm.props = [...(nm.props || []), prop];
          } else {
            const hit = findNode(nm, nodeId);
            if (!hit) return nm;
            hit.node.props = [...(hit.node.props || []), prop];
          }
          return nm;
        });
        return { maps };
      });
      logOp(`新增属性：${prop.label}`);
    },
    updateProp: (nodeId, idx, prop) => {
      set((s) => {
        if (!s.activeMapId) return {};
        const maps = s.maps.map((m) => {
          if (m.id !== s.activeMapId) return m;
          const nm: TreeMap = JSON.parse(JSON.stringify(m));
          if (nodeId === 'ROOT') {
            nm.props = (nm.props || []).map((p, i) => (i === idx ? prop : p));
          } else {
            const hit = findNode(nm, nodeId);
            if (!hit) return nm;
            hit.node.props = (hit.node.props || []).map((p, i) => (i === idx ? prop : p));
          }
          return nm;
        });
        return { maps };
      });
      logOp(`修改属性：${prop.label}`);
    },
    deleteProp: (nodeId, idx) => {
      set((s) => {
        if (!s.activeMapId) return {};
        const maps = s.maps.map((m) => {
          if (m.id !== s.activeMapId) return m;
          const nm: TreeMap = JSON.parse(JSON.stringify(m));
          if (nodeId === 'ROOT') {
            nm.props = (nm.props || []).filter((_, i) => i !== idx);
          } else {
            const hit = findNode(nm, nodeId);
            if (!hit) return nm;
            hit.node.props = (hit.node.props || []).filter((_, i) => i !== idx);
          }
          return nm;
        });
        return { maps };
      });
      logOp('删除属性');
    },

    logOp,
    exportMaps: () => {
      const { maps } = get();
      const payload = {
        app: 'LinkMind',
        version: 1,
        exportedAt: new Date().toISOString(),
        maps,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'linkmind-maps.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      logOp(`导出数据：${maps.length} 张地图`);
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
          // path 只含节点层级，不含 map.title（避免顶层节点与地图同名时重复）
          path: [...path, n.name],
          siblings: (parentList ?? list).filter((x) => x.id !== n.id),
        };
      }
      const res = iter(n.children || [], [...path, n.name], n.children);
      if (res) return res;
    }
    return null;
  }
  // path 从第一层节点开始，不含 map.title
  return iter(map.nodes || [], [], null);
}
