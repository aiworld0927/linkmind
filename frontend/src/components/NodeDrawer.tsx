import { useEffect } from 'react';
import { Drawer, Empty, Tag } from 'antd';
import { useStore } from '@/store';
import { NoteList } from './NoteList';

export function NodeDrawer() {
  const drawerVisible = useStore((state) => state.drawerVisible);
  const drawerTargetNodeId = useStore((state) => state.drawerTargetNodeId);
  const currentNodes = useStore((state) => state.currentNodes);
  const closeDrawer = useStore((state) => state.closeDrawer);
  const closePopover = useStore((state) => state.closePopover);
  const addListItem = useStore((state) => state.addListItem);
  const updateListItem = useStore((state) => state.updateListItem);
  const deleteListItem = useStore((state) => state.deleteListItem);

  const targetNode = currentNodes.find((node) => node.id === drawerTargetNodeId) ?? null;

  useEffect(() => {
    if (drawerVisible) closePopover();
  }, [drawerVisible, closePopover]);

  return (
    <Drawer
      title={targetNode ? targetNode.name : '节点详情'}
      placement="right"
      onClose={closeDrawer}
      open={drawerVisible}
      width="min(420px, 94vw)"
      destroyOnClose
    >
      {targetNode ? (
        <>
          <div className="lm-drawer-meta">
            <Tag color="blue">{targetNode.children.length} 条笔记</Tag>
            <Tag>{targetNode.dependencies.length} 个依赖</Tag>
            <span>创建于 {targetNode.createTime}</span>
          </div>
          <NoteList
            items={targetNode.children}
            parentNodeId={targetNode.id}
            onAdd={addListItem}
            onEdit={updateListItem}
            onDelete={deleteListItem}
          />
        </>
      ) : (
        <Empty description="节点不存在或已被删除" />
      )}
    </Drawer>
  );
}
