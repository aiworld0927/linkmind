import type { TreeNode, NodeViewModel, TreeMap, ViewBounds } from '@/types';

export const ROWGAP = 11;
export const GAPX = 58;
export const DEPTH_W: readonly number[] = [258, 222, 208];
export const DEPTH_FS: readonly number[] = [19, 16, 13.5];
export const DEPTH_H: readonly number[] = [42, 36, 32];

export function NW(d: number): number {
  return DEPTH_W[Math.min(d, DEPTH_W.length - 1)];
}
export function NFS(d: number): number {
  return DEPTH_FS[Math.min(d, DEPTH_FS.length - 1)];
}
export function NH(d: number): number {
  return DEPTH_H[Math.min(d, DEPTH_H.length - 1)];
}

function charW(ch: string, fs: number): number {
  return /[\u3000-\u9fff\uff01-\uffef]/.test(ch) ? fs : fs * 0.56;
}

export function wrap(text: unknown, w: number, fs: number): string[] {
  const maxW = w - 18;
  const lines: string[] = [];
  let line = '';
  let lw = 0;
  const src = String(text == null ? '' : text);
  for (const ch of src) {
    const cw = charW(ch, fs);
    if (lw + cw > maxW && line) {
      lines.push(line);
      line = '';
      lw = 0;
    }
    line += ch;
    lw += cw;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/**
 * 原型的 countNodes / countPropsIn / countProps 的递归实现。
 */
export function countNodes(nodes: TreeNode[] | undefined): number {
  return (nodes || []).reduce((s, n) => s + 1 + countNodes(n.children), 0);
}
export function countPropsIn(nodes: TreeNode[] | undefined): number {
  return (nodes || []).reduce(
    (s, n) => s + (n.props ? n.props.length : 0) + countPropsIn(n.children),
    0,
  );
}
export function countProps(map: TreeMap): number {
  return (map.props ? map.props.length : 0) + countPropsIn(map.nodes);
}
export function countSubtree(node: TreeNode): number {
  return 1 + (node.children || []).reduce((s, c) => s + countSubtree(c), 0);
}

/**
 * 原型的 build()，把 TreeMap 转成带布局坐标的 NodeViewModel[]。
 * 入参：map、collapsed 折叠集。
 * 出参：views（全部节点，包括不可见的 collapsed 子孙）、bounds、maxD。
 */
export interface BuildResult {
  views: NodeViewModel[];
  bounds: ViewBounds;
  maxD: number;
}

export function build(map: TreeMap, collapsed: Set<string>): BuildResult {
  const ROOT_ID = 'ROOT';
  const root: NodeViewModel = {
    id: ROOT_ID,
    name: map.title,
    props: map.props || [],
    data: null,
    isRoot: true,
    d: 0,
    top: 0,
    off: 0,
    y: 0,
    w: NW(0),
    h: NH(0),
    lines: [map.title],
    kids: [],
    parent: null,
    vis: true,
  };
  const views: NodeViewModel[] = [root];

  function ensureChildren(n: TreeNode): TreeNode[] {
    if (!Array.isArray(n.children)) n.children = [];
    return n.children;
  }
  function ensureProps(n: TreeNode): void {
    if (!Array.isArray(n.props)) n.props = [];
  }

  function mk(src: TreeNode, d: number, parent: NodeViewModel, top: number): NodeViewModel {
    ensureProps(src);
    ensureChildren(src);
    const v: NodeViewModel = {
      id: src.id,
      name: src.name,
      props: src.props,
      data: src,
      isRoot: false,
      d,
      top,
      off: 0,
      y: 0,
      w: NW(d),
      h: NH(d),
      lines: [],
      kids: [],
      parent,
      vis: false,
    };
    views.push(v);
    v.kids = src.children.map((c, i) => mk(c, d + 1, v, i));
    return v;
  }

  root.kids = (map.nodes || []).map((n, i) => mk(n, 1, root, i));

  let maxD = 0;
  views.forEach((v) => {
    if (v.d > maxD) maxD = v.d;
  });

  const xOff: number[] = [0];
  for (let d = 1; d <= maxD; d++) xOff[d] = xOff[d - 1] + NW(d - 1) + GAPX;

  let cursor = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  function place(v: NodeViewModel): number {
    v.vis = true;
    const w = NW(v.d);
    const fs = NFS(v.d);
    v.w = w;
    v.lines = wrap(v.name, w, fs);
    v.h = Math.max(NH(v.d), v.lines.length * (fs + 5) + 12);
    const kids = v.kids.length && !collapsed.has(v.id) ? v.kids : null;
    if (!kids) {
      v.y = cursor + v.h / 2;
      cursor += v.h + ROWGAP;
    } else {
      const ys = kids.map(place);
      v.y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    if (v.y - v.h / 2 < minY) minY = v.y - v.h / 2;
    if (v.y + v.h / 2 > maxY) maxY = v.y + v.h / 2;
    return v.y;
  }

  place(root);

  views.forEach((v) => {
    v.off = xOff[v.d] ?? 0;
  });

  const bounds: ViewBounds = {
    x: 0,
    y: minY,
    w: xOff[maxD] + NW(maxD),
    h: Math.max(1, maxY - minY),
  };

  return { views, bounds, maxD };
}

/* ------------------------------------------------------------------
 * 画布缩放配置（与原型 demo-mindmap.html 完全一致，修改这里即可调整比例）
 *   FIT_PADDING  自动适配时四周边距（px）
 *   FIT_MIN_K    自动适配的最小缩放（超大知识树时防止过小）
 *   FIT_MAX_K    自动适配的最大缩放（小知识树时防止过大，原型为 1.05）
 *   VIEW_MIN_K   手动缩放下限（滚轮 / 放大缩小按钮）
 *   VIEW_MAX_K   手动缩放上限
 * ------------------------------------------------------------------ */
export const FIT_PADDING = 40;
export const FIT_MIN_K = 0.12;
export const FIT_MAX_K = 1.05;
export const VIEW_MIN_K = 0.1;
export const VIEW_MAX_K = 2.6;

/** 原型 fit() 的公式：计算 k / x / y，让画布在 WxH 视口内居中展示 bounds。 */
export function fitView(bounds: ViewBounds, W: number, H: number): { k: number; x: number; y: number } {
  if (!bounds) return { k: 1, x: 24, y: 24 };
  let k = Math.min((W - FIT_PADDING * 2) / bounds.w, (H - FIT_PADDING * 2) / bounds.h);
  k = Math.max(FIT_MIN_K, Math.min(k, FIT_MAX_K));
  return {
    k,
    x: (W - bounds.w * k) / 2 - bounds.x * k,
    y: (H - bounds.h * k) / 2 - bounds.y * k,
  };
}
