import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Graph } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { Button, Modal, Select, Tag, message } from 'antd';
import {
  AimOutlined,
  AppstoreAddOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useStore } from '@/store';
import { APP_CONFIG, nodeColor } from '@/config/app';
import { computeContentBounds, computeFitView, computeGridLayout, measureNodeHeight } from '@/utils/layout';
import type { NodeItem } from '@/types';
import { CanvasNode } from './CanvasNode';
import { NodeModal } from './NodeModal';
import { NodePopover } from './NodePopover';

interface CanvasNodeData {
  node: NodeItem;
  color: string;
  highlighted: boolean;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onCardClick: (nodeId: string) => void;
  onCardDoubleClick: (nodeId: string) => void;
}

interface GraphCanvasProps {
  onEditNode?: (node: NodeItem) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'blank' | 'node' | 'edge';
  nodeId?: string;
  edgeId?: string;
}

const ReactNodeComponent = ({ node }: { node: { getData: () => CanvasNodeData } }) => {
  const data = node.getData();
  if (!data?.node) return null;

  const toggleNodeExpand = useStore((state) => state.toggleNodeExpand);
  const addListItem = useStore((state) => state.addListItem);
  const updateListItem = useStore((state) => state.updateListItem);
  const deleteListItem = useStore((state) => state.deleteListItem);

  return (
    <CanvasNode
      node={data.node}
      color={data.color}
      highlighted={data.highlighted}
      onEdit={data.onEdit}
      onDelete={data.onDelete}
      onCardClick={data.onCardClick}
      onCardDoubleClick={data.onCardDoubleClick}
      onToggleExpand={toggleNodeExpand}
      onAddNote={addListItem}
      onUpdateNote={updateListItem}
      onDeleteNotes={deleteListItem}
    />
  );
};

register({
  shape: 'linkmind-node',
  width: APP_CONFIG.node.width,
  height: APP_CONFIG.node.minHeight,
  effect: ['data'],
  component: ReactNodeComponent,
});

