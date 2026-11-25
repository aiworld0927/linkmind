import { useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Tag, message } from 'antd';
import type { GitRepo, ResolveStrategy } from '../types';

interface ConflictPanelProps {
  repo: GitRepo;
  busy: boolean;
  onResolve: (path: string, strategy: ResolveStrategy, content?: string) => void;
  onContinue: () => void;
  onAbort: () => void;
}

export function ConflictPanel({ repo, busy, onResolve, onContinue, onAbort }: ConflictPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    repo.conflicts.forEach((item) => {
      next[item.path] = item.working;
    });
    setDrafts(next);
  }, [repo.conflicts]);

  if (!repo.merging && repo.conflicts.length === 0) return null;

  const unresolved = repo.conflicts.length;

  const submitContent = (path: string) => {
    const content = drafts[path];
    if (content === undefined) {
      message.error('缺少合并内容');
      return;
    }
    onResolve(path, 'content', content);
  };

  return (
    <Card className="lm-git-card" title="合并与冲突">
      <Alert
        type={unresolved > 0 ? 'warning' : 'success'}
        showIcon
        style={{ marginBottom: 12 }}
        message={
          unresolved > 0
            ? `正在合并：还有 ${unresolved} 个冲突文件待解决`
            : '所有冲突已解决，可以完成合并'
        }
        description={
          unresolved > 0
            ? '可保留本地/远端版本，或编辑合并结果后标记解决。'
            : '完成后会生成一次合并提交。'
        }
      />

      <div className="lm-conflict-list">
        {repo.conflicts.map((item) => (
          <div className="lm-conflict-card" key={item.path}>
            <div className="lm-conflict-title">
              <span>{item.path}</span>
              <Tag color="magenta">冲突</Tag>
            </div>
            <div className="lm-conflict-panes">
              <div>
                <div className="lm-conflict-pane-title">本地版本（ours）</div>
                <pre>{item.ours || '（本地已删除）'}</pre>
              </div>
              <div>
                <div className="lm-conflict-pane-title">远端版本（theirs）</div>
                <pre>{item.theirs || '（远端已删除）'}</pre>
              </div>
            </div>
            <div className="lm-conflict-editor">
              <div className="lm-conflict-pane-title">合并结果</div>
              <textarea
                className="lm-conflict-textarea"
                rows={6}
                value={drafts[item.path] ?? item.working}
                onChange={(event) =>
                  setDrafts((previous) => ({ ...previous, [item.path]: event.target.value }))
                }
              />
            </div>
            <Space style={{ marginTop: 8 }} wrap>
              <Button disabled={busy} onClick={() => onResolve(item.path, 'ours')}>
                保留本地
              </Button>
              <Button disabled={busy} onClick={() => onResolve(item.path, 'theirs')}>
                保留远端
              </Button>
              <Button type="primary" disabled={busy} onClick={() => submitContent(item.path)}>
                保存并标记解决
              </Button>
            </Space>
          </div>
        ))}
      </div>

      <Space style={{ marginTop: 14 }} wrap>
        <Button
          type="primary"
          disabled={busy || unresolved > 0}
          onClick={onContinue}
        >
          完成合并
        </Button>
        <Button danger disabled={busy} onClick={onAbort}>
          放弃合并
        </Button>
      </Space>
    </Card>
  );
}
