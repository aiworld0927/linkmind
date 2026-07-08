import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Graph } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { Modal, message, Button } from 'antd';
import { useStore } from '@/store';
import type { NodeItem } from '@/types';
import { NodePopover } from './NodePopover';
import { NoteList } from './NoteList';

interface CustomNodeData {
  node: NodeItem;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
}

interface GraphCanvasProps {
  onEditNode?: (node: NodeItem) => void;
}

const TOOLBAR_HEIGHT = 64;
const BREADCRUMB_HEIGHT = 40;

register({
  shape: 'react-node',
  width: 240,
  height: 60,
  effect: ['data'],
  component: ({ node }) => {
    const { addListItem, updateListItem, deleteListItem } = useStore();
    const data = node.getData<CustomNodeData>();
    if (!data) return null;
    const { node: nodeData, onEdit, onDelete, onToggleExpand } = data;

    const isSearchMatch = false;

    const handleClick = (e: React.MouseEvent) => {
      if (nodeData.displayMode === 'inner') {
        e.stopPropagation();
        onToggleExpand(nodeData.id);
      }
    };

    return (
      <div
        onClick={handleClick}
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
              onClick={(e) => {
                e.stopPropagation();
                onEdit(nodeData.id);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                onDelete(nodeData.id);
              }}
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
              onAdd={addListItem}
              onEdit={updateListItem}
              onDelete={deleteListItem}
            />
          </div>
        )}
      </div>
    );
  },
});

export function GraphCanvas({ onEditNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  const {
    currentNodes,
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
  } = useStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

      filteredNodes.forEach((node, index) => {
        const childrenHeight = node.isExpanded
          ? Math.max(60, node.children.length * 60 + 80)
          : 0;
        const height = 60 + (node.isExpanded ? childrenHeight : 0);

        const row = Math.floor(index / 3);
        const col = index % 3;

        const data: CustomNodeData = {
          node,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onToggleExpand: toggleNodeExpand,
        };

        graph.addNode({
          id: node.id,
          shape: 'react-node',
          x: col * 300 + 100,
          y: row * 450 + 100,
          width: 240,
          height: Math.max(60, height),
          data,
        });
      });

      filteredNodes.forEach((node) => {
        node.dependencies.forEach((depId) => {
          if (nodeIdSet.has(depId)) {
            graph.addEdge({
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
            });
          }
        });
      });
    });
  }, [currentNodes, searchKeyword, handleEditNode, handleDeleteNode, toggleNodeExpand]);

  const updateGraphIncrementally = useCallback(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;

    const currentGraphNodeIds = new Set(graph.getNodes().map((n) => n.id));

    const filteredNodes = currentNodes.filter((node) => {
      if (!searchKeyword) return true;
      return node.name.toLowerCase().includes(searchKeyword.toLowerCase());
    });
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    graph.batchUpdate(() => {
      currentGraphNodeIds.forEach((nodeId) => {
        if (!filteredNodeIds.has(nodeId)) {
          graph.removeNode(nodeId);
        }
      });

      filteredNodes.forEach((node, index) => {
        const existingCell = graph.getCellById(node.id);
        const existingNode = existingCell?.isNode() ? (existingCell as any) : null;
        const childrenHeight = node.isExpanded
          ? Math.max(60, node.children.length * 60 + 80)
          : 0;
        const height = 60 + (node.isExpanded ? childrenHeight : 0);

        const row = Math.floor(index / 3);
        const col = index % 3;

        const data: CustomNodeData = {
          node,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onToggleExpand: toggleNodeExpand,
        };

        if (existingNode) {
          const currentData = existingNode.getData() as CustomNodeData;
          if (currentData?.node !== node) {
            existingNode.setData(data);
          }
          existingNode.setSize(240, Math.max(60, height));
        } else {
          graph.addNode({
            id: node.id,
            shape: 'react-node',
            x: col * 300 + 100,
            y: row * 450 + 100,
            width: 240,
            height: Math.max(60, height),
            data,
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
            });
          }
        });
      });
    });
  }, [currentNodes, searchKeyword, handleEditNode, handleDeleteNode, toggleNodeExpand]);

  const handleNodeClick = useCallback((e: { node: { getData: () => CustomNodeData }; preventDefault: () => void }) => {
    e.preventDefault();

    const nodeData = e.node.getData();
    if (!nodeData?.node) return;

    const nodeId = nodeData.node.id;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }

    const nodeDisplayMode = nodeData.node.displayMode;
    const targetMode = nodeDisplayMode || globalDisplayMode;

    if (targetMode === 'inner') {
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;

      switch (targetMode) {
        case 'popover':
          if (popoverVisibleNodeId === nodeId) {
            closePopover();
          } else {
            closePopover();
            closeDrawer();

            const node = graphRef.current?.getCellById(nodeId);
            if (node) {
              const bbox = node.getBBox();
              setPopoverPosition({ x: bbox.x + bbox.width, y: bbox.y });
            }

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
  }, [globalDisplayMode, closePopover, closeDrawer, openPopover, openDrawer, popoverVisibleNodeId]);

  const handleNodeDoubleClick = useCallback((e: { node: { getData: () => CustomNodeData }; preventDefault: () => void }) => {
    e.preventDefault();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    const nodeData = e.node.getData();
    if (!nodeData?.node) return;

    const targetChildren = nodeData.node.children;
    if (targetChildren.length === 0) {
      return;
    }

    drillDown(nodeData.node.id);
  }, [drillDown]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const graph = new Graph({
      container,
      width,
      height,
      grid: {
        size: 10,
        visible: true,
      },
      panning: {
        enabled: true,
        eventTypes: ['leftMouseDown', 'mouseWheel'],
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
          return null;
        },
        validateConnection() {
          return false;
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

    graph.on('node:mouseenter', ({ node }) => {
      const edges = graph.getEdges();
      edges.forEach((edge) => {
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
      edges.forEach((edge) => {
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
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setIsReady(false);
    };
  }, [handleNodeClick, handleNodeDoubleClick]);

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
    </div>
  );
}
