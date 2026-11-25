/**
 * 领域模型定义。
 * 视图层只依赖这些类型，不直接依赖任何具体数据来源。
 */

export type DisplayMode = 'inner' | 'popover' | 'drawer';

export interface ListItem {
  id: string;
  content: string;
  tagList: string[];
  remark: string;
  createTime: string;
  updatedAt?: string;
  parentNodeId: string;
}

export interface NodeItem {
  id: string;
  name: string;
  dependencies: string[];
  children: ListItem[];
  isExpanded: boolean;
  displayMode: DisplayMode;
  createTime: string;
  updatedAt?: string;
}

export interface NodeDraft {
  name: string;
  dependencies: string[];
  displayMode: DisplayMode;
}

export interface NoteDraft {
  content: string;
  tagList: string[];
  remark: string;
}

export interface BreadItem {
  id: string;
  name: string;
}

export interface CanvasViewState {
  zoom: number;
  x: number;
  y: number;
}

export interface DatasetMeta {
  id: string;
  title: string;
  description?: string;
}

export interface GraphDataset extends DatasetMeta {
  nodes: NodeItem[];
}

export interface LevelHistory {
  levelId: string;
  nodes: NodeItem[];
  breadcrumbs: BreadItem[];
}

export type OperationType =
  | 'create-node'
  | 'update-node'
  | 'delete-node'
  | 'toggle-node'
  | 'create-note'
  | 'update-note'
  | 'delete-note'
  | 'create-link'
  | 'update-link'
  | 'delete-link'
  | 'import'
  | 'reset'
  | 'switch-dataset'
  | 'create-dataset'
  | 'update-dataset'
  | 'delete-dataset'
  | 'undo';

export interface OperationEntry {
  id: string;
  type: OperationType;
  summary: string;
  targetId?: string;
  targetName?: string;
  time: string;
  undoable: boolean;
}

export interface OperationResult {
  ok: boolean;
  message: string;
}

/** 画布视图快照，用于导出与持久化 */
export interface CanvasViewPayload {
  currentLevelId: string;
  currentNodes: NodeItem[];
  breadcrumbs: BreadItem[];
  globalDisplayMode: DisplayMode;
  canvasView: CanvasViewState;
  levelHistory: LevelHistory[];
}

/** 导出格式 v2 */
export interface ExportDataPayload extends CanvasViewPayload {
  version: string;
  exportTime: string;
  dataset: GraphDataset;
  operationLog: OperationEntry[];
}

/** 兼容旧版本（v1）以及数据集直传的导入格式 */
export interface ImportDataPayload {
  version?: string;
  exportTime?: string;
  dataset?: GraphDataset;
  currentNodes?: NodeItem[];
  currentLevelId?: string;
  breadcrumbs?: BreadItem[];
  globalDisplayMode?: DisplayMode;
  canvasView?: CanvasViewState;
  levelHistory?: LevelHistory[];
  operationLog?: OperationEntry[];
}

/** 画布控制器：供工具栏等外部组件调用画布能力，避免直接依赖 X6 */
export interface CanvasController {
  fit: () => void;
  center: () => void;
  zoom: (factor: number) => void;
  relayout: () => void;
}
