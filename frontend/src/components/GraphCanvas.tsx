import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Graph } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { Modal, message, Button, Select } from 'antd';
import { useStore } from '@/store';
import type { NodeItem } from '@/types';
import { NodePopover } from './NodePopover';
import { NoteList } from './NoteList';
import { NodeModal } from './NodeModal';

interface CustomNodeData {
  node: NodeItem;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  onAddListItem: (parentId: string, item: any) => void;
  onUpdateListItem: (parentId: string, itemId: string, patch: any) => void;
  onDeleteListItem: (parentId: string, itemIds: string[]) => void;
}

interface GraphCanvasProps {
  onEditNode?: (node: NodeItem) => void;
}

const TOOLBAR_HEIGHT = 64;
const BREADCRUMB_HEIGHT = 40;

const ReactNodeComponent = ({ node }: { node: any }) => {
  const data = node.getData() as CustomNodeData;
  if (!data) return null;
  
  const { node: nodeData, onEdit, onDelete, onAddListItem, onUpdateListItem, onDeleteListItem } = data;
  const isSearchMatch = false;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    setTimeout(() => {
      onEdit(nodeData.id);
    }, 50);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    setTimeout(() => {
      onDelete(nodeData.id);
    }, 50);
  };

  return (
    <div
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        border: isSearchMatch
          ? '2px solid #1890ff'
          : nodeData.isExpanded
          ? '2px solid #10b981'
          : '1px solid #333333',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: isSearchMatch
          ? '0 0 0 2px rgba(24, 144, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.15)',
        cursor: 'pointer',
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
            flex: '1',
            marginRight: '8px',
          }}
          title={nodeData.name}
        >
          {nodeData.name}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666666',
            }}
            onClick={handleEdit}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M11.95 2C6.47 2 2 6.48 2 12s4.47 10 9.95 10C17.53 22 22 17.52 22 12S17.53 2 11.95 2zm3.7 15.38c-.2 0-.39-.1-.54-.25l-2.5-2.5c-.14-.14-.25-.34-.25-.54 0-.2.1-.39.25-.54l2.5-2.5c.14-.14.34-.25.54-.25.2 0 .39.1.54.25l2.5 2.5c.14.14.25.34.25.54 0 .2-.1.39-.25.54l-2.5 2.5c-.15.15-.34.25-.54.25zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
            </svg>
          </button>
          <button
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666666',
            }}
            onClick={handleDelete}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#e8e8e8' }} />

      {nodeData.isExpanded && (
        <div style={{ padding: '12px' }}>
          <NoteList
            items={nodeData.children}
            parentNodeId={nodeData.id}
            onAdd={onAddListItem}
            onEdit={onUpdateListItem}
            onDelete={onDeleteListItem}
          />
        </div>
      )}
    </div>
  );
};

register({
  shape: 'react-node',
  width: 240,
  height: 60,
  effect: ['data'],
  component: ReactNodeComponent,
});

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'blank' | 'node' | 'edge';
  nodeId?: string;
  edgeId?: string;
}



