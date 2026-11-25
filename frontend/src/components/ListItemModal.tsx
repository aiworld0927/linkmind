import { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { APP_CONFIG } from '@/config/app';
import type { ListItem, NoteDraft, OperationResult } from '@/types';

interface ListItemModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (draft: NoteDraft) => OperationResult;
  editingItem?: ListItem | null;
}

export function ListItemModal({ visible, onCancel, onSubmit, editingItem }: ListItemModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (editingItem) {
        form.setFieldsValue({
          content: editingItem.content,
          tags: editingItem.tagList.join(','),
          remark: editingItem.remark,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editingItem, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const tags: string = values.tags ?? '';
      const result = onSubmit({
        content: String(values.content ?? '').trim(),
        tagList: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        remark: String(values.remark ?? '').trim(),
      });
      if (result.ok) onCancel();
    } catch {
      // 表单校验失败时由 antd 在字段下方提示，无需额外处理
    }
  };

  return (
    <Modal
      title={editingItem ? '编辑笔记' : '添加笔记'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={460}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="content"
          label="笔记内容"
          rules={[
            { required: true, whitespace: true, message: '请输入笔记内容' },
            { max: APP_CONFIG.limits.maxContentLength, message: `最多 ${APP_CONFIG.limits.maxContentLength} 个字符` },
          ]}
        >
          <Input.TextArea placeholder="请输入笔记内容..." rows={4} showCount maxLength={APP_CONFIG.limits.maxContentLength} />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Input placeholder="输入标签，多个标签用逗号分隔" prefix={<PlusOutlined />} />
        </Form.Item>

        <Form.Item name="remark" label="备注">
          <Input.TextArea
            placeholder="添加备注信息..."
            rows={2}
            maxLength={APP_CONFIG.limits.maxRemarkLength}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
