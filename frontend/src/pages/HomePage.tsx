import { useMemo, useState, type CSSProperties } from 'react';
import { Button, Empty, Input, Modal, Tag, message } from 'antd';
import {
  BranchesOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app';
import { useStore } from '@/store';
import type { GraphDataset } from '@/types';
import { DatasetModal } from '@/components/DatasetModal';

function datasetStats(dataset: GraphDataset) {
  const noteCount = dataset.nodes.reduce((total, node) => total + node.children.length, 0);
  const linkCount = dataset.nodes.reduce((total, node) => total + node.dependencies.length, 0);
  return { nodes: dataset.nodes.length, notes: noteCount, links: linkCount };
}

export function HomePage() {
  const navigate = useNavigate();
  const datasets = useStore((state) => state.datasets);
  const deleteDataset = useStore((state) => state.deleteDataset);
  const [keyword, setKeyword] = useState('');
  const [modal, setModal] = useState<{ open: boolean; dataset: GraphDataset | null }>({
    open: false,
    dataset: null,
  });

  const visibleDatasets = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return datasets;
    return datasets.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term),
    );
  }, [datasets, keyword]);

  const confirmDelete = (dataset: GraphDataset) => {
    Modal.confirm({
      title: `删除地图「${dataset.title}」？`,
      content: '该操作会移除地图及其节点、笔记数据，且无法从服务器恢复。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const result = deleteDataset(dataset.id);
        if (!result.ok) message.error(result.message);
        else message.success(result.message);
      },
    });
  };

  return (
    <div className="lm-page lm-home">
      <header className="lm-home-header">
        <div className="lm-brand">
          <div className="lm-brand-mark">LM</div>
          <div>
            <div className="lm-brand-title">LinkMind</div>
            <div className="lm-brand-sub">知识地图 · 文档 · Git 版本管理</div>
          </div>
        </div>
        <div className="lm-home-actions">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索地图"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ width: 220 }}
          />
          <Button icon={<BranchesOutlined />} onClick={() => navigate('/git')}>
            Git 管理
          </Button>
        </div>
      </header>

      <main className="lm-home-main">
        <div className="lm-home-title">
          <div>
            <h1>知识地图</h1>
            <p>选择一张地图进入脑图，或在属性中打开 Markdown 笔记。</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModal({ open: true, dataset: null })}
          >
            新建地图
          </Button>
        </div>

        {visibleDatasets.length === 0 ? (
          <Empty description="没有匹配的地图" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => setKeyword('')}>
              清空搜索
            </Button>
          </Empty>
        ) : (
          <div className="lm-card-grid">
            {visibleDatasets.map((dataset, index) => {
              const stats = datasetStats(dataset);
              return (
                <article
                  key={dataset.id}
                  className="lm-dataset-card"
                  style={
                    {
                      '--accent': APP_CONFIG.palette[index % APP_CONFIG.palette.length],
                    } as CSSProperties
                  }
                  onClick={() => navigate(`/map/${dataset.id}`)}
                >
                  <span className="lm-card-accent" />
                  <div className="lm-card-head">
                    <h2>{dataset.title}</h2>
                    <div className="lm-card-ops" onClick={(event) => event.stopPropagation()}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        title="编辑"
                        onClick={() => setModal({ open: true, dataset })}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        title="删除"
                        onClick={() => confirmDelete(dataset)}
                      />
                    </div>
                  </div>
                  <p className="lm-card-desc">{dataset.description || '暂无描述'}</p>
                  <div className="lm-card-stats">
                    <span>
                      <b>{stats.nodes}</b> 节点
                    </span>
                    <span>
                      <b>{stats.notes}</b> 笔记
                    </span>
                    <span>
                      <b>{stats.links}</b> 依赖
                    </span>
                  </div>
                  <div className="lm-card-foot">
                    <Tag color={stats.notes > 0 ? 'blue' : 'default'}>
                      {stats.notes > 0 ? '已有笔记' : '空地图'}
                    </Tag>
                    <span className="lm-card-enter">进入脑图 →</span>
                  </div>
                </article>
              );
            })}

            <button
              type="button"
              className="lm-dataset-card lm-dataset-new"
              onClick={() => setModal({ open: true, dataset: null })}
            >
              <PlusOutlined style={{ fontSize: 24 }} />
              <span>新建知识地图</span>
            </button>
          </div>
        )}
      </main>

      <DatasetModal
        open={modal.open}
        dataset={modal.dataset}
        onClose={() => setModal({ open: false, dataset: null })}
      />
    </div>
  );
}