export function GraphCanvas({ onEditNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: 'blank',
  });
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showEdgeEditModal, setShowEdgeEditModal] = useState(false);
  const [editingEdge, setEditingEdge] = useState<{ id: string; sourceId: string; targetId: string } | null>(null);

  const {
    currentNodes,
    currentLevelId,
    searchKeyword,
    globalDisplayMode,
    canvasView,
    setCanvasView,
    updateNode,
    deleteNode,
    toggleNodeExpand,
    openPopover,
    closePopover,
    openDrawer,
    closeDrawer,
    popoverVisibleNodeId,
    drillDown,
    nodePositions,
    updateNodePosition,
    resetNodePositions,
    addListItem,
    updateListItem,
    deleteListItem,
  } = useStore();

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditNode = useCallback((nodeId: string) => {
    const node = currentNodes.find((n) => n.id === nodeId);
    if (node && onEditNode) {
      onEditNode(node);
    } else {
      updateNode(nodeId, { displayMode: 'drawer' });
    }
  }, [currentNodes, onEditNode, updateNode]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = currentNodes.find((n) => n.id === nodeId);
    if (!node) return;

    const dependentNodes = currentNodes.filter((n) => n.dependencies.includes(nodeId));
    const hasDependents = dependentNodes.length > 0;

    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除节点「{node.name}」吗？</p>
          {hasDependents && (
            <p style={{ color: '#ef4444', marginTop: '8px' }}>
              ⚠️ 警告：有 {dependentNodes.length} 个节点依赖此节点，删除后将断裂依赖连线
            </p>
          )}
          {node.children.length > 0 && (
            <p style={{ color: '#faad14', marginTop: '8px' }}>
              ℹ️ 提示：该节点包含 {node.children.length} 条附属笔记，删除后笔记将一并移除
            </p>
          )}
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <Button
              danger
              onClick={() => {
                Modal.confirm({
                  title: '级联删除确认',
                  content: (
                    <div>
                      <p>确定要级联删除节点「{node.name}」及其所有关联数据吗？</p>
                      <p style={{ color: '#ef4444', marginTop: '8px' }}>
                        ⚠️ 此操作不可恢复，将删除该节点、所有依赖它的节点及附属笔记
                      </p>
                    </div>
                  ),
                  okText: '确认级联删除',
                  okType: 'danger',
                  cancelText: '取消',
                  onOk: () => {
                    deleteNode(nodeId, true);
                    message.success('✅ 节点已级联删除');
                  },
                });
              }}
            >
              级联删除
            </Button>
          </div>
        </div>
      ),
      okText: '仅删除当前节点',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteNode(nodeId, false);
        message.success('✅ 节点已删除');
      },
    });
  }, [currentNodes, deleteNode]);

  const calculateNodePositions = useCallback((nodes: NodeItem[]) => {
    const nodeWidth = 240;
    const nodeGapX = 60;
    const nodeGapY = 40;
    const cols = 3;

    let currentRow = 0;
    let currentCol = 0;
    let rowHeights: number[] = [0];
    const positions: Record<string, { x: number; y: number }> = {};

    nodes.forEach((node) => {
      const childrenHeight = node.isExpanded
        ? Math.max(60, node.children.length * 60 + 80)
        : 0;
      const height = Math.max(60, 60 + (node.isExpanded ? childrenHeight : 0));

      rowHeights[currentRow] = Math.max(rowHeights[currentRow], height);

      currentCol++;
      if (currentCol >= cols) {
        currentCol = 0;
        currentRow++;
        rowHeights[currentRow] = 0;
      }
    });

    const totalWidth = cols * nodeWidth + (cols - 1) * nodeGapX;
    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + (rowHeights.length - 1) * nodeGapY;
    const startX = Math.max(50, (800 - totalWidth) / 2);
    const startY = Math.max(50, (600 - totalHeight) / 2);

    currentRow = 0;
    currentCol = 0;

    nodes.forEach((node) => {
      const x = startX + currentCol * (nodeWidth + nodeGapX);
      const y = startY + rowHeights.slice(0, currentRow).reduce((sum, h) => sum + h + nodeGapY, 0);

      positions[node.id] = { x, y };

      currentCol++;
      if (currentCol >= cols) {
        currentCol = 0;
        currentRow++;
      }
    });

    return positions;
  }, []);

  const renderAllGraph = useCallback(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;

    graph.batchUpdate(() => {
      graph.clearCells();

      const filteredNodes = currentNodes.filter((node) => {
        if (!searchKeyword) return true;
        return node.name.toLowerCase().includes(searchKeyword.toLowerCase());
      });

      if (filteredNodes.length === 0) {
        return;
      }

      const nodeIdSet = new Set(filteredNodes.map((n) => n.id));
      const positions = calculateNodePositions(filteredNodes);

      filteredNodes.forEach((node) => {
        const childrenHeight = node.isExpanded
          ? Math.max(60, node.children.length * 60 + 80)
          : 0;
        const height = Math.max(60, 60 + (node.isExpanded ? childrenHeight : 0));

        const savedPos = nodePositions[node.id];
        const pos = savedPos || positions[node.id];

        const data: CustomNodeData = {
          node,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onToggleExpand: toggleNodeExpand,
          onAddListItem: addListItem,
          onUpdateListItem: updateListItem,
          onDeleteListItem: deleteListItem,
        };

        graph.addNode({
          id: node.id,
          shape: 'react-node',
          x: pos.x,
          y: pos.y,
          width: 240,
          height,
          data,
          zIndex: 1,
        });
      });

      filteredNodes.forEach((node) => {
        node.dependencies.forEach((depId) => {
          if (nodeIdSet.has(depId)) {
            graph.addEdge({
              id: `edge-${depId}-${node.id}`,
              source: depId,
              target: node.id,
              attrs: {
                line: {
                  stroke: '#999999',
                  strokeWidth: 1.5,
                  targetMarker: {
                    name: 'classic',
                    size: 8,
                  },
                },
              },
              zIndex: 0,
              data: {
                sourceId: depId,
                targetId: node.id,
              },
            });
          }
        });
      });
    });
  }, [currentNodes, searchKeyword, handleEditNode, handleDeleteNode, toggleNodeExpand, calculateNodePositions, nodePositions, addListItem, updateListItem, deleteListItem]);

  const updateGraphIncrementally = useCallback(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;

    const currentGraphNodeIds = new Set(graph.getNodes().map((n) => n.id));

    const filteredNodes = currentNodes.filter((node) => {
      if (!searchKeyword) return true;
      return node.name.toLowerCase().includes(searchKeyword.toLowerCase());
    });
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    const positions = calculateNodePositions(filteredNodes);

    graph.batchUpdate(() => {
      currentGraphNodeIds.forEach((nodeId) => {
        if (!filteredNodeIds.has(nodeId)) {
          graph.removeNode(nodeId);
        }
      });

      const nodeWidth = 240;

      filteredNodes.forEach((node) => {
        const existingCell = graph.getCellById(node.id);
        const existingNode = existingCell?.isNode() ? (existingCell as any) : null;
        const childrenHeight = node.isExpanded
          ? Math.max(60, node.children.length * 60 + 80)
          : 0;
        const height = Math.max(60, 60 + (node.isExpanded ? childrenHeight : 0));

        const data: CustomNodeData = {
          node,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onToggleExpand: toggleNodeExpand,
          onAddListItem: addListItem,
          onUpdateListItem: updateListItem,
          onDeleteListItem: deleteListItem,
        };

        const savedPos = nodePositions[node.id];
        const pos = savedPos || positions[node.id];

        if (existingNode) {
          const currentData = existingNode.getData() as CustomNodeData;
          if (currentData?.node !== node) {
            existingNode.setData(data);
          }
          existingNode.setSize(nodeWidth, height);
          existingNode.setPosition(pos.x, pos.y);
        } else {
          graph.addNode({
            id: node.id,
            shape: 'react-node',
            x: pos.x,
            y: pos.y,
            width: nodeWidth,
            height,
            data,
            zIndex: 1,
          });
        }
      });

      graph.getEdges().forEach((edge) => {
        graph.removeEdge(edge);
      });

      filteredNodes.forEach((node) => {
        node.dependencies.forEach((depId) => {
          if (filteredNodeIds.has(depId)) {
            graph.addEdge({
              id: `edge-${depId}-${node.id}`,
              source: depId,
              target: node.id,
              attrs: {
                line: {
                  stroke: '#999999',
                  strokeWidth: 1.5,
                  targetMarker: {
                    name: 'classic',
                    size: 8,
                  },
                },
              },
              zIndex: 0,
              data: {
                sourceId: depId,
                targetId: node.id,
              },
            });
          }
        });
      });
    });
  }, [currentNodes, searchKeyword, handleEditNode, handleDeleteNode, toggleNodeExpand, nodePositions, calculateNodePositions, addListItem, updateListItem, deleteListItem]);

  const handleNodeClick = useCallback((e: any) => {
    const node = e.node;
    const nodeData = node.getData() as CustomNodeData;
    if (!nodeData?.node) return;

    const nodeId = nodeData.node.id;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }

    const nodeDisplayMode = nodeData.node.displayMode;
    const targetMode = nodeDisplayMode || globalDisplayMode;

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;

      if (targetMode === 'inner') {
        toggleNodeExpand(nodeId);
        return;
      }

      switch (targetMode) {
        case 'popover':
          if (popoverVisibleNodeId === nodeId) {
            closePopover();
          } else {
            closePopover();
            closeDrawer();

            const bbox = node.getBBox();
            setPopoverPosition({ x: bbox.x + bbox.width, y: bbox.y });

            setTimeout(() => {
              openPopover(nodeId);
            }, 50);
          }
          break;

        case 'drawer':
          closePopover();
          openDrawer(nodeId);
          break;
      }
    }, 300);
  }, [globalDisplayMode, closePopover, closeDrawer, openPopover, openDrawer, popoverVisibleNodeId, toggleNodeExpand]);

  const handleNodeDoubleClick = useCallback((e: any) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    const node = e.node;
    const nodeData = node.getData() as CustomNodeData;
    if (!nodeData?.node) return;

    const targetChildren = nodeData.node.children;
    if (targetChildren.length === 0) {
      message.info('该节点没有子节点');
      return;
    }

    setTimeout(() => {
      drillDown(nodeData.node.id);
    }, 10);
  }, [drillDown]);

  const handleAddNodeFromMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
    setShowAddNodeModal(true);
  }, []);

  const handleDeleteNodeFromMenu = useCallback((nodeId: string) => {
    const node = currentNodes.find((n) => n.id === nodeId);
    if (!node) return;

    Modal.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除节点「{node.name}」吗？</p>
          {node.children.length > 0 && (
            <p style={{ color: '#faad14', marginTop: '8px' }}>
              ℹ️ 提示：该节点包含 {node.children.length} 条附属笔记，删除后笔记将一并移除
            </p>
          )}
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteNode(nodeId, false);
        message.success('✅ 节点已删除');
      },
    });

    setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
  }, [currentNodes, deleteNode]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    const graph = graphRef.current;
    if (!graph) return;

    const edge = graph.getCellById(edgeId);
    if (!edge || !edge.isEdge()) return;

    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();

    if (!sourceId || !targetId) {
      graph.removeEdge(edge);
      return;
    }

    const targetNode = currentNodes.find((n) => n.id === targetId);
    if (!targetNode) {
      graph.removeEdge(edge);
      return;
    }

    updateNode(targetId, {
      dependencies: targetNode.dependencies.filter((id) => id !== sourceId),
    });

    message.success('✅ 依赖关系已删除');
    setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
    setSelectedEdgeId(null);
  }, [currentNodes, updateNode]);

  const handleEditEdge = useCallback((edgeId: string) => {
    const graph = graphRef.current;
    if (!graph) return;

    const edge = graph.getCellById(edgeId);
    if (!edge || !edge.isEdge()) return;

    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();

    if (!sourceId || !targetId) return;

    setEditingEdge({ id: edgeId, sourceId, targetId });
    setShowEdgeEditModal(true);
    setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
  }, []);

  const handleUpdateEdge = useCallback((newSourceId: string, newTargetId: string) => {
    if (!editingEdge) return;

    const graph = graphRef.current;
    if (!graph) return;

    if (newSourceId === newTargetId) {
      message.error('⚠️ 不能创建自依赖');
      return;
    }

    const hasExistingEdge = graph.getEdges().some((e: any) => {
      const s = e.getSourceCellId();
      const t = e.getTargetCellId();
      return s === newSourceId && t === newTargetId && e.id !== editingEdge.id;
    });

    if (hasExistingEdge) {
      message.error('⚠️ 依赖关系已存在');
      return;
    }

    const oldSourceId = editingEdge.sourceId;
    const oldTargetId = editingEdge.targetId;

    if (oldTargetId !== newTargetId) {
      const oldTargetNode = currentNodes.find((n) => n.id === oldTargetId);
      if (oldTargetNode) {
        updateNode(oldTargetId, {
          dependencies: oldTargetNode.dependencies.filter((id) => id !== oldSourceId),
        });
      }
    }

    if (oldSourceId !== newSourceId || oldTargetId !== newTargetId) {
      const newTargetNode = currentNodes.find((n) => n.id === newTargetId);
      if (newTargetNode) {
        const newDependencies = [...newTargetNode.dependencies];
        if (!newDependencies.includes(newSourceId)) {
          newDependencies.push(newSourceId);
        }
        updateNode(newTargetId, { dependencies: newDependencies });
      }
    }

    message.success('✅ 依赖关系已更新');
    setShowEdgeEditModal(false);
    setEditingEdge(null);
    setSelectedEdgeId(null);
  }, [editingEdge, currentNodes, updateNode]);

  const handleEdgeClick = useCallback((e: any) => {
    const edge = e.edge;
    setSelectedEdgeId(edge.id);

    const edges = graphRef.current?.getEdges();
    edges?.forEach((ed: any) => {
      ed.setAttrs({
        line: {
          stroke: ed.id === edge.id ? '#1890ff' : '#999999',
          strokeWidth: ed.id === edge.id ? 3 : 1.5,
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    let graph: Graph | null = null;
    graph = new Graph({
      container,
      width,
      height,
      grid: {
        size: 10,
        visible: true,
      },
      panning: {
        enabled: true,
        eventTypes: ['leftMouseDown'],
      },
      mousewheel: {
        enabled: true,
        factor: 1.1,
      },
      connecting: {
        router: 'manhattan',
        connector: {
          name: 'rounded',
          args: {
            radius: 8,
          },
        },
        anchor: 'center',
        connectionPoint: 'anchor',
        allowBlank: false,
        snap: {
          radius: 20,
        },
        createEdge() {
          if (!graph) return null;
          return graph.createEdge({
            attrs: {
              line: {
                stroke: '#1890ff',
                strokeWidth: 2,
                targetMarker: {
                  name: 'classic',
                  size: 8,
                },
              },
            },
            zIndex: 0,
          });
        },
        validateConnection({ sourceCell, targetCell }) {
          if (!sourceCell || !targetCell) return false;
          if (sourceCell.id === targetCell.id) return false;
          return true;
        },
      },
      autoResize: true,
    });

    graphRef.current = graph;
    setIsReady(true);

    if (canvasView) {
      graph.scale(canvasView.zoom);
      graph.translate(canvasView.x, canvasView.y);
    }

    let currentZoom = canvasView?.zoom ?? 1;
    let currentTx = canvasView?.x ?? 0;
    let currentTy = canvasView?.y ?? 0;

    graph.on('zoom', () => {
      currentZoom = graph.zoom();
      const { tx, ty } = graph.translate();
      currentTx = tx;
      currentTy = ty;
      setCanvasView({ zoom: currentZoom, x: currentTx, y: currentTy });
      closePopover();
    });

    graph.on('translate', () => {
      currentZoom = graph.zoom();
      const { tx, ty } = graph.translate();
      currentTx = tx;
      currentTy = ty;
      setCanvasView({ zoom: currentZoom, x: currentTx, y: currentTy });
      closePopover();
    });

    graph.on('node:click', handleNodeClick);
    graph.on('node:dblclick', handleNodeDoubleClick);
    graph.on('edge:click', handleEdgeClick);

    graph.on('node:moved', ({ node }: { node: any }) => {
      const { x, y } = node.position();
      updateNodePosition(node.id, { x, y });
    });

    graph.on('edge:connected', ({ edge }: { edge: any }) => {
      const sourceId = edge.getSourceCellId();
      const targetId = edge.getTargetCellId();

      if (!sourceId || !targetId) {
        graph.removeEdge(edge);
        return;
      }

      const targetNode = currentNodes.find((n) => n.id === targetId);
      if (!targetNode) {
        graph.removeEdge(edge);
        return;
      }

      if (targetNode.dependencies.includes(sourceId)) {
        graph.removeEdge(edge);
        message.warning('依赖关系已存在');
        return;
      }

      updateNode(targetId, {
        dependencies: [...targetNode.dependencies, sourceId],
      });

      message.success('✅ 依赖关系已添加');
    });

    graph.on('node:mouseenter', ({ node }: { node: any }) => {
      const edges = graph.getEdges();
      edges.forEach((edge: any) => {
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        if (sourceId === node.id || targetId === node.id) {
          edge.setAttrs({
            line: {
              stroke: '#1890ff',
              strokeWidth: 2,
            },
          });
        }
      });
    });

    graph.on('node:mouseleave', () => {
      const edges = graph.getEdges();
      edges.forEach((edge: any) => {
        edge.setAttrs({
          line: {
            stroke: '#999999',
            strokeWidth: 1.5,
          },
        });
      });
    });

    graph.on('blank:click', () => {
      closePopover();
      closeDrawer();
      setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
      setSelectedEdgeId(null);

      const edges = graph.getEdges();
      edges.forEach((edge: any) => {
        edge.setAttrs({
          line: {
            stroke: '#999999',
            strokeWidth: 1.5,
          },
        });
      });
    });

    graph.on('blank:contextmenu', (e: any) => {
      e.preventDefault?.();
      const domEvent = e.originalEvent || e.nativeEvent || e;
      const { clientX, clientY } = domEvent;
      const containerRect = container.getBoundingClientRect();
      const canvasX = clientX - containerRect.left;
      const canvasY = clientY - containerRect.top;
      setContextMenu({
        visible: true,
        x: canvasX,
        y: canvasY,
        type: 'blank',
      });
    });

    graph.on('node:contextmenu', (e: any) => {
      e.preventDefault?.();
      const { node } = e;
      const domEvent = e.originalEvent || e.nativeEvent || e;
      const { clientX, clientY } = domEvent;
      const containerRect = container.getBoundingClientRect();
      const canvasX = clientX - containerRect.left;
      const canvasY = clientY - containerRect.top;
      setContextMenu({
        visible: true,
        x: canvasX,
        y: canvasY,
        type: 'node',
        nodeId: node.id,
      });
    });

    graph.on('edge:contextmenu', (e: any) => {
      e.preventDefault?.();
      const { edge } = e;
      const domEvent = e.originalEvent || e.nativeEvent || e;
      const { clientX, clientY } = domEvent;
      const containerRect = container.getBoundingClientRect();
      const canvasX = clientX - containerRect.left;
      const canvasY = clientY - containerRect.top;
      setContextMenu({
        visible: true,
        x: canvasX,
        y: canvasY,
        type: 'edge',
        edgeId: edge.id,
      });
    });

    requestAnimationFrame(() => {
      renderAllGraph();
    });

    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) {
        graphRef.current.dispose();
        graphRef.current = null;
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      setIsReady(false);
    };
  }, [handleNodeClick, handleNodeDoubleClick, handleEdgeClick, renderAllGraph, canvasView, setCanvasView, closePopover, closeDrawer, updateNodePosition, currentNodes, updateNode]);

  useEffect(() => {
    if (isReady) {
      requestAnimationFrame(() => {
        updateGraphIncrementally();
      });
    }
  }, [updateGraphIncrementally, isReady]);

  useEffect(() => {
    if (!popoverVisibleNodeId) {
      setPopoverPosition(null);
    }
  }, [popoverVisibleNodeId]);

  useEffect(() => {
    if (graphRef.current) {
      const nodes = graphRef.current.getNodes();
      nodes.forEach((node) => {
        const nodeData = node.getData<CustomNodeData>();
        if (nodeData?.node) {
          const childrenHeight = nodeData.node.isExpanded
            ? Math.max(60, nodeData.node.children.length * 60 + 80)
            : 0;
          const height = 60 + (nodeData.node.isExpanded ? childrenHeight : 0);
          node.setSize(240, Math.max(60, height));
        }
      });
    }
  }, [currentNodes.map((n) => n.children.length)]);

  useEffect(() => {
    resetNodePositions();
  }, [currentLevelId, resetNodePositions]);

  const currentPopoverNode = useMemo(() => {
    if (!popoverVisibleNodeId || !popoverPosition) return null;
    return {
      nodeId: popoverVisibleNodeId,
      x: popoverPosition.x,
      y: popoverPosition.y,
    };
  }, [popoverVisibleNodeId, popoverPosition]);

  return (
    <div
      style={{
        width: '100%',
        height: `calc(100vh - ${TOOLBAR_HEIGHT + BREADCRUMB_HEIGHT}px)`,
        backgroundColor: '#f5f5f5',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {currentPopoverNode && (
        <NodePopover
          nodeId={currentPopoverNode.nodeId}
          x={currentPopoverNode.x}
          y={currentPopoverNode.y}
          onClose={closePopover}
        />
      )}

      {contextMenu.visible && (
        <div
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e8e8e8',
            zIndex: 1000,
            minWidth: '160px',
          }}
        >
          {contextMenu.type === 'blank' && (
            <>
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#333333',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={handleAddNodeFromMenu}
              >
                + 添加节点
              </div>
              <div style={{ height: '1px', backgroundColor: '#e8e8e8' }} />
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#999999',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={() => setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' })}
              >
                取消
              </div>
            </>
          )}
          {contextMenu.type === 'node' && contextMenu.nodeId && (
            <>
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff2f0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={() => handleDeleteNodeFromMenu(contextMenu.nodeId!)}
              >
                删除节点
              </div>
              <div style={{ height: '1px', backgroundColor: '#e8e8e8' }} />
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#999999',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={() => setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' })}
              >
                取消
              </div>
            </>
          )}
          {contextMenu.type === 'edge' && contextMenu.edgeId && (
            <>
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#1890ff',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e6f7ff')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={() => handleEditEdge(contextMenu.edgeId!)}
              >
                编辑依赖关系
              </div>
              <div style={{ height: '1px', backgroundColor: '#e8e8e8' }} />
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff2f0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={() => handleDeleteEdge(contextMenu.edgeId!)}
              >
                删除依赖关系
              </div>
              <div style={{ height: '1px', backgroundColor: '#e8e8e8' }} />
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  color: '#999999',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                onClick={() => setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' })}
              >
                取消
              </div>
            </>
          )}
        </div>
      )}

      {currentNodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#999999',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>暂无画布数据</div>
          <div style={{ fontSize: '14px' }}>请添加节点或加载数据</div>
        </div>
      )}

      {selectedEdgeId && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 100,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '14px', color: '#333333' }}>已选中依赖关系</span>
          <Button
            size="small"
            onClick={() => {
              handleEditEdge(selectedEdgeId!);
            }}
          >
            编辑
          </Button>
          <Button
            danger
            size="small"
            onClick={() => {
              handleDeleteEdge(selectedEdgeId!);
            }}
          >
            删除
          </Button>
        </div>
      )}

      <NodeModal
        visible={showAddNodeModal}
        onCancel={() => setShowAddNodeModal(false)}
      />

      <Modal
        title="编辑依赖关系"
        open={showEdgeEditModal}
        onCancel={() => {
          setShowEdgeEditModal(false);
          setEditingEdge(null);
        }}
        onOk={() => {
          if (editingEdge) {
            handleUpdateEdge(editingEdge.sourceId, editingEdge.targetId);
          }
        }}
        width={450}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>源节点</label>
            <Select
              value={editingEdge?.sourceId}
              onChange={(value) => {
                if (editingEdge && value) {
                  setEditingEdge({ ...editingEdge, sourceId: value });
                }
              }}
              style={{ width: '100%' }}
              options={currentNodes.map((n) => ({
                value: n.id,
                label: n.name,
              }))}
              placeholder="请选择源节点"
            />
          </div>
          <div style={{ fontSize: '20px', color: '#1890ff', fontWeight: 'bold' }}>→</div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'block' }}>目标节点</label>
            <Select
              value={editingEdge?.targetId}
              onChange={(value) => {
                if (editingEdge && value) {
                  setEditingEdge({ ...editingEdge, targetId: value });
                }
              }}
              style={{ width: '100%' }}
              options={currentNodes.map((n) => ({
                value: n.id,
                label: n.name,
              }))}
              placeholder="请选择目标节点"
            />
          </div>
        </div>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
          依赖关系表示：源节点 → 目标节点（目标节点依赖于源节点）
        </p>
      </Modal>
    </div>
  );
}
