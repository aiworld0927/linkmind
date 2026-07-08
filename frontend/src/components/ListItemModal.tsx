import { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ListItem } from '@/types';

interface ListItemModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (item: Omit<ListItem, 'id' | 'createTime' | 'parentNodeId'>) => void;
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
  }, [visible, editingItem]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { content, tags, remark } = values;

      if (!content.trim()) {
        return;
      }

      onSubmit({
        content: content.trim(),
        tagList: tags ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
        remark: remark || '',
      });

      onCancel();
    } catch {
      console.error('Form validation failed');
    }
  };

  return (
    <Modal
      title={editingItem ? '编辑笔记' : '添加笔记'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={450}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="content"
          label="笔记内容"
          rules={[{ required: true, message: '请输入笔记内容' }]}
        >
          <Input.TextArea
            placeholder="请输入笔记内容..."
            rows={4}
          />
        </Form.Item>

        <Form.Item
          name="tags"
          label="标签"
        >
          <Input
            placeholder="输入标签，多个标签用逗号分隔"
            prefix={<PlusOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="remark"
          label="备注"
        >
          <Input.TextArea
            placeholder="添加备注信息..."
            rows={2}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
