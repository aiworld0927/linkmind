import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, Modal, Spin, Tag, message } from 'antd';
import { FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { gitApi } from '../api';
import { useGitStore } from '../store';
import type { FsDirListing } from '../types';

interface RepoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RepoDialog({ open, onClose }: RepoDialogProps) {
  const addRepo = useGitStore((state) => state.addRepo);
  const busy = useGitStore((state) => state.busy);
  const [name, setName] = useState('');
  const [remote, setRemote] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [init, setInit] = useState(false);
  const [listing, setListing] = useState<FsDirListing | null>(null);
  const [listingError, setListingError] = useState<string | null>(null);
  const [loadingDirs, setLoadingDirs] = useState(false);

  const loadDirs = useCallback(async (path: string) => {
    setLoadingDirs(true);
    setListingError(null);
    try {
      const result = await gitApi.listDirs(path);
      setListing(result.data);
      setSelectedPath(result.data.path);
    } catch (error) {
      setListing(null);
      setListingError(error instanceof Error ? error.message : '目录读取失败');
    } finally {
      setLoadingDirs(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setName('');
    setRemote('');
    setInit(false);
    setSelectedPath('');
    void loadDirs('');
  }, [open, loadDirs]);

  const handleSelect = (path: string, dirName?: string) => {
    setSelectedPath(path);
    if (!name.trim() && dirName) setName(dirName);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      message.error('请填写仓库名称');
      return;
    }
    const success = await addRepo({
      name: name.trim(),
      fs_path: selectedPath,
      init,
      remote_url: remote.trim() ? remote.trim() : null,
    });
    if (success) onClose();
  };

  const segments = listing ? listing.path.split('/').filter(Boolean) : [];
  const breadcrumbs = [
    { label: listing?.rootName ?? '知识库根目录', path: '' },
    ...segments.map((segment, index) => ({
      label: segment,
      path: segments.slice(0, index + 1).join('/'),
    })),
  ];

  return (
    <Modal
      open={open}
      title="登记知识仓库"
      width={760}
      okText="登记仓库"
      cancelText="取消"
      confirmLoading={busy === 'add'}
      onOk={handleSubmit}
      onCancel={onClose}
      destroyOnClose
    >
      <div className="lm-form-row">
        <label htmlFor="lm-repo-name">仓库名称</label>
        <Input
          id="lm-repo-name"
          value={name}
          maxLength={120}
          placeholder="例如：机器学习知识库"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="lm-form-row">
        <label htmlFor="lm-repo-remote">远端地址（可选）</label>
        <Input
          id="lm-repo-remote"
          value={remote}
          placeholder="git@github.com:owner/repo.git 或 https://..."
          onChange={(event) => setRemote(event.target.value)}
        />
      </div>

      <div className="lm-form-row">
        <label>选择知识库目录（相对于服务器知识根目录）</label>
        <div className="lm-repo-browser">
          <div className="lm-repo-breadcrumb">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.path}-${index}`}>
                {index > 0 && <span className="lm-crumb-sep">/</span>}
                <button type="button" onClick={() => void loadDirs(item.path)}>
                  {item.label}
                </button>
              </span>
            ))}
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => void loadDirs(listing?.path ?? '')}
            />
          </div>

          <div className="lm-repo-dir-list">
            {loadingDirs ? (
              <div className="lm-repo-dir-empty">
                <Spin size="small" />
              </div>
            ) : listingError ? (
              <Alert type="error" showIcon message={listingError} />
            ) : !listing || listing.dirs.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录没有子目录" />
            ) : (
              listing.dirs.map((dir) => (
                <div className="lm-repo-dir-row" key={dir.path}>
                  <FolderOpenOutlined className="lm-repo-dir-icon" />
                  <button
                    type="button"
                    className="lm-repo-dir-name"
                    onClick={() => void loadDirs(dir.path)}
                  >
                    {dir.name}
                  </button>
                  <span className="lm-repo-dir-meta">{dir.mdCount} 篇文档</span>
                  <Button size="small" onClick={() => handleSelect(dir.path, dir.name)}>
                    选择
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="lm-repo-select-bar">
            <span>
              已选目录：
              <Tag color={selectedPath ? 'blue' : 'default'}>
                {selectedPath ? `/${selectedPath}` : '知识库根目录'}
              </Tag>
            </span>
            <Button
              size="small"
              onClick={() => handleSelect(listing?.path ?? '', listing?.name)}
            >
              选择当前目录
            </Button>
          </div>
        </div>
      </div>

      <Checkbox checked={init} onChange={(event) => setInit(event.target.checked)}>
        若目录尚未初始化 Git，则执行 git init 并创建初始提交
      </Checkbox>
      <div className="lm-repo-hint">
        仓库必须位于服务器 KNOWLEDGE_ROOT 内；登记只建立管理关系，不会移动或删除任何文件。
      </div>
    </Modal>
  );
}
