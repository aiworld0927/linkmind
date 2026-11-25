import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { APP_CONFIG, type AppConfig } from '@/config/app';
import type {
  BreadItem,
  CanvasViewState,
  DisplayMode,
  GraphDataset,
  LevelHistory,
  ListItem,
  NodeDraft,
  NodeItem,
  OperationEntry,
  OperationResult,
} from '@/types';

type UnknownRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeDisplayMode = (value: unknown): DisplayMode => {
  const modes = APP_CONFIG.displayModeOptions.map((item) => item.value);
  return modes.includes(value as DisplayMode) ? (value as DisplayMode) : APP_CONFIG.defaultDisplayMode;
};

const normalizeTime = (value: unknown): string => {
  const time = asString(value);
  return time && !Number.isNaN(new Date(time).getTime())
    ? time
    : dayjs().format('YYYY-MM-DD HH:mm:ss');
};

const normalizeListItem = (raw: unknown, parentNodeId: string): ListItem | null => {
  if (!isRecord(raw)) return null;
  const content = asString(raw.content).trim();
  if (!content) return null;
  const item: ListItem = {
    id: asString(raw.id) || `note-${uuidv4()}`,
    content: content.slice(0, APP_CONFIG.limits.maxContentLength),
    tagList: asStringArray(raw.tagList).slice(0, 10),
    remark: asString(raw.remark).slice(0, APP_CONFIG.limits.maxRemarkLength),
    createTime: normalizeTime(raw.createTime),
    parentNodeId,
  };
  const updatedAt = asString(raw.updatedAt);
  if (updatedAt) item.updatedAt = updatedAt;
  return item;
};

const normalizeNode = (raw: unknown, index: number, seen: Set<string>): NodeItem | null => {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name).trim();
  if (!name) return null;

  let id = asString(raw.id) || `node-${uuidv4()}`;
  while (seen.has(id)) id = `${id}-${index}`;
  seen.add(id);

  const children = Array.isArray(raw.children)
    ? raw.children
        .slice(0, APP_CONFIG.limits.maxNotesPerNode)
        .map((child) => normalizeListItem(child, id))
        .filter((child): child is ListItem => child !== null)
    : [];

  const node: NodeItem = {
    id,
    name: name.slice(0, APP_CONFIG.limits.maxNameLength),
    dependencies: asStringArray(raw.dependencies),
    children,
    isExpanded: asBoolean(raw.isExpanded),
    displayMode: normalizeDisplayMode(raw.displayMode),
    createTime: normalizeTime(raw.createTime),
  };
  const updatedAt = asString(raw.updatedAt);
  if (updatedAt) node.updatedAt = updatedAt;
  return node;
};

export const normalizeNodeList = (raw: unknown): NodeItem[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .slice(0, APP_CONFIG.limits.maxImportNodes)
    .map((item, index) => normalizeNode(item, index, seen))
    .filter((item): item is NodeItem => item !== null);
};

export const normalizeBreadcrumbs = (raw: unknown): BreadItem[] =>
  Array.isArray(raw)
    ? raw
        .filter(isRecord)
        .map((item) => ({ id: asString(item.id), name: asString(item.name) }))
        .filter((item) => item.id && item.name)
    : [];

export const normalizeView = (raw: UnknownRecord) => {
  const currentNodes = normalizeNodeList(raw.currentNodes);
  if (currentNodes.length === 0) return null;

  const canvasViewRaw = isRecord(raw.canvasView) ? raw.canvasView : {};
  const zoom = Number(canvasViewRaw.zoom);
  const x = Number(canvasViewRaw.x);
  const y = Number(canvasViewRaw.y);
  const canvasView: CanvasViewState = {
    zoom: Number.isFinite(zoom) ? zoom : 1,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };

  const levelHistory: LevelHistory[] = Array.isArray(raw.levelHistory)
    ? raw.levelHistory
        .filter(isRecord)
        .map((entry) => ({
          levelId: asString(entry.levelId, 'root'),
          nodes: normalizeNodeList(entry.nodes),
          breadcrumbs: normalizeBreadcrumbs(entry.breadcrumbs),
        }))
        .filter((entry) => entry.nodes.length > 0)
    : [];

  return {
    currentNodes,
    currentLevelId: asString(raw.currentLevelId) || 'root',
    breadcrumbs: normalizeBreadcrumbs(raw.breadcrumbs),
    globalDisplayMode: normalizeDisplayMode(raw.globalDisplayMode),
    canvasView,
    levelHistory,
  };
};

export const normalizeOperationLog = (raw: unknown): OperationEntry[] =>
  Array.isArray(raw)
    ? raw
        .filter(isRecord)
        .map((entry) => {
          const item: OperationEntry = {
            id: asString(entry.id) || uuidv4(),
            type: (asString(entry.type, 'update-node') as OperationEntry['type']),
            summary: asString(entry.summary, '历史操作'),
            time: normalizeTime(entry.time),
            undoable: asBoolean(entry.undoable),
          };
          const targetId = asString(entry.targetId);
          const targetName = asString(entry.targetName);
          if (targetId) item.targetId = targetId;
          if (targetName) item.targetName = targetName;
          return item;
        })
        .slice(0, APP_CONFIG.limits.operationLogSize)
    : [];

export interface NormalizedImport {
  dataset: GraphDataset;
  view: ReturnType<typeof normalizeView>;
  operationLog: OperationEntry[];
}

