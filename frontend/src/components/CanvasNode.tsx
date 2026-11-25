import { Button, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { APP_CONFIG } from '@/config/app';
import type { NodeItem, NoteDraft, ListItem, OperationResult } from '@/types';
import { NoteList } from './NoteList';

interface CanvasNodeProps {
  node: NodeItem;
  color: string;
  highlighted: boolean;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  onCardClick: (nodeId: string) => void;
  onCardDoubleClick: (nodeId: string) => void;
  onAddNote: (parentId: string, draft: NoteDraft) => OperationResult;
  onUpdateNote: (parentId: string, itemId: string, patch: Partial<ListItem>) => OperationResult;
  onDeleteNotes: (parentId: string, itemIds: string[]) => OperationResult;
}

const isActionTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, textarea, select, .lm-note-list, .ant-checkbox-wrapper'));
};

/**
 * 画布节点卡片：纯展示组件，所有操作通过回调上抛，不直接访问 store。
 */
export function CanvasNode({
  node,
  color,
  highlighted,
  onEdit,
  onDelete,
  onToggleExpand,
  onCardClick,
  onCardDoubleClick,
  onAddNote,
  onUpdateNote,
  onDeleteNotes,
}: CanvasNodeProps) {
  const stop = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
  };

  const borderColor = highlighted ? '#f59e0b' : color;
  const borderWidth = highlighted ? 2 : 1.5;

  return (
    <div
      className="lm-node-card"
      onClick={(event) => {
        if (isActionTarget(event.target)) return;
        event.stopPropagation();
        onCardClick(node.id);
      }}
      onDoubleClick={(event) => {
        if (isActionTarget(event.target)) return;
        event.stopPropagation();
        onCardDoubleClick(node.id);
      }}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: APP_CONFIG.node.radius,
        boxShadow: highlighted
          ? '0 0 0 3px rgba(245, 158, 11, 0.18), 0 2px 10px rgba(15, 23, 42, 0.12)'
          : '0 2px 8px rgba(15, 23, 42, 0.10)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        className="lm-node-header"
        style={{
          height: APP_CONFIG.node.headerHeight,
          minHeight: APP_CONFIG.node.headerHeight,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px 0 12px',
          borderLeft: `4px solid ${color}`,
          backgroundColor: highlighted ? '#fffbeb' : '#fafbfc',
        }}
      >
        <button
          type="button"
          className="lm-node-toggle"
          onClick={(event) => {
            stop(event);
            onToggleExpand(node.id);
          }}
          title={node.isExpanded ? '折叠笔记' : '展开笔记'}
          style={{ color }}
        >
          {node.isExpanded ? <DownOutlined /> : <RightOutlined />}
        </button>
        <span className="lm-node-title" title={node.name} style={{ color: '#1f2d3d' }}>
          {node.name}
        </span>
        <span className="lm-node-count">{node.children.length}</span>
        <div className="lm-node-actions">
          <Tooltip title="编辑节点">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(event) => {
                stop(event);
                onEdit(node.id);
              }}
            />
          </Tooltip>
          <Tooltip title="删除节点">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(event) => {
                stop(event);
                onDelete(node.id);
              }}
            />
          </Tooltip>
        </div>
      </div>

      {node.isExpanded && (
        <div className="lm-node-body">
          <NoteList
            items={node.children}
            parentNodeId={node.id}
            onAdd={onAddNote}
            onEdit={onUpdateNote}
            onDelete={onDeleteNotes}
          />
        </div>
      )}
    </div>
  );
}
