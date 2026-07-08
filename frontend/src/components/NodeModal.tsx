import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import type { NodeItem, DisplayMode } from '@/types';
import { useStore } from '@/store';

interface NodeModalProps {
  visible: boolean;
  onCancel: () => void;
  editingNode?: NodeItem | null;
}

export function NodeModal({ visible, onCancel, editingNode }: NodeModalProps) {
  const [form] = Form.useForm();
  const [nameError, setNameError] = useState('');

  const {
    currentNodes,
    globalDisplayMode,
    addNode,
    updateNode,
    checkCircleDepend,
    checkNodeNameRepeat,
  } = useStore();

  useEffect(() => {
    if (visible) {
      setNameError('');
      if (editingNode) {
        form.setFieldsValue({
          name: editingNode.name,
          dependencies: editingNode.dependencies,
          displayMode: editingNode.displayMode || globalDisplayMode,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          displayMode: globalDisplayMode,
        });
      }
    }
  }, [visible, editingNode, globalDisplayMode]);

  const handleNameBlur = async () => {
    const values = await form.validateFields(['name']);
    if (!values.name) return;

    const isRepeat = checkNodeNameRepeat(currentNodes, values.name, editingNode?.id);
    if (isRepeat) {
      setNameError('节点名称已存在');
    } else {
      setNameError('');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { name, dependencies, displayMode } = values;

      if (!name.trim()) {
        message.error('⚠️ 请输入节点名称');
        return;
      }

      const isRepeat = checkNodeNameRepeat(currentNodes, name, editingNode?.id);
      if (isRepeat) {
        message.error('⚠️ 节点名称已存在，请使用其他名称');
        return;
      }

      const selfId = editingNode?.id || `node-${Date.now()}`;
      if (checkCircleDepend(currentNodes, dependencies, selfId)) {
        message.error('⚠️ 检测到循环依赖，请调整依赖关系');
        return;
      }

      if (editingNode) {
        updateNode(editingNode.id, {
          name,
          dependencies,
          displayMode,
        });
        message.success('✅ 节点更新成功');
      } else {
        const newNode: NodeItem = {
          id: `node-${Date.now()}`,
          name,
          dependencies,
          children: [],
          isExpanded: false,
          displayMode,
          createTime: new Date().toISOString(),
        };
        addNode(newNode);
        message.success('✅ 节点创建成功');
      }

      onCancel();
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('⚠️ 表单校验失败，请检查输入内容');
    }
  };

  const nodeOptions = currentNodes
    .filter((node) => node.id !== editingNode?.id)
    .map((node) => ({
      value: node.id,
      label: node.name,
    }));

  const displayModeOptions: { value: DisplayMode; label: string }[] = [
    { value: 'inner', label: '内嵌' },
    { value: 'popover', label: '悬浮弹窗' },
    { value: 'drawer', label: '右侧抽屉' },
  ];

  return (
    <Modal
      title={editingNode ? '编辑节点' : '新增节点'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="节点名称"
          rules={[{ required: true, message: '请输入节点名称' }]}
          validateStatus={nameError ? 'error' : ''}
          help={nameError || ''}
        >
          <Input
            placeholder="请输入节点名称"
            onBlur={handleNameBlur}
          />
        </Form.Item>

        <Form.Item
          name="dependencies"
          label="依赖节点"
        >
          <Select
            mode="multiple"
            placeholder="请选择依赖节点（可多选）"
            options={nodeOptions}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="displayMode"
          label="附属展示模式"
        >
          <Select
            placeholder="选择展示模式"
            options={displayModeOptions}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
