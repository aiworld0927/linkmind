import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { APP_CONFIG } from '@/config/app';
import type { DisplayMode, NodeItem } from '@/types';
import { useStore } from '@/store';

interface NodeModalProps {
  visible: boolean;
  onCancel: () => void;
  editingNode?: NodeItem | null;
}

interface NodeFormValues {
  name: string;
  dependencies?: string[];
  displayMode?: DisplayMode;
}

export function NodeModal({ visible, onCancel, editingNode }: NodeModalProps) {
  const [form] = Form.useForm<NodeFormValues>();
  const [nameError, setNameError] = useState('');

  const currentNodes = useStore((state) => state.currentNodes);
  const globalDisplayMode = useStore((state) => state.globalDisplayMode);
  const addNode = useStore((state) => state.addNode);
  const updateNode = useStore((state) => state.updateNode);
  const checkNodeNameRepeat = useStore((state) => state.checkNodeNameRepeat);

  useEffect(() => {
    if (!visible) return;
    setNameError('');
    if (editingNode) {
      form.setFieldsValue({
        name: editingNode.name,
        dependencies: editingNode.dependencies,
        displayMode: editingNode.displayMode,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ displayMode: globalDisplayMode, dependencies: [] });
    }
  }, [visible, editingNode, globalDisplayMode, form]);

  const handleNameBlur = async () => {
    try {
      const values = await form.validateFields(['name']);
      const name = values.name?.trim();
      if (!name) return;
      setNameError(checkNodeNameRepeat(currentNodes, name, editingNode?.id) ? '节点名称已存在' : '');
    } catch {
      // 必填校验由表单负责
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const draft = {
        name: (values.name ?? '').trim(),
        dependencies: values.dependencies ?? [],
        displayMode: values.displayMode ?? globalDisplayMode,
      };

      const result = editingNode
        ? updateNode(editingNode.id, draft)
        : addNode(draft);

      if (result.ok) {
        message.success(result.message);
        onCancel();
      } else {
        message.error(result.message);
      }
    } catch {
      message.error('表单校验失败，请检查输入内容');
    }
  };

  const nodeOptions = currentNodes
    .filter((node) => node.id !== editingNode?.id)
    .map((node) => ({ value: node.id, label: node.name }));

  return (
    <Modal
      title={editingNode ? '编辑节点' : '新增节点'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={500}
      destroyOnClose
      maskClosable={false}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="name"
          label="节点名称"
          validateStatus={nameError ? 'error' : ''}
          help={nameError || undefined}
          rules={[
            { required: true, whitespace: true, message: '请输入节点名称' },
            { max: APP_CONFIG.limits.maxNameLength, message: `最多 ${APP_CONFIG.limits.maxNameLength} 个字符` },
          ]}
        >
          <Input placeholder="请输入节点名称" maxLength={APP_CONFIG.limits.maxNameLength} showCount onBlur={handleNameBlur} />
        </Form.Item>

        <Form.Item name="dependencies" label="依赖节点">
          <Select
            mode="multiple"
            placeholder="请选择依赖节点（可多选）"
            options={nodeOptions}
            style={{ width: '100%' }}
            allowClear
          />
        </Form.Item>

        <Form.Item name="displayMode" label="附属展示模式">
          <Select placeholder="选择展示模式" options={APP_CONFIG.displayModeOptions} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
