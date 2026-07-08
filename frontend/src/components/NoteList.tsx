import { useState } from 'react';
import { List, Button, Tag, Checkbox, Modal, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ListItem } from '@/types';
import { ListItemModal } from './ListItemModal';

interface NoteListProps {
  items: ListItem[];
  parentNodeId: string;
  onAdd: (parentId: string, item: Omit<ListItem, 'id' | 'createTime' | 'parentNodeId'>) => void;
  onEdit: (parentId: string, itemId: string, patch: Partial<ListItem>) => void;
  onDelete: (parentId: string, itemIds: string[]) => void;
  style?: React.CSSProperties;
}

export function NoteList({ items, parentNodeId, onAdd, onEdit, onDelete, style }: NoteListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleAdd = (item: Omit<ListItem, 'id' | 'createTime' | 'parentNodeId'>) => {
    onAdd(parentNodeId, item);
    message.success('✅ 笔记添加成功');
  };

  const handleEdit = (itemId: string, patch: Partial<ListItem>) => {
    onEdit(parentNodeId, itemId, patch);
    message.success('✅ 笔记更新成功');
  };

  const handleDelete = (itemId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条笔记吗？此操作无法恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onDelete(parentNodeId, [itemId]);
        message.success('✅ 笔记已删除');
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;

    Modal.confirm({
      title: '批量删除确认',
      content: (
        <div>
          <p>确定要删除选中的 {selectedIds.length} 条笔记吗？</p>
          <p style={{ color: '#ef4444', marginTop: '8px', fontSize: '13px' }}>
            ⚠️ 此操作无法恢复，请谨慎操作
          </p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        onDelete(parentNodeId, selectedIds);
        setSelectedIds([]);
        setSelectAll(false);
        message.success(`✅ 已删除 ${selectedIds.length} 条笔记`);
      },
    });
  };

  const toggleSelect = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
    setSelectAll(!selectAll);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={style}>
      {items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox checked={selectAll && selectedIds.length === items.length} onChange={toggleSelectAll} />
            <span style={{ fontSize: '12px', color: '#999999' }}>
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

      <List
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            style={{
              padding: '12px 0',
              borderBottom: '1px dashed #f0f0f0',
              display: 'flex',
              alignItems: 'flex-start',
            }}
            actions={[
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => setEditingItem(item)}
              />,
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDelete(item.id)}
              />,
            ]}
          >
            <Checkbox
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              style={{ marginRight: '12px', marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: '#333333' }}>{item.content}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                {item.tagList.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {item.tagList.map((tag) => (
                      <Tag key={tag} color="blue" style={{ fontSize: '11px' }}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
                {item.remark && (
                  <span style={{ fontSize: '12px', color: '#999999' }}>备注: {item.remark}</span>
                )}
                <span style={{ fontSize: '11px', color: '#cccccc' }}>{formatDate(item.createTime)}</span>
              </div>
            </div>
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', color: '#999999', padding: '30px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
              <div style={{ marginBottom: '12px' }}>暂无附属笔记</div>
              <Button type="dashed" onClick={() => setShowAddModal(true)}>
                <PlusOutlined /> 添加笔记
              </Button>
            </div>
          ),
        }}
      />

      <div style={{ marginTop: '12px' }}>
        <Button type="dashed" block onClick={() => setShowAddModal(true)}>
          <PlusOutlined /> 添加笔记
        </Button>
      </div>

      <ListItemModal
        visible={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onSubmit={handleAdd}
      />

      <ListItemModal
        visible={!!editingItem}
        onCancel={() => setEditingItem(null)}
        onSubmit={(item) => {
          handleEdit(editingItem!.id, item);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />
    </div>
  );
}
