import { useMemo, useState } from 'react';
import { Badge, Button, Input, Modal, Select, Tooltip, message } from 'antd';
import {
  AimOutlined,
  AppstoreAddOutlined,
  BranchesOutlined,
  CompressOutlined,
  HomeOutlined,
  DownloadOutlined,
  ExpandOutlined,
  HistoryOutlined,
  MinusOutlined,
  SearchOutlined,
  UndoOutlined,
  UploadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { NodeModal } from './NodeModal';

const readImportSummary = (payload: Record<string, unknown>): { nodes: number | string; title: string } => {
  const dataset = payload.dataset as Record<string, unknown> | undefined;
  if (dataset && Array.isArray(dataset.nodes)) {
    return { nodes: dataset.nodes.length, title: String(dataset.title ?? '导入的数据集') };
  }
  if (Array.isArray(payload.nodes)) {
    return { nodes: payload.nodes.length, title: String(payload.title ?? '导入的数据集') };
  }
  if (Array.isArray(payload.currentNodes)) {
    return { nodes: payload.currentNodes.length, title: String(payload.title ?? '导入的备份') };
  }
  return { nodes: '未知', title: '未知数据集' };
};

export function Toolbar() {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const datasets = useStore((state) => state.datasets);
  const activeDatasetId = useStore((state) => state.activeDatasetId);
  const switchDataset = useStore((state) => state.switchDataset);
  const searchKeyword = useStore((state) => state.searchKeyword);
  const setSearchKeyword = useStore((state) => state.setSearchKeyword);
  const globalDisplayMode = useStore((state) => state.globalDisplayMode);
  const setGlobalDisplayMode = useStore((state) => state.setGlobalDisplayMode);
  const exportData = useStore((state) => state.exportData);
  const importData = useStore((state) => state.importData);
  const resetCanvas = useStore((state) => state.resetCanvas);
  const setAllExpanded = useStore((state) => state.setAllExpanded);
  const openLogDrawer = useStore((state) => state.openLogDrawer);
  const undoLastOperation = useStore((state) => state.undoLastOperation);
  const operationLog = useStore((state) => state.operationLog);
  const undoStack = useStore((state) => state.undoStack);
  const currentNodes = useStore((state) => state.currentNodes);

  const canvasController = useStore((state) => state.canvasController);

  const activeDatasetTitle = useMemo(
    () => datasets.find((item) => item.id === activeDatasetId)?.title ?? '未命名数据集',
    [datasets, activeDatasetId],
  );

  const handleSwitchDataset = (datasetId: string) => {
    const result = switchDataset(datasetId);
    if (result.ok) {
      message.success(result.message);
      navigate(`/map/${datasetId}`);
    } else {
      message.warning(result.message);
    }
  };

  const handleExpand = (expanded: boolean) => {
    const result = setAllExpanded(expanded);
    if (result.ok) message.success(result.message);
    else message.warning(result.message);
  };

  const handleExport = () => {
    if (busy) return;
    setBusy('export');
    try {
      const payload = exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `linkmind-${activeDatasetTitle}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('导出成功，文件已开始下载');
    } catch (error) {
      console.error('[linkmind] 导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = () => {
    if (busy) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setBusy('import');
      try {
        if (file.size > 5 * 1024 * 1024) {
          message.error('文件超过 5MB，请拆分后再导入');
          return;
        }
        const text = await file.text();
        let payload: unknown;
        try {
          payload = JSON.parse(text);
        } catch {
          message.error('文件解析失败，请确认是合法的 JSON 文件');
          return;
        }
        if (typeof payload !== 'object' || payload === null) {
          message.error('文件内容不是合法的数据集结构');
          return;
        }
        const summary = readImportSummary(payload as Record<string, unknown>);

        Modal.confirm({
          title: '确认导入数据',
          width: 460,
          content: (
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
              <p>即将导入「{summary.title}」，共 {summary.nodes} 个节点。</p>
              <p style={{ color: '#8a94a6' }}>导入后将切换为新的数据集，当前数据仍保留在数据集标签中。</p>
              <p style={{ color: '#b45309' }}>导入操作可通过「操作记录」撤销。</p>
            </div>
          ),
          okText: '确认导入',
          cancelText: '取消',
          onOk: () => {
            const result = importData(payload);
            if (result.ok) message.success(result.message);
            else message.error(result.message);
          },
        });
      } catch (error) {
        console.error('[linkmind] 导入失败:', error);
        message.error('导入失败，请检查文件内容');
      } finally {
        setBusy(null);
      }
    };
    input.click();
  };

  const handleReset = () => {
    Modal.confirm({
      title: '重置画布',
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <p>将恢复为内置示例数据，并清除所有自定义数据集。</p>
          <p style={{ color: '#b91c1c' }}>该操作会覆盖当前全部数据，可通过「操作记录」撤销。</p>
        </div>
      ),
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        resetCanvas();
        message.success('画布已重置为默认数据');
      },
    });
  };

  const handleUndo = () => {
    const result = undoLastOperation();
    if (result.ok) message.success(result.message);
    else message.warning(result.message);
  };

  return (
    <>
      <header className="lm-toolbar">
        <div className="lm-toolbar-main">
          <div
            className="lm-brand lm-brand-link"
            role="button"
            tabIndex={0}
            title="返回首页"
            onClick={() => navigate('/')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate('/');
            }}
          >
            <span className="lm-brand-mark">LM</span>
            <div>
              <div className="lm-brand-title">LinkMind 知识地图</div>
              <div className="lm-brand-sub">当前数据集：{activeDatasetTitle}</div>
            </div>
          </div>

          <div className="lm-dataset-tabs" role="tablist">
            {datasets.map((dataset) => (
              <button
                key={dataset.id}
                type="button"
                role="tab"
                aria-selected={dataset.id === activeDatasetId}
                className={`lm-tab${dataset.id === activeDatasetId ? ' is-active' : ''}`}
                onClick={() => handleSwitchDataset(dataset.id)}
                title={dataset.description ?? dataset.title}
              >
                {dataset.title}
              </button>
            ))}
          </div>

          <div className="lm-toolbar-actions">
            <Input
              allowClear
              className="lm-search"
              placeholder="搜索节点名称"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
            <Select
              className="lm-mode-select"
              value={globalDisplayMode}
              onChange={setGlobalDisplayMode}
              options={[
                { value: 'inner', label: '内嵌笔记' },
                { value: 'popover', label: '悬浮弹窗' },
                { value: 'drawer', label: '右侧抽屉' },
              ]}
            />
            <Button type="primary" icon={<AppstoreAddOutlined />} onClick={() => setShowAddModal(true)}>
              新增节点
            </Button>
          </div>
        </div>

        <div className="lm-toolbar-sub">
          <div className="lm-tool-group">
            <Tooltip title={`当前层级 ${currentNodes.length} 个节点`}>
              <span className="lm-counter">节点 {currentNodes.length}</span>
            </Tooltip>
            <Button className="lm-mini" icon={<ExpandOutlined />} onClick={() => handleExpand(true)}>
              全部展开
            </Button>
            <Button className="lm-mini" icon={<CompressOutlined />} onClick={() => handleExpand(false)}>
              全部折叠
            </Button>
            <Button className="lm-mini" icon={<AimOutlined />} onClick={() => canvasController?.relayout()}>
              居中布局
            </Button>
            <Button className="lm-mini" icon={<ZoomInOutlined />} onClick={() => canvasController?.zoom(1.15)}>
              放大
            </Button>
            <Button className="lm-mini" icon={<ZoomOutOutlined />} onClick={() => canvasController?.zoom(0.87)}>
              缩小
            </Button>
            <Button className="lm-mini" onClick={() => canvasController?.fit()}>
              适应屏幕
            </Button>
          </div>

          <div className="lm-tool-group">
            <Button className="lm-mini" icon={<HomeOutlined />} onClick={() => navigate('/')}>
              首页
            </Button>
            <Button className="lm-mini" icon={<BranchesOutlined />} onClick={() => navigate('/git')}>
              Git 管理
            </Button>
            <Badge count={operationLog.length} size="small" offset={[-2, 2]}>
              <Button className="lm-mini" icon={<HistoryOutlined />} onClick={openLogDrawer}>
                操作记录
              </Button>
            </Badge>
            <Tooltip title={undoStack.length > 0 ? '撤销上一步数据操作' : '暂无可撤销操作'}>
              <Button
                className="lm-mini"
                icon={<UndoOutlined />}
                disabled={undoStack.length === 0}
                onClick={handleUndo}
              >
                撤销
              </Button>
            </Tooltip>
            <Button className="lm-mini" icon={<DownloadOutlined />} loading={busy === 'export'} onClick={handleExport}>
              导出
            </Button>
            <Button className="lm-mini" icon={<UploadOutlined />} loading={busy === 'import'} onClick={handleImport}>
              导入
            </Button>
            <Button className="lm-mini lm-danger" icon={<MinusOutlined />} onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>
      </header>

      <NodeModal visible={showAddModal} onCancel={() => setShowAddModal(false)} />
    </>
  );
}
