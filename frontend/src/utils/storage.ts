import { APP_CONFIG, DEFAULT_CANVAS_VIEW, ROOT_LEVEL_ID } from '@/config/app';
import type {
  BreadItem,
  CanvasViewState,
  DisplayMode,
  GraphDataset,
  LevelHistory,
  NodeItem,
  OperationEntry,
} from '@/types';
import {
  isRecord,
  normalizeBreadcrumbs,
  normalizeNodeList,
  normalizeOperationLog,
  normalizeView,
} from '@/utils/validation';

/** 持久化会话：数据层与视图层之间唯一的传输结构 */
export interface PersistedSession {
  storageVersion: number;
  activeDatasetId: string;
  datasets: GraphDataset[];
  currentNodes: NodeItem[];
  currentLevelId: string;
  breadcrumbs: BreadItem[];
  globalDisplayMode: DisplayMode;
  canvasView: CanvasViewState;
  levelHistory: LevelHistory[];
  operationLog: OperationEntry[];
}

const normalizeDatasetEntry = (raw: unknown): GraphDataset | null => {
  if (!isRecord(raw)) return null;
  const nodes = normalizeNodeList(raw.nodes);
  if (nodes.length === 0) return null;
  const dataset: GraphDataset = {
    id: typeof raw.id === 'string' ? raw.id : `dataset-${Date.now()}`,
    title: typeof raw.title === 'string' && raw.title ? raw.title : '未命名数据集',
    nodes,
  };
  if (typeof raw.description === 'string' && raw.description) dataset.description = raw.description;
  return dataset;
};

const isDisplayMode = (value: unknown): value is DisplayMode =>
  value === 'inner' || value === 'popover' || value === 'drawer';

const buildSession = (raw: Record<string, unknown>): PersistedSession | null => {
  const datasets = Array.isArray(raw.datasets)
    ? raw.datasets
        .map(normalizeDatasetEntry)
        .filter((item): item is GraphDataset => item !== null)
    : [];

  const view = normalizeView(raw);
  let currentNodes = view?.currentNodes ?? normalizeNodeList(raw.currentNodes);

  if (datasets.length === 0) {
    if (currentNodes.length === 0) return null;
    datasets.push({
      id: 'dataset-restored',
      title: '我的画布',
      description: '从本地存储恢复的数据',
      nodes: currentNodes,
    });
  }

  const activeDatasetId =
    typeof raw.activeDatasetId === 'string' && datasets.some((item) => item.id === raw.activeDatasetId)
      ? raw.activeDatasetId
      : datasets[0].id;

  if (currentNodes.length === 0) {
    const active = datasets.find((item) => item.id === activeDatasetId);
    currentNodes = active ? active.nodes : datasets[0].nodes;
  }

  const canvasViewRaw = isRecord(raw.canvasView) ? raw.canvasView : {};
  const zoom = Number(canvasViewRaw.zoom);
  const x = Number(canvasViewRaw.x);
  const y = Number(canvasViewRaw.y);

  const breadcrumbs = normalizeBreadcrumbs(raw.breadcrumbs);
  const levelHistory = Array.isArray(raw.levelHistory)
    ? raw.levelHistory
        .filter(isRecord)
        .map((entry) => ({
          levelId: typeof entry.levelId === 'string' ? entry.levelId : ROOT_LEVEL_ID,
          nodes: normalizeNodeList(entry.nodes),
          breadcrumbs: normalizeBreadcrumbs(entry.breadcrumbs),
        }))
        .filter((entry) => entry.nodes.length > 0)
    : [];

  return {
    storageVersion: APP_CONFIG.storageVersion,
    activeDatasetId,
    datasets,
    currentNodes,
    currentLevelId:
      typeof raw.currentLevelId === 'string' && raw.currentLevelId ? raw.currentLevelId : ROOT_LEVEL_ID,
    breadcrumbs,
    globalDisplayMode: isDisplayMode(raw.globalDisplayMode)
      ? raw.globalDisplayMode
      : APP_CONFIG.defaultDisplayMode,
    canvasView: {
      zoom: Number.isFinite(zoom) ? zoom : DEFAULT_CANVAS_VIEW.zoom,
      x: Number.isFinite(x) ? x : DEFAULT_CANVAS_VIEW.x,
      y: Number.isFinite(y) ? y : DEFAULT_CANVAS_VIEW.y,
    },
    levelHistory,
    operationLog: normalizeOperationLog(raw.operationLog),
  };
};

export function loadSession(): { ok: boolean; data: PersistedSession | null; message: string } {
  try {
    const stored = localStorage.getItem(APP_CONFIG.storageKey);
    if (!stored) return { ok: true, data: null, message: '本地暂无数据' };
    const raw: unknown = JSON.parse(stored);
    if (!isRecord(raw)) return { ok: false, data: null, message: '本地数据格式无效' };
    const session = buildSession(raw);
    if (!session) return { ok: true, data: null, message: '本地无有效数据' };
    return { ok: true, data: session, message: '加载成功' };
  } catch (error) {
    console.error('[linkmind] 读取本地数据失败:', error);
    return { ok: false, data: null, message: '读取本地数据失败，已使用默认数据' };
  }
}

export function saveSession(session: PersistedSession): { ok: boolean; message: string } {
  try {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(session));
    return { ok: true, message: '保存成功' };
  } catch (error) {
    console.error('[linkmind] 写入本地数据失败:', error);
    return { ok: false, message: '保存失败，本地存储空间可能已满' };
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(APP_CONFIG.storageKey);
  } catch (error) {
    console.error('[linkmind] 清除本地数据失败:', error);
  }
}
