import { List, Button } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { Node, Graph } from '@antv/x6';
import type { NodeItem } from '@/types';

interface CustomNodeData {
  node: NodeItem;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddListItem: (parentNodeId: string) => void;
}

interface CustomNodeProps {
  node: Node;
  graph: Graph;
}

export function CustomNode({ node }: CustomNodeProps) {
  const data = node.getData<CustomNodeData>();
  const nodeItem = data?.node;

  if (!nodeItem) {
    return null;
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onEdit?.(nodeItem.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.(nodeItem.id);
  };

  const handleAddListItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onAddListItem?.(nodeItem.id);
  };

  return (
    <div
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        border: nodeItem.isExpanded ? '2px solid #10b981' : '1px solid #333333',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fafafa',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#1f1f1f',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            marginRight: '8px',
          }}
          title={nodeItem.name}
        >
          {nodeItem.name}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleEdit}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666666',
              transition: 'color 0.2s',
            }}
            title="编辑"
          >
            <EditOutlined style={{ fontSize: '16px' }} />
          </button>
          <button
            onClick={handleDelete}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666666',
              transition: 'color 0.2s',
            }}
            title="删除"
          >
            <DeleteOutlined style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#e8e8e8' }} />

      {nodeItem.isExpanded && (
        <div style={{ padding: '12px' }}>
          <List
            dataSource={nodeItem.children}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px dashed #f0f0f0',
                  fontSize: '13px',
                  color: '#333333',
                }}
                extra={
                  item.tagList.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {item.tagList.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: '#e6f7ff',
                            color: '#1890ff',
                            borderRadius: '4px',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )
                }
              >
                {item.content}
                {item.remark && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#999999',
                      marginTop: '4px',
                    }}
                  >
                    备注: {item.remark}
                  </span>
                )}
              </List.Item>
            )}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', color: '#999999', padding: '20px 0' }}>
                  暂无附属笔记
                </div>
              ),
            }}
          />
          <Button
            type="dashed"
            size="small"
            block
            icon={<PlusOutlined />}
            onClick={handleAddListItem}
            style={{ marginTop: '12px' }}
          >
            添加笔记
          </Button>
        </div>
      )}
    </div>
  );
}
