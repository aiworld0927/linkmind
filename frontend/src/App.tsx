import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { useStore } from './store';
import { GraphCanvas } from './components/GraphCanvas';
import { NodeDrawer } from './components/NodeDrawer';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Toolbar } from './components/Toolbar';
import { NodeModal } from './components/NodeModal';
import type { NodeItem } from './types';

function App() {
  const {
    loadFromStorage,
    isLoading,
  } = useStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNode, setEditingNode] = useState<NodeItem | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleEditNode = (node: NodeItem) => {
    setEditingNode(node);
    setShowEditModal(true);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toolbar />

      <div
        style={{
          height: '40px',
          backgroundColor: '#2a2a2a',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid #333333',
        }}
      >
        <Breadcrumbs />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <Spin size="large" tip="加载中..." />
          </div>
        )}
        <GraphCanvas onEditNode={handleEditNode} />
        <NodeDrawer />
      </div>

      <NodeModal
        visible={showEditModal}
        onCancel={() => setShowEditModal(false)}
        editingNode={editingNode}
      />
    </div>
  );
}

export default App;
