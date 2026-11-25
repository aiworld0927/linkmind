import { Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { stateMeta } from '../labels';
import type { GitFile, GitRepo } from '../types';

interface FileChangeTableProps {
  repo: GitRepo;
  selected: string[];
  disabled: boolean;
  onChange: (keys: string[]) => void;
}

export function FileChangeTable({ repo, selected, disabled, onChange }: FileChangeTableProps) {
  const columns: TableColumnsType<GitFile> = [
    {
      title: '文件',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (value: string) => (
        <Typography.Text code style={{ fontSize: 12 }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 96,
      render: (_, record) => {
        const meta = stateMeta(record.state);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '暂存区',
      dataIndex: 'staged',
      key: 'staged',
      width: 96,
      render: (_, record) => {
        if (record.conflict) return <Tag>待解决</Tag>;
        return record.staged ? <Tag color="green">已暂存</Tag> : <Tag>未暂存</Tag>;
      },
    },
  ];

  return (
    <Table<GitFile>
      rowKey="path"
      size="small"
      pagination={false}
      columns={columns}
      dataSource={repo.files}
      locale={{ emptyText: '工作区干净，没有待提交的变更' }}
      rowSelection={{
        selectedRowKeys: selected,
        onChange: (keys) => onChange(keys.map(String)),
        getCheckboxProps: (record) => ({ disabled: disabled || record.conflict }),
      }}
    />
  );
}
