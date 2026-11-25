import { Button, Drawer, Empty, List, Tag, message } from 'antd';
import { ClearOutlined, UndoOutlined } from '@ant-design/icons';
import { useStore } from '@/store';
import type { OperationType } from '@/types';

const TYPE_META: Record<OperationType, { label: string; color: string }> = {
  'create-node': { label: '新增节点', color: 'green' },
  'update-node': { label: '更新节点', color: 'blue' },
  'delete-node': { label: '删除节点', color: 'red' },
  'toggle-node': { label: '展开/折叠', color: 'default' },
  'create-note': { label: '新增笔记', color: 'green' },
  'update-note': { label: '更新笔记', color: 'blue' },
  'delete-note': { label: '删除笔记', color: 'red' },
  'create-link': { label: '新增依赖', color: 'green' },
  'update-link': { label: '更新依赖', color: 'blue' },
  'delete-link': { label: '删除依赖', color: 'red' },
  import: { label: '导入', color: 'purple' },
  reset: { label: '重置', color: 'volcano' },
  'switch-dataset': { label: '切换数据集', color: 'cyan' },
  'create-dataset': { label: '新建地图', color: 'green' },
  'update-dataset': { label: '编辑地图', color: 'blue' },
  'delete-dataset': { label: '删除地图', color: 'red' },
  undo: { label: '撤销', color: 'gold' },
};

/**
 * 操作记录面板：数据变更的可追溯入口，支持撤销与清空。
 */
export function OperationLogDrawer() {
  const visible = useStore((state) => state.logVisible);
  const closeLogDrawer = useStore((state) => state.closeLogDrawer);
  const operationLog = useStore((state) => state.operationLog);
  const undoStack = useStore((state) => state.undoStack);
  const undoLastOperation = useStore((state) => state.undoLastOperation);
  const clearOperationLog = useStore((state) => state.clearOperationLog);

  const handleUndo = () => {
    const result = undoLastOperation();
    if (result.ok) message.success(result.message);
    else message.warning(result.message);
  };

  return (
    <Drawer
      title="操作记录"
      placement="right"
      open={visible}
      onClose={closeLogDrawer}
      width="min(440px, 94vw)"
      extra={
        <Button
          size="small"
          icon={<ClearOutlined />}
          disabled={operationLog.length === 0}
          onClick={() => {
            clearOperationLog();
            message.success('操作记录已清空');
          }}
        >
          清空
        </Button>
      }
    >
      <div className="lm-log-actions">
        <Button
          type="primary"
          icon={<UndoOutlined />}
          disabled={undoStack.length === 0}
          onClick={handleUndo}
          block
        >
          撤销上一步操作（可撤销 {undoStack.length} 步）
        </Button>
      </div>

      {operationLog.length === 0 ? (
        <Empty description="暂无操作记录" style={{ marginTop: 40 }} />
      ) : (
        <List
          dataSource={operationLog}
          renderItem={(entry) => {
            const meta = TYPE_META[entry.type] ?? { label: entry.type, color: 'default' };
            return (
              <List.Item className="lm-log-item">
                <div style={{ width: '100%' }}>
                  <div className="lm-log-head">
                    <Tag color={meta.color}>{meta.label}</Tag>
                    <span className="lm-log-time">{entry.time}</span>
                  </div>
                  <div className="lm-log-summary">{entry.summary}</div>
                  {entry.targetName && (
                    <div className="lm-log-target">目标：{entry.targetName}</div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Drawer>
  );
}
