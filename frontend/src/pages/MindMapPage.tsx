import { useEffect, useState } from 'react';
import { Button, Result, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import type { NodeItem } from '@/types';
import { Toolbar } from '@/components/Toolbar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GraphCanvas } from '@/components/GraphCanvas';
import { NodeModal } from '@/components/NodeModal';
import { NodeDrawer } from '@/components/NodeDrawer';
import { OperationLogDrawer } from '@/components/OperationLogDrawer';

export function MindMapPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const datasets = useStore((state) => state.datasets);
  const activeDatasetId = useStore((state) => state.activeDatasetId);
  const switchDataset = useStore((state) => state.switchDataset);
  const currentNodes = useStore((state) => state.currentNodes);
  const [editingNode, setEditingNode] = useState<NodeItem | null>(null);

  useEffect(() => {
    if (!datasetId || datasetId === activeDatasetId) return;
    const result = switchDataset(datasetId);
    if (!result.ok) {
      message.warning(result.message);
      navigate('/', { replace: true });
    }
  }, [datasetId, activeDatasetId, switchDataset, navigate]);

  useEffect(() => {
    if (editingNode && !currentNodes.some((node) => node.id === editingNode.id)) {
      setEditingNode(null);
    }
  }, [currentNodes, editingNode]);

  if (!datasets.some((item) => item.id === datasetId)) {
    return (
      <Result
        status="404"
        title="知识地图不存在"
        subTitle="该地图可能已被删除，请返回首页选择其他地图。"
        extra={
          <Button type="primary" onClick={() => navigate('/', { replace: true })}>
            返回首页
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Toolbar />
      <Breadcrumbs />
      <main className="lm-main">
        <GraphCanvas onEditNode={setEditingNode} />
      </main>
      <NodeDrawer />
      <OperationLogDrawer />
      <NodeModal
        visible={Boolean(editingNode)}
        editingNode={editingNode}
        onCancel={() => setEditingNode(null)}
      />
    </>
  );
}
