import { APP_CONFIG } from '@/config/app';
import type { CanvasViewState, NodeItem } from '@/types';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface NodeLayout {
  positions: Record<string, { x: number; y: number }>;
  contentWidth: number;
  contentHeight: number;
}

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** 节点卡片高度：折叠时仅为头部，展开时按笔记数量估算 */
export function measureNodeHeight(node: NodeItem): number {
  const { minHeight, headerHeight, noteRowHeight, noteListPadding } = APP_CONFIG.node;
  if (!node.isExpanded || node.children.length === 0) return Math.max(minHeight, headerHeight + 8);
  const listHeight = Math.max(headerHeight, node.children.length * noteRowHeight + noteListPadding);
  return Math.max(minHeight, headerHeight + listHeight);
}

/**
 * 纯函数布局：根据可视区域自适应列数，并让整块内容在画布中水平、垂直居中。
 * 视图层只消费结果，不关心布局细节。
 */
export function computeGridLayout(nodes: NodeItem[], viewport: ViewportSize): NodeLayout {
  const { width: nodeWidth } = APP_CONFIG.node;
  const { columns, gapX, gapY, padding } = APP_CONFIG.layout;
  const positions: Record<string, { x: number; y: number }> = {};

  if (nodes.length === 0) return { positions, contentWidth: 0, contentHeight: 0 };

  const availableWidth = Math.max(viewport.width || 1024, nodeWidth + padding * 2);
  const fitColumns = Math.floor((availableWidth - padding * 2 + gapX) / (nodeWidth + gapX));
  const cols = clamp(fitColumns, 1, columns);
  const rows = Math.ceil(nodes.length / cols);

  const rowHeights: number[] = [];
  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, measureNodeHeight(node));
  });

  const contentWidth = cols * nodeWidth + (cols - 1) * gapX;
  const contentHeight = rowHeights.reduce((sum, height) => sum + height, 0) + (rows - 1) * gapY;

  const startX = Math.max(padding, (availableWidth - contentWidth) / 2);
  const startY = Math.max(padding, ((viewport.height || 768) - contentHeight) / 2);

  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const rowSize = Math.min(cols, nodes.length - row * cols);
    const rowWidth = rowSize * nodeWidth + (rowSize - 1) * gapX;
    const rowOffsetX = (contentWidth - rowWidth) / 2;
    const offsetY = rowHeights
      .slice(0, row)
      .reduce((sum, height) => sum + height + gapY, 0);

    positions[node.id] = {
      x: startX + rowOffsetX + col * (nodeWidth + gapX),
      y: startY + offsetY,
    };
  });

  return { positions, contentWidth, contentHeight };
}

/** 计算当前所有节点的包围盒，用于适配屏幕 */
export function computeContentBounds(
  nodes: NodeItem[],
  positions: Record<string, { x: number; y: number }>,
): ContentBounds {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  nodes.forEach((node) => {
    const position = positions[node.id];
    if (!position) return;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + APP_CONFIG.node.width);
    maxY = Math.max(maxY, position.y + measureNodeHeight(node));
  });

  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 计算让内容完整且居中显示所需的缩放与平移 */
export function computeFitView(
  bounds: ContentBounds,
  viewport: ViewportSize,
  options: { maxZoom?: number } = {},
): CanvasViewState {
  const { padding, minZoom, maxZoom } = APP_CONFIG.layout;
  if (bounds.width <= 0 || bounds.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { zoom: 1, x: 0, y: 0 };
  }
  const zoom = clamp(
    Math.min(
      (viewport.width - padding * 2) / bounds.width,
      (viewport.height - padding * 2) / bounds.height,
      options.maxZoom ?? 1.1,
    ),
    minZoom,
    maxZoom,
  );
  return {
    zoom,
    x: (viewport.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (viewport.height - bounds.height * zoom) / 2 - bounds.y * zoom,
  };
}
