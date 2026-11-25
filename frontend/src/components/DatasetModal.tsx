import { useEffect, useState } from 'react';
import { Input, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import type { GraphDataset } from '@/types';

interface DatasetModalProps {
  open: boolean;
  dataset: GraphDataset | null;
  onClose: () => void;
}

/** 首页地图的新建/编辑表单。 */
export function DatasetModal({ open, dataset, onClose }: DatasetModalProps) {
  const navigate = useNavigate();
  const createDataset = useStore((state) => state.createDataset);
  const updateDataset = useStore((state) => state.updateDataset);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(dataset?.title ?? '');
    setDescription(dataset?.description ?? '');
  }, [open, dataset]);

  const handleOk = () => {
    setSubmitting(true);
    const result = dataset
      ? updateDataset(dataset.id, { title, description })
      : createDataset(title, description);
    setSubmitting(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(result.message);
    onClose();
    if (!dataset) {
      const activeId = useStore.getState().activeDatasetId;
      navigate(`/map/${activeId}`);
    }
  };

  return (
    <Modal
      open={open}
      title={dataset ? '编辑知识地图' : '新建知识地图'}
      okText={dataset ? '保存' : '创建并进入'}
      cancelText="取消"
      confirmLoading={submitting}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
    >
      <div className="lm-form-row">
        <label htmlFor="lm-dataset-title">地图名称</label>
        <Input
          id="lm-dataset-title"
          value={title}
          maxLength={60}
          showCount
          placeholder="例如：机器学习知识体系"
          onChange={(event) => setTitle(event.target.value)}
          onPressEnter={handleOk}
        />
      </div>
      <div className="lm-form-row">
        <label htmlFor="lm-dataset-desc">描述</label>
        <Input.TextArea
          id="lm-dataset-desc"
          value={description}
          rows={3}
          maxLength={200}
          placeholder="补充这张地图的主题、范围或使用场景"
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </Modal>
  );
}
