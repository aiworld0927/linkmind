import { useEffect, useState, useRef } from 'react';
import { Popover } from 'antd';
import { useStore } from '@/store';
import { NoteList } from './NoteList';

interface NodePopoverProps {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function NodePopover({ nodeId, x, y, onClose }: NodePopoverProps) {
  const {
    currentNodes,
    addListItem,
    updateListItem,
    deleteListItem,
    closeDrawer,
  } = useStore();

  const [visible, setVisible] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  const targetNode = currentNodes.find((node) => node.id === nodeId);

  useEffect(() => {
    closeDrawer();

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setVisible(false);
        setTimeout(onClose, 200);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose, closeDrawer]);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(false);
      setTimeout(onClose, 200);
    };

    const container = document.querySelector('.x6-graph');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [onClose]);

  const content = (
    <div ref={popoverRef} style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
      <NoteList
        items={targetNode?.children || []}
        parentNodeId={nodeId}
        onAdd={addListItem}
        onEdit={updateListItem}
        onDelete={deleteListItem}
      />
    </div>
  );

  return (
    <Popover
      content={content}
      visible={visible}
      onVisibleChange={(v) => {
        setVisible(v);
        if (!v) {
          setTimeout(onClose, 200);
        }
      }}
      placement="rightBottom"
      trigger="click"
    >
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 0,
          height: 0,
        }}
      />
    </Popover>
  );
}
