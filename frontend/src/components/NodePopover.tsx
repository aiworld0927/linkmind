import { useEffect } from 'react';
import { Empty, Popover } from 'antd';
import { useStore } from '@/store';
import { NoteList } from './NoteList';

interface NodePopoverProps {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function NodePopover({ nodeId, x, y, onClose }: NodePopoverProps) {
  const currentNode = useStore((state) => state.currentNodes.find((node) => node.id === nodeId));
  const addListItem = useStore((state) => state.addListItem);
  const updateListItem = useStore((state) => state.updateListItem);
  const deleteListItem = useStore((state) => state.deleteListItem);

  useEffect(() => {
    const handleScroll = () => onClose();
    const container = document.querySelector('.x6-graph');
    if (!container) return undefined;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onClose]);

  const content = currentNode ? (
    <div className="lm-popover-body">
      <div className="lm-popover-title">{currentNode.name}</div>
      <NoteList
        items={currentNode.children}
        parentNodeId={nodeId}
        onAdd={addListItem}
        onEdit={updateListItem}
        onDelete={deleteListItem}
      />
    </div>
  ) : (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="节点不存在或已被删除" style={{ width: 240 }} />
  );

  return (
    <Popover
      content={content}
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      placement="rightTop"
      trigger="click"
      arrow={false}
      destroyTooltipOnHide
    >
      <div className="lm-popover-anchor" style={{ left: x, top: y }} />
    </Popover>
  );
}
