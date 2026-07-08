import { create } from 'zustand';
import type { NodeItem, ListItem, BreadItem, CanvasViewState, DisplayMode } from '@/types';
import { saveToStorage, loadFromStorage } from '@/utils/storage';
import { mockData } from '@/data/mock';
import { v4 as uuidv4 } from 'uuid';

interface LevelHistory {
  levelId: string;
  nodes: NodeItem[];
  breadcrumbs: BreadItem[];
}

interface CanvasStore {
  currentNodes: NodeItem[];
  currentLevelId: string;
  breadcrumbs: BreadItem[];
  globalDisplayMode: DisplayMode;
  canvasView: CanvasViewState;
  searchKeyword: string;
  popoverVisibleNodeId: string | null;
  drawerVisible: boolean;
  drawerTargetNodeId: string | null;
  isLoading: boolean;
  levelHistory: LevelHistory[];

  addNode: (node: NodeItem) => void;
  updateNode: (nodeId: string, patch: Partial<NodeItem>) => void;
  deleteNode: (nodeId: string, isCascade: boolean) => void;
  toggleNodeExpand: (nodeId: string) => void;

  addListItem: (parentNodeId: string, item: Omit<ListItem, 'id' | 'createTime' | 'parentNodeId'>) => void;
  updateListItem: (parentNodeId: string, itemId: string, patch: Partial<ListItem>) => void;
  deleteListItem: (parentNodeId: string, itemIdList: string[]) => void;

  drillDown: (targetNodeId: string) => void;
  backToBreadLevel: (targetIndex: number) => void;
  resetToRoot: () => void;

  setGlobalDisplayMode: (mode: DisplayMode) => void;
  openPopover: (nodeId: string) => void;
  closePopover: () => void;
  openDrawer: (nodeId: string) => void;
  closeDrawer: () => void;

  setCanvasView: (view: Partial<CanvasViewState>) => void;
  setSearchKeyword: (keyword: string) => void;

  checkCircleDepend: (nodeList: NodeItem[], newDependIds: string[], selfId: string) => boolean;
  checkNodeNameRepeat: (nodeList: NodeItem[], name: string, excludeId?: string) => boolean;

  loadFromStorage: () => void;
  initMockData: () => void;
  syncToStorage: () => void;

  exportData: () => ExportDataPayload;
  importData: (data: ImportDataPayload) => void;
}

interface ExportDataPayload {
  version: string;
  exportTime: string;
  currentNodes: NodeItem[];
  currentLevelId: string;
  breadcrumbs: BreadItem[];
  globalDisplayMode: DisplayMode;
  canvasView: CanvasViewState;
  levelHistory: LevelHistory[];
}

interface ImportDataPayload {
  version?: string;
  exportTime?: string;
  currentNodes: NodeItem[];
  currentLevelId?: string;
  breadcrumbs?: BreadItem[];
  globalDisplayMode?: DisplayMode;
  canvasView?: CanvasViewState;
  levelHistory?: LevelHistory[];
}

const ROOT_LEVEL_ID = 'root';

const defaultCanvasView: CanvasViewState = {
  zoom: 1,
  x: 0,
  y: 0,
};

function convertListItemToNodeItem(listItem: ListItem): NodeItem {
  return {
    id: listItem.id,
    name: listItem.content.substring(0, 20) + (listItem.content.length > 20 ? '...' : ''),
    dependencies: [],
    children: [],
    isExpanded: false,
    displayMode: 'inner',
    createTime: listItem.createTime,
  };
}

