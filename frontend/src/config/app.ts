import type { DisplayMode } from '@/types';

export interface NodeMetricsConfig {
  width: number;
  minHeight: number;
  headerHeight: number;
  noteRowHeight: number;
  noteListPadding: number;
  radius: number;
}

export interface LayoutConfig {
  /** 宽屏下的最大列数 */
  columns: number;
  gapX: number;
  gapY: number;
  /** 内容距画布边缘的最小留白 */
  padding: number;
  /** 缩放后允许的最小/最大比例 */
  minZoom: number;
  maxZoom: number;
}

export interface AppConfig {
  appName: string;
  version: string;
  storageKey: string;
  storageVersion: number;
  palette: string[];
  node: NodeMetricsConfig;
  layout: LayoutConfig;
  limits: {
    maxNameLength: number;
    maxContentLength: number;
    maxRemarkLength: number;
    maxNotesPerNode: number;
    operationLogSize: number;
    undoDepth: number;
    maxImportNodes: number;
  };
  displayModeOptions: Array<{ value: DisplayMode; label: string }>;
  defaultDisplayMode: DisplayMode;
}

export const APP_CONFIG: AppConfig = {
  appName: 'LinkMind 知识地图',
  version: '2.0.0',
  storageKey: 'linkmind_canvas_data',
  storageVersion: 2,
  palette: ['#1d4ed8', '#0f766e', '#b45309', '#7e22ce', '#b91c1c', '#0369a1', '#4d7c0f', '#a16207'],
  node: {
    width: 240,
    minHeight: 60,
    headerHeight: 52,
    noteRowHeight: 104,
    noteListPadding: 88,
    radius: 8,
  },
  layout: {
    columns: 3,
    gapX: 48,
    gapY: 40,
    padding: 40,
    minZoom: 0.2,
    maxZoom: 2.5,
  },
  limits: {
    maxNameLength: 60,
    maxContentLength: 500,
    maxRemarkLength: 200,
    maxNotesPerNode: 100,
    operationLogSize: 100,
    undoDepth: 30,
    maxImportNodes: 500,
  },
  displayModeOptions: [
    { value: 'inner', label: '内嵌' },
    { value: 'popover', label: '悬浮弹窗' },
    { value: 'drawer', label: '右侧抽屉' },
  ],
  defaultDisplayMode: 'inner',
};

export const ROOT_LEVEL_ID = 'root';

export const DEFAULT_CANVAS_VIEW = { zoom: 1, x: 0, y: 0 };

/** 根据节点序号取主题色，保证同层节点颜色稳定 */
export const nodeColor = (index: number): string =>
  APP_CONFIG.palette[((index % APP_CONFIG.palette.length) + APP_CONFIG.palette.length) % APP_CONFIG.palette.length];
