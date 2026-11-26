import { useMemo } from 'react';
import { useAppStore, useActiveMap } from '@/store';
import type { NodeViewModel } from '@/types';

/**
 * 右键操作菜单：原型的 #ctx。
 * 点击菜单项执行对应 action；定位 clamp 到 viewport。
 */
export function CtxMenu({ views }: { views: NodeViewModel[] | undefined }): JSX.Element {
  const ctx = useAppStore((s) => s.ctxMenu);
  const closeCtx = useAppStore((s) => s.closeCtx);
  const openModal = useAppStore((s) => s.openModal);
  const selectNode = useAppStore((s) => s.selectNode);

  const map = useActiveMap();

  // 定位 clamp
  const pos = useMemo(() => {
    if (!ctx) return { left: 0, top: 0 };
    const W = 180; // 菜单大致宽度
    const H = 220; // 菜单大致高度
    return {
      left: Math.max(8, Math.min(ctx.x, window.innerWidth - W - 8)),
      top: Math.max(8, Math.min(ctx.y, window.innerHeight - H - 8)),
    };
  }, [ctx]);

  if (!ctx) return <div id="ctx" />;

  const nodeView = views?.find((v) => v.id === ctx.nodeId);
  const isRoot = nodeView?.isRoot ?? ctx.nodeId === 'ROOT';
  const name = nodeView?.name ?? map?.title ?? '节点';

  return (
    <div
      id="ctx"
      className="on"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="ct">{name}</div>
      <button
        onClick={() => {
          closeCtx();
          openModal({
            kind: 'node',
            mode: 'add-child',
            nodeId: ctx.nodeId,
          });
        }}
      >
        新增子节点
      </button>
      <button
        onClick={() => {
          closeCtx();
          openModal({ kind: 'node', mode: 'rename', nodeId: ctx.nodeId });
        }}
      >
        修改节点
      </button>
      <button
        className="danger"
        disabled={isRoot}
        onClick={() => {
          if (isRoot) return;
          closeCtx();
          openModal({ kind: 'node', mode: 'delete', nodeId: ctx.nodeId });
        }}
      >
        删除节点
      </button>
      <div className="sep" />
      <button
        onClick={() => {
          closeCtx();
          selectNode(ctx.nodeId);
          useAppStore.setState({ sideOpen: true });
        }}
      >
        属性编辑
      </button>
    </div>
  );
}

export default CtxMenu;
