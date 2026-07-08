import { useEffect } from 'react';
import { Drawer, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useStore } from '@/store';
import { NoteList } from './NoteList';

export function NodeDrawer() {
  const {
    drawerVisible,
    drawerTargetNodeId,
    closeDrawer,
    currentNodes,
    addListItem,
    updateListItem,
    deleteListItem,
    closePopover,
  } = useStore();

  const targetNode = currentNodes.find((node) => node.id === drawerTargetNodeId);

  useEffect(() => {
    if (drawerVisible) {
      closePopover();
    }
  }, [drawerVisible, closePopover]);

  const handleClose = () => {
    closeDrawer();
  };

  return (
    <Drawer
      title={targetNode?.name || '节点详情'}
      placement="right"
      onClose={handleClose}
      open={drawerVisible}
      width={420}
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleClose}
        />
      }
    >
      <NoteList
        items={targetNode?.children || []}
        parentNodeId={drawerTargetNodeId || ''}
        onAdd={addListItem}
        onEdit={updateListItem}
        onDelete={deleteListItem}
      />
    </Drawer>
  );
}