const unwrapPayload = (raw: unknown): UnknownRecord | null => {
  if (!isRecord(raw)) return null;
  // 兼容后端统一响应 { code, msg, data }
  if (isRecord(raw.data) && !isRecord(raw.dataset) && !Array.isArray(raw.nodes) && !Array.isArray(raw.currentNodes)) {
    return raw.data;
  }
  return raw;
};

/**
 * 将任意来源（导出文件 / 外部系统 / 数据集直传）的数据归一化为内部数据集。
 * 数据不合法时返回明确错误，调用方据此提示，不产生任何副作用。
 */
export function normalizeImportPayload(raw: unknown): { ok: true; value: NormalizedImport } | { ok: false; message: string } {
  const payload = unwrapPayload(raw);
  if (!payload) return { ok: false, message: '数据格式不正确：根结构必须是 JSON 对象' };

  let dataset: GraphDataset;
  let view: ReturnType<typeof normalizeView> = null;
  let operationLog: OperationEntry[] = [];

  if (isRecord(payload.dataset) && Array.isArray(payload.dataset.nodes)) {
    const nodes = normalizeNodeList(payload.dataset.nodes);
    if (nodes.length === 0) return { ok: false, message: '数据集中没有任何有效节点' };
    const item: GraphDataset = {
      id: asString(payload.dataset.id) || `dataset-imported-${Date.now()}`,
      title: asString(payload.dataset.title) || '导入的数据集',
      nodes,
    };
    const description = asString(payload.dataset.description);
    if (description) item.description = description;
    dataset = item;
    view = normalizeView(payload);
  } else if (Array.isArray(payload.nodes)) {
    const nodes = normalizeNodeList(payload.nodes);
    if (nodes.length === 0) return { ok: false, message: '数据集中没有任何有效节点' };
    dataset = {
      id: asString(payload.id) || `dataset-imported-${Date.now()}`,
      title: asString(payload.title) || '导入的数据集',
      nodes,
    };
  } else if (Array.isArray(payload.currentNodes)) {
    const nodes = normalizeNodeList(payload.currentNodes);
    if (nodes.length === 0) return { ok: false, message: '备份文件中没有任何有效节点' };
    dataset = {
      id: `dataset-imported-${Date.now()}`,
      title: asString(payload.title) || '导入的备份',
      nodes,
    };
    view = normalizeView(payload);
    operationLog = normalizeOperationLog(payload.operationLog);
  } else {
    return { ok: false, message: '未找到可导入的节点数据（nodes / currentNodes）' };
  }

  // 清理指向不存在节点的依赖，保证图数据自洽
  const ids = new Set(dataset.nodes.map((node) => node.id));
  dataset.nodes = dataset.nodes.map((node) => ({
    ...node,
    dependencies: node.dependencies.filter((id) => ids.has(id) && id !== node.id),
  }));

  return { ok: true, value: { dataset, view, operationLog } };
}

/** 依赖成环检测 */
export function detectCycle(nodes: NodeItem[], dependencies: string[], selfId: string): boolean {
  const visited = new Set<string>();
  const stack = [...dependencies];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) continue;
    if (currentId === selfId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const current = nodes.find((node) => node.id === currentId);
    if (current) stack.push(...current.dependencies);
  }
  return false;
}

/** 同层节点重名检测 */
export function hasDuplicateName(nodes: NodeItem[], name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return nodes.some((node) => node.id !== excludeId && node.name.trim().toLowerCase() === normalized);
}

export interface ValidatedDraft {
  draft: NodeDraft;
}

/** 校验节点草稿（新增/编辑共用） */
export function validateNodeDraft(
  nodes: NodeItem[],
  input: NodeDraft,
  excludeId?: string,
): { ok: true; value: ValidatedDraft } | { ok: false; message: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, message: '节点名称不能为空' };
  if (name.length > APP_CONFIG.limits.maxNameLength) {
    return { ok: false, message: `节点名称不能超过 ${APP_CONFIG.limits.maxNameLength} 个字符` };
  }
  if (hasDuplicateName(nodes, name, excludeId)) return { ok: false, message: `节点名称「${name}」已存在` };
  const selfId = excludeId ?? '__new__';
  if (detectCycle(nodes, input.dependencies, selfId)) {
    return { ok: false, message: '检测到循环依赖，请调整依赖关系' };
  }
  return {
    ok: true,
    value: {
      draft: {
        name,
        dependencies: [...new Set(input.dependencies)],
        displayMode: normalizeDisplayMode(input.displayMode),
      },
    },
  };
}

/** 校验笔记草稿 */
export function validateNoteDraft(input: { content: string; tagList: string[]; remark: string }): OperationResult {
  if (!input.content.trim()) return { ok: false, message: '笔记内容不能为空' };
  if (input.content.length > APP_CONFIG.limits.maxContentLength) {
    return { ok: false, message: `笔记内容不能超过 ${APP_CONFIG.limits.maxContentLength} 个字符` };
  }
  if (input.remark.length > APP_CONFIG.limits.maxRemarkLength) {
    return { ok: false, message: `备注不能超过 ${APP_CONFIG.limits.maxRemarkLength} 个字符` };
  }
  return { ok: true, message: '校验通过' };
}

/** 从外部读取的数据做基本结构判断，用于友好的错误提示 */
export function describePayloadShape(raw: unknown): string {
  if (Array.isArray(raw)) return '数组';
  if (isRecord(raw)) return `对象（字段：${Object.keys(raw).slice(0, 6).join(', ')}）`;
  return typeof raw;
}

export const limitConfig = (): AppConfig['limits'] => APP_CONFIG.limits;
