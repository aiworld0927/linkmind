import { useEffect, useState } from 'react';
import { List, Button, Tag, Checkbox, Modal, message, Empty } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ListItem, NoteDraft, OperationResult } from '@/types';
import { useStore } from '@/store';
import { ListItemModal } from './ListItemModal';

interface NoteListProps {
  items: ListItem[];
  parentNodeId: string;
  onAdd: (parentId: string, draft: NoteDraft) => OperationResult;
  onEdit: (parentId: string, itemId: string, patch: Partial<ListItem>) => OperationResult;
  onDelete: (parentId: string, itemIds: string[]) => OperationResult;
  style?: React.CSSProperties;
}

const stop = (event: React.MouseEvent) => {
  event.stopPropagation();
  event.nativeEvent.stopPropagation();
};

const buildNoteMarkdown = (item: ListItem, title: string): string => {
  const lines = [`# ${title}`, '', item.content];
  if (item.tagList.length > 0) lines.push('', `标签：${item.tagList.join(' / ')}`);
  lines.push('', `创建时间：${item.createTime}`);
  return lines.join('\n');
};

export function NoteList({ items, parentNodeId, onAdd, onEdit, onDelete, style }: NoteListProps) {
  const navigate = useNavigate();
  const currentNodes = useStore((state) => state.currentNodes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const handleAdd = (draft: NoteDraft): OperationResult => {
    const result = onAdd(parentNodeId, draft);
    if (result.ok) message.success(result.message);
    else message.error(result.message);
    return result;
  };

  const handleEdit = (itemId: string, draft: NoteDraft): OperationResult => {
    const result = onEdit(parentNodeId, itemId, draft);
    if (result.ok) message.success(result.message);
    else message.error(result.message);
    return result;
  };

  const handleDelete = (itemId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条笔记吗？此操作可通过「操作记录」撤销。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const result = onDelete(parentNodeId, [itemId]);
        if (result.ok) message.success(result.message);
        else message.error(result.message);
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${count} 条笔记吗？删除后可通过「操作记录」撤销。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const result = onDelete(parentNodeId, selectedIds);
        if (result.ok) {
          setSelectedIds([]);
          message.success(result.message);
        } else {
          message.error(result.message);
        }
      },
    });
  };

  const toggleSelect = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openNote = (event: React.MouseEvent, item: ListItem) => {
    stop(event);
    const node = currentNodes.find((entry) => entry.id === item.parentNodeId)?.name ?? '';
    const title = item.remark.trim() || item.content.trim().slice(0, 20) || '笔记';
    const md = buildNoteMarkdown(item, title);
    navigate(`/note?${new URLSearchParams({ title, node, md }).toString()}`);
  };

  return (
    <div style={style} className="lm-note-list" onClick={(event) => event.stopPropagation()}>
      {items.length > 0 && (
        <div className="lm-note-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox checked={allSelected} onChange={toggleSelectAll} />
            <span style={{ fontSize: 12, color: '#8a94a6' }}>
              已选 {selectedIds.length} / {items.length}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <Button danger size="small" onClick={handleBatchDelete}>
              批量删除
            </Button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ fontSize: 12, color: '#8a94a6' }}>暂无附属笔记</span>}
          style={{ margin: '8px 0 12px' }}
        >
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            添加笔记
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              className="lm-note-item"
              actions={[
                <Button
                  key="view"
                  type="text"
                  icon={<EyeOutlined />}
                  size="small"
                  title="查看"
                  onClick={(event) => openNote(event, item)}
                />,
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={(event) => {
                    stop(event);
                    setEditingItem(item);
                  }}
                />,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={(event) => {
                    stop(event);
                    handleDelete(item.id);
                  }}
                />,
              ]}
            >
              <Checkbox
                checked={selectedIds.includes(item.id)}
                onChange={(event) => {
                  event.stopPropagation();
                  toggleSelect(item.id);
                }}
                style={{ marginRight: 10, marginTop: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1f2d3d', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {item.content}
                </div>
                <div className="lm-note-meta">
                  {item.tagList.map((tag) => (
                    <Tag key={tag} color="blue" style={{ fontSize: 10, marginInlineEnd: 4 }}>
                      {tag}
                    </Tag>
                  ))}
                  {item.remark && <span className="lm-note-remark">备注: {item.remark}</span>}
                  <span className="lm-note-time">{formatDate(item.createTime)}</span>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}

      {items.length > 0 && (
        <Button
          type="dashed"
          block
          size="small"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={(event) => {
            stop(event);
            setShowAddModal(true);
          }}
        >
          添加笔记
        </Button>
      )}

      <ListItemModal
        visible={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onSubmit={handleAdd}
      />

      <ListItemModal
        visible={Boolean(editingItem)}
        onCancel={() => setEditingItem(null)}
        onSubmit={(draft) => (editingItem ? handleEdit(editingItem.id, draft) : { ok: false, message: '笔记不存在' })}
        editingItem={editingItem}
      />
    </div>
  );
}