export const useStore = create<CanvasStore>((set, get) => ({
  currentNodes: [],
  currentLevelId: ROOT_LEVEL_ID,
  breadcrumbs: [],
  globalDisplayMode: 'inner',
  canvasView: defaultCanvasView,
  searchKeyword: '',
  popoverVisibleNodeId: null,
  drawerVisible: false,
  drawerTargetNodeId: null,
  isLoading: false,
  levelHistory: [],

  addNode: (node: NodeItem) => {
    const state = get();
    if (state.checkNodeNameRepeat(state.currentNodes, node.name)) {
      console.warn('Node name already exists:', node.name);
      return;
    }
    set((prev) => ({
      currentNodes: [...prev.currentNodes, node],
    }));
    get().syncToStorage();
  },

  updateNode: (nodeId: string, patch: Partial<NodeItem>) => {
    const state = get();
    if (patch.name && state.checkNodeNameRepeat(state.currentNodes, patch.name, nodeId)) {
      console.warn('Node name already exists:', patch.name);
      return;
    }
    if (patch.dependencies && state.checkCircleDepend(state.currentNodes, patch.dependencies, nodeId)) {
      console.warn('Circular dependency detected');
      return;
    }
    set((prev) => ({
      currentNodes: prev.currentNodes.map((node) =>
        node.id === nodeId ? { ...node, ...patch } : node
      ),
    }));
    get().syncToStorage();
  },

  deleteNode: (nodeId: string, isCascade: boolean) => {
    set((prev) => {
      let newNodes = prev.currentNodes.filter((node) => node.id !== nodeId);
      if (isCascade) {
        const dependentIds = new Set<string>();
        const findDependents = (id: string) => {
          newNodes.forEach((node) => {
            if (node.dependencies.includes(id)) {
              dependentIds.add(node.id);
              findDependents(node.id);
            }
          });
        };
        findDependents(nodeId);
        newNodes = newNodes.filter((node) => !dependentIds.has(node.id));
      } else {
        newNodes = newNodes.map((node) => ({
          ...node,
          dependencies: node.dependencies.filter((id) => id !== nodeId),
        }));
      }

      const breadcrumbIndex = prev.breadcrumbs.findIndex((b) => b.id === nodeId);
      let newBreadcrumbs = prev.breadcrumbs;
      let newLevelId = prev.currentLevelId;
      let newHistory = prev.levelHistory;

      if (breadcrumbIndex !== -1) {
        newBreadcrumbs = prev.breadcrumbs.slice(0, breadcrumbIndex);
        newLevelId = newBreadcrumbs.length > 0 
          ? newBreadcrumbs[newBreadcrumbs.length - 1].id 
          : ROOT_LEVEL_ID;
        newHistory = prev.levelHistory.slice(0, breadcrumbIndex);

        if (newHistory.length > 0) {
          const lastHistory = newHistory[newHistory.length - 1];
          newNodes = lastHistory.nodes;
        } else {
          newNodes = mockData;
        }
      }

      return { 
        currentNodes: newNodes,
        breadcrumbs: newBreadcrumbs,
        currentLevelId: newLevelId,
        levelHistory: newHistory,
      };
    });
    get().syncToStorage();
  },

  toggleNodeExpand: (nodeId: string) => {
    set((prev) => ({
      currentNodes: prev.currentNodes.map((node) =>
        node.id === nodeId ? { ...node, isExpanded: !node.isExpanded } : node
      ),
    }));
    get().syncToStorage();
  },

  addListItem: (parentNodeId: string, item: Omit<ListItem, 'id' | 'createTime' | 'parentNodeId'>) => {
    const newItem: ListItem = {
      ...item,
      id: uuidv4(),
      createTime: new Date().toISOString(),
      parentNodeId,
    };
    set((prev) => ({
      currentNodes: prev.currentNodes.map((node) =>
        node.id === parentNodeId
          ? { ...node, children: [...node.children, newItem] }
          : node
      ),
    }));
    get().syncToStorage();
  },

  updateListItem: (parentNodeId: string, itemId: string, patch: Partial<ListItem>) => {
    set((prev) => ({
      currentNodes: prev.currentNodes.map((node) =>
        node.id === parentNodeId
          ? {
              ...node,
              children: node.children.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item
              ),
            }
          : node
      ),
    }));
    get().syncToStorage();
  },

  deleteListItem: (parentNodeId: string, itemIdList: string[]) => {
    set((prev) => ({
      currentNodes: prev.currentNodes.map((node) =>
        node.id === parentNodeId
          ? {
              ...node,
              children: node.children.filter((item) => !itemIdList.includes(item.id)),
            }
          : node
      ),
    }));
    get().syncToStorage();
  },

  drillDown: (targetNodeId: string) => {
    const state = get();
    const node = state.currentNodes.find((n) => n.id === targetNodeId);
    if (!node) return;

    set({ isLoading: true });

    setTimeout(() => {
      const newBreadcrumbs = [...state.breadcrumbs, { id: node.id, name: node.name }];

      const historyEntry: LevelHistory = {
        levelId: state.currentLevelId,
        nodes: state.currentNodes.map((n) => ({ ...n })),
        breadcrumbs: [...state.breadcrumbs],
      };

      const childNodes = node.children.map((child) =>
        convertListItemToNodeItem(child)
      );

      set({
        currentLevelId: targetNodeId,
        breadcrumbs: newBreadcrumbs,
        currentNodes: childNodes,
        canvasView: defaultCanvasView,
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        levelHistory: [...state.levelHistory, historyEntry],
        isLoading: false,
      });
      get().syncToStorage();
    }, 100);
  },

  backToBreadLevel: (targetIndex: number) => {
    const state = get();
    if (targetIndex < 0 || targetIndex > state.breadcrumbs.length) return;

    set({ isLoading: true });

    setTimeout(() => {
      const newBreadcrumbs = state.breadcrumbs.slice(0, targetIndex);
      const newHistory = state.levelHistory.slice(0, targetIndex);

      let newNodes: NodeItem[];
      let newLevelId: string;

      if (newHistory.length > 0) {
        const targetHistory = newHistory[newHistory.length - 1];
        newNodes = targetHistory.nodes.map((n) => ({ ...n }));
        newLevelId = targetHistory.levelId;
      } else {
        newNodes = mockData;
        newLevelId = ROOT_LEVEL_ID;
      }

      set({
        breadcrumbs: newBreadcrumbs,
        currentLevelId: newLevelId,
        currentNodes: newNodes,
        canvasView: defaultCanvasView,
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        levelHistory: newHistory,
        isLoading: false,
      });
      get().syncToStorage();
    }, 100);
  },

  resetToRoot: () => {
    set({ isLoading: true });

    setTimeout(() => {
      set({
        currentLevelId: ROOT_LEVEL_ID,
        breadcrumbs: [],
        currentNodes: mockData,
        canvasView: defaultCanvasView,
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        levelHistory: [],
        isLoading: false,
      });
      get().syncToStorage();
    }, 100);
  },

  setGlobalDisplayMode: (mode: DisplayMode) => {
    set({ globalDisplayMode: mode });
    get().syncToStorage();
  },

  openPopover: (nodeId: string) => {
    set({ popoverVisibleNodeId: nodeId });
  },

  closePopover: () => {
    set({ popoverVisibleNodeId: null });
  },

  openDrawer: (nodeId: string) => {
    set({ drawerVisible: true, drawerTargetNodeId: nodeId });
  },

  closeDrawer: () => {
    set({ drawerVisible: false, drawerTargetNodeId: null });
  },

  setCanvasView: (view: Partial<CanvasViewState>) => {
    set((prev) => ({
      canvasView: { ...prev.canvasView, ...view },
    }));
    get().syncToStorage();
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  checkCircleDepend: (nodeList: NodeItem[], newDependIds: string[], selfId: string): boolean => {
    const visited = new Set<string>();
    const stack = [...newDependIds];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId) continue;

      if (currentId === selfId) {
        return true;
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = nodeList.find((n) => n.id === currentId);
      if (currentNode) {
        stack.push(...currentNode.dependencies);
      }
    }

    return false;
  },

  checkNodeNameRepeat: (nodeList: NodeItem[], name: string, excludeId?: string): boolean => {
    return nodeList.some(
      (node) => node.name === name && node.id !== excludeId
    );
  },

  loadFromStorage: () => {
    const data = loadFromStorage();
    if (data) {
      set({
        currentNodes: data.currentNodes,
        currentLevelId: data.currentLevelId,
        breadcrumbs: data.breadcrumbs,
        globalDisplayMode: data.globalDisplayMode,
        canvasView: data.canvasView,
      });
    } else {
      get().initMockData();
    }
  },

  initMockData: () => {
    set({
      currentNodes: mockData,
      currentLevelId: ROOT_LEVEL_ID,
      breadcrumbs: [],
      globalDisplayMode: 'inner',
      canvasView: defaultCanvasView,
      levelHistory: [],
    });
    get().syncToStorage();
  },

  syncToStorage: () => {
    const { currentNodes, currentLevelId, breadcrumbs, globalDisplayMode, canvasView } = get();
    saveToStorage({
      currentNodes,
      currentLevelId,
      breadcrumbs,
      globalDisplayMode,
      canvasView,
    });
  },

  exportData: () => {
    const state = get();
    return {
      version: '1.0',
      exportTime: new Date().toISOString(),
      currentNodes: state.currentNodes,
      currentLevelId: state.currentLevelId,
      breadcrumbs: state.breadcrumbs,
      globalDisplayMode: state.globalDisplayMode,
      canvasView: state.canvasView,
      levelHistory: state.levelHistory,
    };
  },

  importData: (data: ImportDataPayload) => {
    set({ isLoading: true });

    setTimeout(() => {
      const {
        currentNodes = [],
        currentLevelId = ROOT_LEVEL_ID,
        breadcrumbs = [],
        globalDisplayMode = 'inner',
        canvasView = defaultCanvasView,
        levelHistory = [],
      } = data;

      set({
        currentNodes: JSON.parse(JSON.stringify(currentNodes)) as NodeItem[],
        currentLevelId,
        breadcrumbs: JSON.parse(JSON.stringify(breadcrumbs)) as BreadItem[],
        globalDisplayMode,
        canvasView,
        levelHistory: JSON.parse(JSON.stringify(levelHistory)) as LevelHistory[],
        searchKeyword: '',
        popoverVisibleNodeId: null,
        drawerVisible: false,
        drawerTargetNodeId: null,
        isLoading: false,
      });
      get().syncToStorage();
    }, 100);
  },
}));
