import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  HomeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ConflictPanel } from '@/features/git/components/ConflictPanel';
import { FileChangeTable } from '@/features/git/components/FileChangeTable';
import { HistoryPanels } from '@/features/git/components/HistoryPanels';
import { RepoDialog } from '@/features/git/components/RepoDialog';
import { useGitStore } from '@/features/git/store';

export function GitPage() {
  const navigate = useNavigate();
  const state = useGitStore();
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const repo = state.repos.find((item) => item.id === state.currentId) ?? null;
  const busy = Boolean(state.busy);
  const hasConflicts = Boolean(repo && repo.conflicts.length > 0);

  useEffect(() => {
    void state.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelected([]);
    setCommitMessage('');
  }, [state.currentId]);

  const submitCommit = async (all: boolean) => {
    if (!repo) return;
    const text = commitMessage.trim();
    if (!text) {
      message.warning('请填写提交信息');
      return;
    }
    if (!all && selected.length === 0) {
      message.warning('请先勾选要提交的文件');
      return;
    }
    const ok = await state.commit({
      message: text,
      all,
      ...(all ? {} : { paths: selected }),
    });
    if (ok) {
      setSelected([]);
      setCommitMessage('');
    }
  };

  const confirmRemove = () => {
    if (!repo) return;
    Modal.confirm({
      title: `移除仓库登记「${repo.name}」？`,
      content: '只会移除 LinkMind 中的管理关系，不会删除服务器上的任何文件。',
      okText: '移除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => state.removeRepo(repo.id),
    });
  };

  return (
    <div className="lm-page lm-git">
      <header className="lm-git-header">
        <div
          className="lm-brand lm-brand-link"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/');
          }}
        >
          <span className="lm-brand-mark">LM</span>
          <div>
            <div className="lm-brand-title">Git 管理</div>
            <div className="lm-brand-sub">知识仓库版本控制 · 真实服务器 Git 操作</div>
          </div>
        </div>
        <Space wrap>
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
            首页
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRepoDialogOpen(true)}>
            登记仓库
          </Button>
        </Space>
      </header>

      <main className="lm-git-main">
        {state.error && (
          <Alert
            type="error"
            showIcon
            message="Git 服务不可用"
            description={state.error}
            action={
              <Button size="small" onClick={() => void state.load()}>
                重试
              </Button>
            }
          />
        )}

        {state.loading && state.repos.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : state.repos.length === 0 ? (
          <Card className="lm-git-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有登记知识仓库"
            >
              <Space direction="vertical" size={12}>
                <span style={{ color: '#8a94a6', fontSize: 12.5 }}>
                  选择服务器知识根目录下的 Git 仓库，即可查看状态、提交、拉取与推送。
                </span>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setRepoDialogOpen(true)}>
                  登记第一个仓库
                </Button>
              </Space>
            </Empty>
          </Card>
        ) : (
          <>
            <div className="lm-git-toolbar">
              <Select
                style={{ minWidth: 260 }}
                value={state.currentId ?? null}
                onChange={state.select}
                options={state.repos.map((item) => ({
                  value: item.id,
                  label: `${item.name}（${item.branch}）`,
                }))}
              />
              <Button
                icon={<ReloadOutlined />}
                loading={state.busy === 'refresh'}
                disabled={busy}
                onClick={() => void state.refresh()}
              >
                刷新
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                loading={state.busy === 'pull'}
                disabled={busy}
                onClick={() => void state.pull()}
              >
                拉取
              </Button>
              <Button
                icon={<CloudUploadOutlined />}
                loading={state.busy === 'push'}
                disabled={busy}
                onClick={() => void state.push()}
              >
                推送
              </Button>
              <Button danger icon={<DeleteOutlined />} disabled={busy} onClick={confirmRemove}>
                移除
              </Button>
            </div>

            {repo && (
              <>
                <div className="lm-git-summary">
                  <div className="lm-git-summary-item">
                    <span>当前分支</span>
                    <b>{repo.branch}</b>
                  </div>
                  <div className="lm-git-summary-item">
                    <span>上游分支</span>
                    <b>{repo.upstream ?? '未设置'}</b>
                  </div>
                  <div className="lm-git-summary-item">
                    <span>领先 / 落后</span>
                    <b>
                      {repo.ahead} / {repo.behind}
                    </b>
                  </div>
                  <div className="lm-git-summary-item">
                    <span>变更文件</span>
                    <b>{repo.counts.total}</b>
                  </div>
                  <div className="lm-git-summary-item">
                    <span>冲突文件</span>
                    <b style={{ color: repo.counts.conflict > 0 ? '#dc2626' : undefined }}>
                      {repo.counts.conflict}
                    </b>
                  </div>
                  <div className="lm-git-summary-item">
                    <span>仓库路径</span>
                    <b style={{ fontSize: 12 }}>{repo.path}</b>
                  </div>
                </div>

                {repo.merging && (
                  <Alert
                    type="warning"
                    showIcon
                    message="仓库正在合并中"
                    description={
                      hasConflicts
                        ? '请先在下方解决冲突，再完成或放弃合并。'
                        : '冲突已全部解决，可以完成合并。'
                    }
                  />
                )}

                <div className="lm-git-grid">
                  <div>
                    <Card className="lm-git-card" style={{ marginBottom: 16 }}>
                      <div className="lm-git-section-head">
                        <h3>
                          工作区变更{' '}
                          <Tag>{repo.counts.total}</Tag>
                          {repo.counts.staged > 0 && <Tag color="green">已暂存 {repo.counts.staged}</Tag>}
                          {repo.counts.untracked > 0 && (
                            <Tag color="geekblue">未跟踪 {repo.counts.untracked}</Tag>
                          )}
                        </h3>
                        <Tooltip title="拉取会产生冲突，冲突解决前不能提交">
                          <span style={{ fontSize: 12, color: '#8a94a6' }}>
                            {repo.remote ?? '未配置远端'}
                          </span>
                        </Tooltip>
                      </div>

                      <div className="lm-git-commit-box">
                        <Input.TextArea
                          rows={2}
                          maxLength={500}
                          showCount
                          placeholder="提交信息，例如：补充注意力机制笔记"
                          value={commitMessage}
                          onChange={(event) => setCommitMessage(event.target.value)}
                        />
                      </div>
                      <Space style={{ marginBottom: 12 }} wrap>
                        <Button
                          type="primary"
                          disabled={busy || hasConflicts || selected.length === 0}
                          loading={state.busy === 'commit'}
                          onClick={() => void submitCommit(false)}
                        >
                          提交选中（{selected.length}）
                        </Button>
                        <Button
                          disabled={busy || hasConflicts || repo.counts.total === 0}
                          loading={state.busy === 'commit'}
                          onClick={() => void submitCommit(true)}
                        >
                          提交全部变更
                        </Button>
                        {hasConflicts && <Tag color="magenta">请先解决冲突</Tag>}
                      </Space>

                      <FileChangeTable
                        repo={repo}
                        selected={selected}
                        disabled={busy || hasConflicts}
                        onChange={setSelected}
                      />
                    </Card>

                    <ConflictPanel
                      repo={repo}
                      busy={busy}
                      onResolve={(path, strategy, content) =>
                        void state.resolveConflict(path, strategy, content)
                      }
                      onContinue={() => void state.continueMerge()}
                      onAbort={() => void state.abortMerge()}
                    />
                  </div>

                  <div>
                    <HistoryPanels repo={repo} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <Alert
          type="info"
          showIcon
          message="说明"
          description="Git 操作在服务器端执行，作用于已登记的知识仓库目录；请确保仓库位于 KNOWLEDGE_ROOT 内，并已配置好远端凭证。"
        />
      </main>

      <RepoDialog open={repoDialogOpen} onClose={() => setRepoDialogOpen(false)} />
    </div>
  );
}