export function GraphCanvas({ onEditNode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const sizeRef = useRef({ width: 1024, height: 720 });
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualPositionRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, type: 'blank' });
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<{
    id: string;
    oldSourceId: string;
    oldTargetId: string;
    sourceId: string;
    targetId: string;
  } | null>(null);

  const {
    currentNodes,
    currentLevelId,
    activeDatasetId,
    searchKeyword,
    globalDisplayMode,
    popoverVisibleNodeId,
    nodePositions,
    setCanvasView,
    deleteNode,
    closePopover,
    closeDrawer,
    openPopover,
    openDrawer,
    updateNodePosition,
    resetNodePositions,
    registerCanvasController,
    addDependency,
    removeDependency,
    updateDependency,
    resetToRoot,
  } = useStore();

  const searchHits = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return new Set<string>();
    return new Set(
      currentNodes.filter((node) => node.name.toLowerCase().includes(keyword)).map((node) => node.id),
    );
  }, [currentNodes, searchKeyword]);

  /** 节点卡片右下角在画布坐标系中的屏幕位置（用于悬浮卡片定位） */
  const screenPoint = useCallback((nodeId: string): { x: number; y: number } | null => {
    const graph = graphRef.current;
    if (!graph) return null;
    const cell = graph.getCellById(nodeId);
    if (!cell || !cell.isNode()) return null;
    const bbox = cell.getBBox();
    const zoom = graph.zoom();
    const { tx, ty } = graph.translate();
    return { x: (bbox.x + bbox.width) * zoom + tx, y: (bbox.y + bbox.height / 2) * zoom + ty };
  }, []);

  /** 单击：延时 240ms 区分双击，按节点展示模式执行展开 / 悬浮 / 抽屉 */
  const handleCardClick = useCallback(
    (nodeId: string) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        return;
      }
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        const state = useStore.getState();
        const node = state.currentNodes.find((item) => item.id === nodeId);
        if (!node) return;
        const targetMode = node.displayMode || state.globalDisplayMode;

        if (targetMode === 'inner') {
          state.toggleNodeExpand(nodeId);
          return;
        }
        if (targetMode === 'popover') {
          if (state.popoverVisibleNodeId === nodeId) {
            state.closePopover();
            return;
          }
          state.closePopover();
          state.closeDrawer();
          setPopoverAnchor(screenPoint(nodeId));
          setTimeout(() => openPopover(nodeId), 20);
          return;
        }
        state.closePopover();
        state.openDrawer(nodeId);
      }, 240);
    },
    [openPopover, screenPoint],
  );

  /** 双击：下钻到该节点的子层级 */
  const handleCardDoubleClick = useCallback((nodeId: string) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    const state = useStore.getState();
    const node = state.currentNodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (node.children.length === 0) {
      message.info('该节点没有子节点');
      return;
    }
    state.drillDown(node.id);
  }, []);

  const handleEditNode = useCallback(
    (nodeId: string) => {
      const node = useStore.getState().currentNodes.find((item) => item.id === nodeId);
      if (!node) {
        message.error('节点不存在或已被删除');
        return;
      }
      if (onEditNode) onEditNode(node);
      else openDrawer(nodeId);
    },
    [onEditNode, openDrawer],
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    const state = useStore.getState();
    const node = state.currentNodes.find((item) => item.id === nodeId);
    if (!node) {
      message.error('节点不存在或已被删除');
      return;
    }
    const dependentCount = state.currentNodes.filter((item) => item.dependencies.includes(nodeId)).length;

    Modal.confirm({
      title: `删除节点「${node.name}」`,
      width: 480,
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <p>删除后节点及其附属笔记将从当前画布移除，可通过「操作记录」撤销。</p>
          {dependentCount > 0 && (
            <p style={{ color: '#b91c1c' }}>有无 {dependentCount} 个节点依赖此节点，仅删除节点时会自动清理这些依赖。</p>
          )}
          {node.children.length > 0 && (
            <p style={{ color: '#b45309' }}>该节点包含 {node.children.length} 条附属笔记，将一并移除。</p>
          )}
        </div>
      ),
      okText: '仅删除当前节点',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const result = deleteNode(nodeId, false);
        if (result.ok) message.success(result.message);
        else message.error(result.message);
      },
    });
  }, [deleteNode]);

  const renderGraph = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const state = useStore.getState();
    const layout = computeGridLayout(state.currentNodes, sizeRef.current);
    const keyword = state.searchKeyword.trim().toLowerCase();

    try {
      graph.batchUpdate(() => {
        graph.clearCells();

        state.currentNodes.forEach((node, index) => {
          const position = state.nodePositions[node.id] ?? layout.positions[node.id];
          if (!position) return;
          const data: CanvasNodeData = {
            node,
            color: nodeColor(index),
            highlighted: Boolean(keyword) && node.name.toLowerCase().includes(keyword),
            onEdit: handleEditNode,
            onDelete: handleDeleteNode,
            onCardClick: handleCardClick,
            onCardDoubleClick: handleCardDoubleClick,
          };
          graph.addNode({
            id: node.id,
            shape: 'linkmind-node',
            x: position.x,
            y: position.y,
            width: APP_CONFIG.node.width,
            height: measureNodeHeight(node),
            data,
            zIndex: 1,
          });
        });

        const nodeIds = new Set(state.currentNodes.map((node) => node.id));
        state.currentNodes.forEach((node, index) => {
          node.dependencies.forEach((sourceId) => {
            if (!nodeIds.has(sourceId)) return;
            graph.addEdge({
              id: `edge-${sourceId}-${node.id}`,
              source: sourceId,
              target: node.id,
              attrs: {
                line: {
                  stroke: '#b9c4d4',
                  strokeWidth: 1.4,
                  targetMarker: { name: 'classic', size: 7 },
                },
              },
              zIndex: 0,
              data: { sourceId, targetId: node.id, color: nodeColor(index) },
            });
          });
        });
      });
    } catch (error) {
      console.error('[linkmind] 渲染画布失败:', error);
      setGraphError('画布渲染失败，请刷新页面重试');
    }
  }, [handleCardClick, handleCardDoubleClick, handleDeleteNode, handleEditNode]);

  const centerContent = useCallback((maxZoom = 1.1) => {
    const graph = graphRef.current;
    if (!graph) return;
    const state = useStore.getState();
    if (state.currentNodes.length === 0) return;

    const positions: Record<string, { x: number; y: number }> = {};
    graph.getNodes().forEach((cell) => {
      const position = cell.position();
      positions[cell.id] = { x: position.x, y: position.y };
    });
    const bounds = computeContentBounds(state.currentNodes, positions);
    const view = computeFitView(bounds, sizeRef.current, { maxZoom });
    graph.zoomTo(view.zoom);
    graph.translate(view.x, view.y);
    setCanvasView({ zoom: view.zoom, x: view.x, y: view.y });
  }, [setCanvasView]);

  const relayout = useCallback(() => {
    manualPositionRef.current = false;
    resetNodePositions();
    requestAnimationFrame(() => {
      renderGraph();
      centerContent(1.1);
    });
  }, [centerContent, renderGraph, resetNodePositions]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    const graph = graphRef.current;
    if (!graph) return;
    const edge = graph.getCellById(edgeId);
    if (!edge || !edge.isEdge()) {
      message.error('依赖关系不存在');
      return;
    }
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    if (!sourceId || !targetId) {
      setSelectedEdgeId(null);
      return;
    }
    const result = removeDependency(sourceId, targetId);
    if (result.ok) {
      message.success(result.message);
      setSelectedEdgeId(null);
    } else {
      message.error(result.message);
    }
  }, [removeDependency]);

  const handleEdgeEdit = useCallback((edgeId: string) => {
    const graph = graphRef.current;
    if (!graph) return;
    const edge = graph.getCellById(edgeId);
    if (!edge || !edge.isEdge()) return;
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    if (!sourceId || !targetId) return;
    setEditingEdge({ id: edgeId, oldSourceId: sourceId, oldTargetId: targetId, sourceId, targetId });
    setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
  }, []);

  const handleEdgeUpdate = useCallback(() => {
    if (!editingEdge) return;
    const result = updateDependency(
      editingEdge.oldSourceId,
      editingEdge.oldTargetId,
      editingEdge.sourceId,
      editingEdge.targetId,
    );
    if (result.ok) {
      message.success(result.message);
      setEditingEdge(null);
      setSelectedEdgeId(null);
    } else {
      message.error(result.message);
    }
  }, [editingEdge, updateDependency]);

  // 画布初始化：仅执行一次，事件回调内部始终读取最新 store 状态
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 720;
    sizeRef.current = { width, height };

    let graph: Graph;
    try {
      graph = new Graph({
        container,
        width,
        height,
        background: { color: '#f5f7fa' },
        grid: { size: 10, visible: true, type: 'dot', args: { color: '#dfe5ee' } },
        panning: { enabled: true, eventTypes: ['leftMouseDown'] },
        mousewheel: {
          enabled: true,
          factor: 1.08,
          minScale: APP_CONFIG.layout.minZoom,
          maxScale: APP_CONFIG.layout.maxZoom,
          zoomAtMousePosition: true,
        },
        connecting: {
          router: 'manhattan',
          connector: { name: 'rounded', args: { radius: 8 } },
          anchor: 'center',
          connectionPoint: 'anchor',
          allowBlank: false,
          snap: { radius: 20 },
          createEdge() {
            return graph.createEdge({
              attrs: {
                line: {
                  stroke: '#1d4ed8',
                  strokeWidth: 2,
                  targetMarker: { name: 'classic', size: 7 },
                },
              },
              zIndex: 0,
            });
          },
          validateConnection({ sourceCell, targetCell }) {
            if (!sourceCell || !targetCell) return false;
            return sourceCell.id !== targetCell.id;
          },
        },
        autoResize: false,
      });
    } catch (error) {
      console.error('[linkmind] 初始化画布失败:', error);
      setGraphError('画布初始化失败，请刷新页面重试');
      return;
    }

    graphRef.current = graph;
    setIsReady(true);

    const initialView = useStore.getState().canvasView;
    graph.zoomTo(initialView.zoom);
    graph.translate(initialView.x, initialView.y);

    const handleEdgeClick = ({ edge }: { edge: any }) => {
      setSelectedEdgeId(edge.id);
      graph.getEdges().forEach((item) => {
        const active = item.id === edge.id;
        item.setAttrs({
          line: { stroke: active ? '#1d4ed8' : '#b9c4d4', strokeWidth: active ? 2.6 : 1.4 },
        });
      });
    };

    graph.on('edge:click', handleEdgeClick);

    graph.on('node:moved', ({ node }: { node: any }) => {
      manualPositionRef.current = true;
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
      const result = addDependency(sourceId, targetId);
      if (result.ok) message.success('依赖关系已添加');
      else {
        graph.removeEdge(edge);
        message.warning(result.message);
      }
    });

    graph.on('node:mouseenter', ({ node }: { node: any }) => {
      graph.getEdges().forEach((edge: any) => {
        const sourceId = edge.getSourceCellId();
        const targetId = edge.getTargetCellId();
        if (sourceId === node.id || targetId === node.id) {
          edge.setAttrs({ line: { stroke: '#1d4ed8', strokeWidth: 2 } });
        }
      });
    });

    graph.on('node:mouseleave', () => {
      graph.getEdges().forEach((edge: any) => {
        edge.setAttrs({ line: { stroke: '#b9c4d4', strokeWidth: 1.4 } });
      });
    });

    graph.on('blank:click', () => {
      closePopover();
      closeDrawer();
      setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });
      setSelectedEdgeId(null);
      graph.getEdges().forEach((edge: any) => {
        edge.setAttrs({ line: { stroke: '#b9c4d4', strokeWidth: 1.4 } });
      });
    });

    const openContextMenu = (event: any, type: ContextMenuState['type'], extra: Partial<ContextMenuState>) => {
      event.preventDefault?.();
      const domEvent = event.originalEvent ?? event.nativeEvent ?? event;
      const rect = container.getBoundingClientRect();
      const x = (domEvent.clientX ?? 0) - rect.left;
      const y = (domEvent.clientY ?? 0) - rect.top;
      setContextMenu({
        visible: true,
        x: Math.min(x, Math.max(0, container.clientWidth - 180)),
        y: Math.min(y, Math.max(0, container.clientHeight - 160)),
        type,
        ...extra,
      });
    };

    graph.on('blank:contextmenu', (event: any) => openContextMenu(event, 'blank', {}));
    graph.on('node:contextmenu', (event: any) =>
      openContextMenu(event, 'node', { nodeId: event.node?.id }),
    );
    graph.on('edge:contextmenu', (event: any) =>
      openContextMenu(event, 'edge', { edgeId: event.edge?.id }),
    );

    graph.on('zoom', () => {
      const { tx, ty } = graph.translate();
      setCanvasView({ zoom: graph.zoom(), x: tx, y: ty });
      closePopover();
    });
    graph.on('translate', () => {
      const { tx, ty } = graph.translate();
      setCanvasView({ zoom: graph.zoom(), x: tx, y: ty });
      closePopover();
    });

    const observer = new ResizeObserver(() => {
      const target = containerRef.current;
      if (!target) return;
      const nextWidth = target.clientWidth;
      const nextHeight = target.clientHeight;
      if (nextWidth === sizeRef.current.width && nextHeight === sizeRef.current.height) return;
      sizeRef.current = { width: nextWidth, height: nextHeight };
      graph.resize(nextWidth, nextHeight);
      if (!manualPositionRef.current) {
        resetNodePositions();
        renderGraph();
        requestAnimationFrame(() => centerContent(1.1));
      }
    });
    observer.observe(container);

    registerCanvasController({
      fit: () => centerContent(1.1),
      center: () => centerContent(1),
      zoom: (factor: number) => {
        const nextZoom = Math.min(
          APP_CONFIG.layout.maxZoom,
          Math.max(APP_CONFIG.layout.minZoom, graph.zoom() * factor),
        );
        graph.zoomTo(nextZoom);
      },
      relayout,
    });

    requestAnimationFrame(() => {
      renderGraph();
      centerContent(1.1);
    });

    return () => {
      observer.disconnect();
      registerCanvasController(null);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      graph.dispose();
      graphRef.current = null;
      setIsReady(false);
    };
    // 初始化仅执行一次；事件内部通过 useStore.getState() 读取最新数据
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 数据或搜索变化时增量重绘（保持画布交互状态）
  useEffect(() => {
    if (!isReady) return;
    requestAnimationFrame(() => renderGraph());
  }, [isReady, renderGraph, currentNodes, searchKeyword, nodePositions, globalDisplayMode]);

  // 切换层级/数据集时重新居中
  useEffect(() => {
    if (!isReady) return;
    manualPositionRef.current = false;
    requestAnimationFrame(() => centerContent(1.1));
  }, [isReady, currentLevelId, activeDatasetId, centerContent]);

  // 空状态或数据变化时，避免残留的弹层指向已删除节点
  useEffect(() => {
    if (!popoverVisibleNodeId) setPopoverAnchor(null);
  }, [popoverVisibleNodeId]);

  const currentPopoverAnchor = useMemo(
    () => (popoverVisibleNodeId && popoverAnchor ? popoverAnchor : null),
    [popoverVisibleNodeId, popoverAnchor],
  );

  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, type: 'blank' });

  const menuItemStyle = (color: string): React.CSSProperties => ({
    padding: '10px 14px',
    cursor: 'pointer',
    color,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  });

  return (
    <div className="lm-canvas">
      <div ref={containerRef} className="lm-canvas-graph" />

      {searchKeyword.trim() && (
        <div className="lm-search-badge">
          <Tag color={searchHits.size > 0 ? 'gold' : 'default'} style={{ marginInlineEnd: 0 }}>
            「{searchKeyword.trim()}」匹配 {searchHits.size} 个节点
          </Tag>
        </div>
      )}

      {currentPopoverAnchor && (
        <NodePopover
          nodeId={popoverVisibleNodeId ?? ''}
          x={currentPopoverAnchor.x}
          y={currentPopoverAnchor.y}
          onClose={closePopover}
        />
      )}

      {contextMenu.visible && (
        <div
          className="lm-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={closeContextMenu}
        >
          {contextMenu.type === 'blank' && (
            <>
              <div
                style={menuItemStyle('#1d4ed8')}
                onClick={() => {
                  closeContextMenu();
                  setShowAddNodeModal(true);
                }}
              >
                <AppstoreAddOutlined /> 添加节点
              </div>
              <div
                style={menuItemStyle('#4a5568')}
                onClick={() => {
                  closeContextMenu();
                  useStore.getState().canvasController?.relayout();
                }}
              >
                <AimOutlined /> 重新居中布局
              </div>
              <div className="lm-menu-divider" />
              <div
                style={menuItemStyle('#8a94a6')}
                onClick={() => {
                  closeContextMenu();
                  resetToRoot();
                }}
              >
                返回首页
              </div>
            </>
          )}
          {contextMenu.type === 'node' && contextMenu.nodeId && (
            <>
              <div
                style={menuItemStyle('#1d4ed8')}
                onClick={() => {
                  closeContextMenu();
                  handleEditNode(contextMenu.nodeId!);
                }}
              >
                <EditOutlined /> 编辑节点
              </div>
              <div
                style={menuItemStyle('#b91c1c')}
                onClick={() => {
                  closeContextMenu();
                  handleDeleteNode(contextMenu.nodeId!);
                }}
              >
                <DeleteOutlined /> 删除节点
              </div>
            </>
          )}
          {contextMenu.type === 'edge' && contextMenu.edgeId && (
            <>
              <div
                style={menuItemStyle('#1d4ed8')}
                onClick={() => {
                  handleEdgeEdit(contextMenu.edgeId!);
                  closeContextMenu();
                }}
              >
                <EditOutlined /> 编辑依赖关系
              </div>
              <div
                style={menuItemStyle('#b91c1c')}
                onClick={() => {
                  handleEdgeDelete(contextMenu.edgeId!);
                  closeContextMenu();
                }}
              >
                <DeleteOutlined /> 删除依赖关系
              </div>
            </>
          )}
        </div>
      )}

      {currentNodes.length === 0 && (
        <div className="lm-empty-state">
          <div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 17, color: '#1f2d3d', marginBottom: 6 }}>当前层级暂无节点</div>
          <div style={{ fontSize: 13, color: '#8a94a6', marginBottom: 16 }}>
            可以从工具栏新增节点，或导入一份数据集
          </div>
          <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => setShowAddNodeModal(true)}>
            新增节点
          </Button>
        </div>
      )}

      {graphError && (
        <div className="lm-error-banner">{graphError}</div>
      )}

      {selectedEdgeId && (
        <div className="lm-edge-bar">
          <span style={{ fontSize: 13, color: '#4a5568' }}>已选中依赖关系</span>
          <Button size="small" onClick={() => handleEdgeEdit(selectedEdgeId)}>
            编辑
          </Button>
          <Button size="small" danger onClick={() => handleEdgeDelete(selectedEdgeId)}>
            删除
          </Button>
        </div>
      )}

      <NodeModal visible={showAddNodeModal} onCancel={() => setShowAddNodeModal(false)} />

      <Modal
        title="编辑依赖关系"
        open={Boolean(editingEdge)}
        onCancel={() => setEditingEdge(null)}
        onOk={handleEdgeUpdate}
        width={460}
        destroyOnClose
      >
        <div className="lm-edge-editor">
          <div style={{ flex: 1 }}>
            <label className="lm-field-label">源节点</label>
            <Select
              value={editingEdge?.sourceId}
              onChange={(value) => {
                if (editingEdge && typeof value === 'string') {
                  setEditingEdge({ ...editingEdge, sourceId: value });
                }
              }}
              style={{ width: '100%' }}
              options={currentNodes.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="请选择源节点"
            />
          </div>
          <div className="lm-edge-arrow">→</div>
          <div style={{ flex: 1 }}>
            <label className="lm-field-label">目标节点</label>
            <Select
              value={editingEdge?.targetId}
              onChange={(value) => {
                if (editingEdge && typeof value === 'string') {
                  setEditingEdge({ ...editingEdge, targetId: value });
                }
              }}
              style={{ width: '100%' }}
              options={currentNodes.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="请选择目标节点"
            />
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#8a94a6', marginTop: 12 }}>
          依赖关系表示：源节点 → 目标节点（目标节点依赖于源节点）。保存时会进行循环依赖校验。
        </p>
      </Modal>
    </div>
  );
}
