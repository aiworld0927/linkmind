import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { useActiveMap } from '@/store';
import { build, fitView, VIEW_MAX_K, VIEW_MIN_K } from '@/utils/layout';
import { PALETTE } from '@/config/maps';
import type { NodeViewModel } from '@/types';

/**
 * 原型 MindCanvas：SVG 递归自动布局 + 拖拽平移 + 滚轮缩放 + 搜索高亮 + 右键菜单 + 折叠圆点。
 * 不直接调 DOM，全部通过 zustand store 与 React state 驱动。
 */
export function MindCanvas(): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const map = useActiveMap();
  const collapsed = useAppStore((s) => s.collapsed);
  const searchKeyword = useAppStore((s) => s.searchKeyword);
  const selectedId = useAppStore((s) => s.selectedId);
  const view = useAppStore((s) => s.view);
  const selectNode = useAppStore((s) => s.selectNode);
  const toggleCollapse = useAppStore((s) => s.toggleCollapse);
  const setView = useAppStore((s) => s.setView);
  const openCtx = useAppStore((s) => s.openCtx);
  const closeCtx = useAppStore((s) => s.closeCtx);

  // 观察 stage 尺寸
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    const cr = el.getBoundingClientRect();
    setSize({ w: cr.width, h: cr.height });
    return () => ro.disconnect();
  }, []);

  // 计算布局
  const buildResult = useMemo(() => {
    if (!map) return null;
    return build(map, collapsed);
  }, [map, collapsed]);

  // 挂载后 fit 一次；地图切换再 fit
  const lastFitKey = useRef<string>('');
  useEffect(() => {
    if (!buildResult || !size.w || !size.h) return;
    const key = `${map?.id ?? ''}|${size.w}|${size.h}`;
    if (lastFitKey.current === key) return;
    lastFitKey.current = key;
    const v = fitView(buildResult.bounds, size.w, size.h);
    setView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildResult, size.w, size.h, map?.id]);

  // 搜索：原型逻辑——搜索时自动展开，然后根据匹配节点把其祖先全部展开，同层其他同级收起来。
  useEffect(() => {
    if (!buildResult || !searchKeyword) return;
    const kw = searchKeyword;
    // 展开所有（清掉 collapsed 并立即同步视图）
    const allExpand = new Set<string>();
    // 对每个匹配节点，把它的所有祖先都加进 allExpand
    buildResult.views.forEach((n) => {
      if (n.name.includes(kw)) {
        let p: NodeViewModel | null = n.parent;
        while (p) {
          allExpand.add(p.id);
          p = p.parent;
        }
        if (n.kids.length) allExpand.add(n.id);
      }
    });
    useAppStore.setState({ collapsed: allExpand });
    // 触发 build 重算（下一个 effect 会来）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword]);

  // stage 事件（只绑定一次：拖拽状态放 ref，避免 view 变化导致监听器重建、拖拽中断）
  const viewRef = useRef(view);
  viewRef.current = view;
  const draggedRef = useRef(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let drag: { x: number; y: number; vx: number; vy: number; moved: boolean } | null = null;

    const onMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        vx: viewRef.current.x,
        vy: viewRef.current.y,
        moved: false,
      };
      draggedRef.current = false;
      closeCtx();
    };
    const onMouseMove = (e: MouseEvent): void => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      // 小于阈值视为点击，不触发平移
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        draggedRef.current = true;
        el.classList.add('drag');
      }
      setView({ x: drag.vx + dx, y: drag.vy + dy });
    };
    const onMouseUp = (): void => {
      if (drag?.moved) {
        // click 在 mouseup 之后同步触发，延迟复位以免误判
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }
      drag = null;
      el.classList.remove('drag');
    };

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      closeCtx();
      const cur = viewRef.current;
      const f = e.deltaY < 0 ? 1.12 : 0.89;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const nk = Math.max(VIEW_MIN_K, Math.min(VIEW_MAX_K, cur.k * f));
      setView({
        k: nk,
        x: mx - (mx - cur.x) * (nk / cur.k),
        y: my - (my - cur.y) * (nk / cur.k),
      });
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [setView, closeCtx]);

  // 关闭 ctx：点击画布空白处
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (!(e.target as Element | null)?.closest?.('#ctx')) closeCtx();
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [closeCtx]);

  if (!map || !buildResult) {
    return <div id="stage" ref={stageRef} />;
  }

  const { views } = buildResult;

  // 连线
  const paths: JSX.Element[] = [];
  views.forEach((n) => {
    if (!n.vis || collapsed.has(n.id)) return;
    n.kids.forEach((c) => {
      if (!c.vis) return;
      const x1 = n.off + n.w;
      const y1 = n.y;
      const x2 = c.off;
      const y2 = c.y;
      const mid = (x1 + x2) / 2;
      const colorIdx = c.d === 1 ? c.top : n.top;
      const color = PALETTE[colorIdx % PALETTE.length];
      paths.push(
        <path
          key={`p-${n.id}-${c.id}`}
          d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeOpacity={n.d === 0 ? 0.55 : 0.32}
          strokeWidth={n.d === 0 ? 2.2 : 1.3}
        />,
      );
    });
  });

  // 节点
  const nodes: JSX.Element[] = [];
  views.forEach((n) => {
    if (!n.vis) return;
    const color = PALETTE[(n.d === 0 ? 0 : n.top) % PALETTE.length];
    const isSel = selectedId === n.id;
    const isHit = !!searchKeyword && n.name.includes(searchKeyword);
    const cls = ['nt'];
    if (isHit) cls.push('hit');
    if (isSel) cls.push('sel');

    let rectFill: string;
    let rectStroke: string | undefined;
    let rectStrokeWidth: number | undefined;
    if (isHit) {
      rectFill = '#fff7cc';
      rectStroke = '#f59e0b';
      rectStrokeWidth = 2;
    } else if (n.d === 0) {
      rectFill = '#1f2d3d';
    } else if (n.d === 1) {
      rectFill = color;
    } else {
      rectFill = '#ffffff';
      rectStroke = color;
      rectStrokeWidth = 1.2;
    }

    const lines = n.lines;
    const fs = n.d <= 1 ? 19 : n.d === 2 ? 16 : 13.5;
    const lh = fs + 5;
    const startY = n.h / 2 - (lines.length - 1) * (lh / 2);

    // 每个 text 都独立，避免 React 18 的 JSX 文本节点限制
    const textEls = lines.map((ln, i) => {
      const x = n.d <= 1 ? 12 : 9;
      const fill = n.d <= 1 ? '#fff' : '#1f2d3d';
      const fontWeight = n.d <= 1 ? 700 : 400;
      return (
        <text key={i} x={x} y={startY + i * lh} fontSize={fs} fill={fill} fontWeight={fontWeight}>
          {ln}
        </text>
      );
    });

    const dotVisible = n.kids.length > 0;
    const isCollapsed = collapsed.has(n.id);

    nodes.push(
      <g
        key={n.id}
        className={cls.join(' ')}
        transform={`translate(${n.off || 0},${n.y - n.h / 2})`}
        onClick={(e) => {
          e.stopPropagation();
          if (draggedRef.current) return;
          selectNode(n.id);
          if (n.kids.length) toggleCollapse(n.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          selectNode(n.id);
          openCtx(e.clientX, e.clientY, n.id);
        }}
      >
        {isSel && (
          <rect
            className="sel-ring"
            x={-5}
            y={-5}
            width={n.w + 10}
            height={n.h + 10}
            rx={(n.d <= 1 ? 9 : 7) + 4}
          />
        )}
        <rect
          width={n.w}
          height={n.h}
          rx={n.d <= 1 ? 9 : 7}
          fill={rectFill}
          stroke={rectStroke}
          strokeWidth={rectStrokeWidth}
          fillOpacity={n.d === 1 && !isHit ? 0.92 : 1}
        />
        {textEls}
        {dotVisible && (
          <>
            <circle
              cx={n.w - 11}
              cy={n.h / 2}
              r={isCollapsed ? 4.5 : 3}
              fill={isCollapsed ? '#f59e0b' : '#cbd5e1'}
            />
            <circle
              cx={n.w - 11}
              cy={n.h / 2}
              r={11}
              fill="#fff"
              fillOpacity={0}
              pointerEvents="all"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                if (draggedRef.current) return;
                selectNode(n.id);
                toggleCollapse(n.id);
              }}
            />
          </>
        )}
      </g>,
    );
  });

  return (
    <div id="stage" ref={stageRef}>
      <svg>
        <g id="view" transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {paths}
          {nodes}
        </g>
      </svg>
    </div>
  );
}

export default MindCanvas;
