import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGitStore } from '@/features/git/store';
import type { GitFile, GitRepo, GitCommitPayload } from '@/features/git/types';
import { stateMeta } from '@/features/git/labels';
import { RepoDialog } from '@/features/git/components/RepoDialog';
import { ConflictPanel } from '@/features/git/components/ConflictPanel';

/**
 * Git 管理页：外层套原型 `#wrap` / `.card` / `.repo-hd` / `.cols` / `.list` / `.conflict` 等 class。
 * features/git 内部 api/store/components 完全不动，这里只重新组织 DOM。
 */
export function GitPage(): JSX.Element {
  const repos = useGitStore((s) => s.repos);
  const currentId = useGitStore((s) => s.currentId);
  const busy = useGitStore((s) => s.busy);
  const load = useGitStore((s) => s.load);
  const select = useGitStore((s) => s.select);
  const refresh = useGitStore((s) => s.refresh);
  const removeRepo = useGitStore((s) => s.removeRepo);
  const commit = useGitStore((s) => s.commit);
  const pull = useGitStore((s) => s.pull);
  const push = useGitStore((s) => s.push);
  const resolveConflict = useGitStore((s) => s.resolveConflict);
  const continueMerge = useGitStore((s) => s.continueMerge);
  const abortMerge = useGitStore((s) => s.abortMerge);

  const current = useMemo<GitRepo | null>(
    () => repos.find((r) => r.id === currentId) ?? null,
    [repos, currentId],
  );

  const [commitMsg, setCommitMsg] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // 切换仓库时重置勾选
    setChecked([]);
    setCommitMsg('');
  }, [currentId]);

  const counts = current?.counts ?? null;
  const pendingFiles: GitFile[] = (current?.files ?? []).filter((f) => !f.conflict);
  const conflictCount = current?.conflicts.length ?? 0;

  const doCommit = useCallback(
    async (all: boolean) => {
      if (!current) return;
      const msg = commitMsg.trim();
      if (!msg) return;
      const payload: GitCommitPayload = {
        message: msg,
        all,
        paths: all ? pendingFiles.map((f) => f.path) : checked,
      };
      const ok = await commit(payload);
      if (ok) setCommitMsg('');
    },
    [commit, commitMsg, checked, current, pendingFiles],
  );

  const checkAll = (on: boolean): void => {
    if (!current) return;
    setChecked(on ? pendingFiles.map((f) => f.path) : []);
  };

  const handleRemoveRepo = async (): Promise<void> => {
    if (!current) return;
    if (!window.confirm(`移除知识仓库「${current.name}」的登记？\n仅移除登记，不会删除任何文件。`)) return;
    await removeRepo(current.id);
  };

  return (
    <div id="wrap">
      {repos.length === 0 && (
        <div className="empty-state">
          还没有知识仓库
          <br />
          点击顶部「添加仓库」登记一个
        </div>
      )}
      {repos.length > 0 && current && (
        <>
          <section className="card">
            <div className="repo-hd">
              <select value={current.id} onChange={(e) => select(e.target.value)}>
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <span className="repo-path">{current.path}</span>
              <span className="repo-branch">{current.branch}</span>
              <span className="sp" />
              <button className="mini" onClick={() => void refresh()} disabled={!!busy}>
                刷新
              </button>
              <button className="mini" onClick={() => void pull()} disabled={!!busy}>
                拉取
              </button>
              <button className="mini primary" onClick={() => void push()} disabled={!!busy}>
                推送
              </button>
            </div>
            <div className="summary">
              <span>
                分支 <b>{current.branch || '—'}</b>
              </span>
              <span>
                上游 <b>{current.upstream || '未设置'}</b>
              </span>
              <span className={current.ahead ? 'good' : ''}>
                领先 <b>{current.ahead}</b>
              </span>
              <span className={current.behind ? 'bad' : ''}>
                落后 <b>{current.behind}</b>
              </span>
              <span>
                变更 <b>{counts?.total ?? 0}</b>
              </span>
              <span className={conflictCount ? 'bad' : ''}>
                冲突 <b>{conflictCount}</b>
              </span>
              {current.merging && <span className="bad">合并进行中</span>}
              {current.log[0] && (
                <span>
                  最近提交 <b>{current.log[0].short_hash}</b> {current.log[0].subject}
                </span>
              )}
            </div>
          </section>

          {(current.merging || conflictCount > 0) && (
            <section className="card">
              <h3>
                冲突解决{' '}
                <span>
                  共 {conflictCount} 个文件，解决后点击完成合并
                </span>
              </h3>
              <ConflictPanel
                repo={current}
                busy={!!busy}
                onResolve={(p, s, c) => void resolveConflict(p, s, c)}
                onContinue={() => void continueMerge()}
                onAbort={() => void abortMerge()}
              />
            </section>
          )}

          <section className="card">
            <h3>
              变更文件{' '}
              <span>
                共 {counts?.total ?? 0} 个，已暂存 {counts?.staged ?? 0}，未暂存{' '}
                {counts?.unstaged ?? 0}，未跟踪 {counts?.untracked ?? 0}
              </span>
            </h3>
            <div className="file-tools">
              <button className="mini" onClick={() => checkAll(true)}>
                全选
              </button>
              <button className="mini" onClick={() => checkAll(false)}>
                取消
              </button>
              <input
                placeholder="提交信息，例如：补充模型评估文档"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
              />
              <button
                className="mini primary"
                onClick={() => void doCommit(false)}
                disabled={!!busy || !commitMsg.trim() || checked.length === 0}
              >
                提交选中
              </button>
              <button
                className="mini"
                onClick={() => void doCommit(true)}
                disabled={!!busy || !commitMsg.trim() || pendingFiles.length === 0}
              >
                提交全部
              </button>
            </div>
            <table className="files">
              <thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <th>文件</th>
                  <th style={{ width: 90 }}>状态</th>
                  <th style={{ width: 70 }}>暂存</th>
                </tr>
              </thead>
              <tbody>
                {current.files.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">工作区干净，没有待处理的变更</div>
                    </td>
                  </tr>
                ) : (
                  current.files.map((f) => (
                    <tr key={f.path}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked.includes(f.path)}
                          disabled={f.conflict}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setChecked((prev) => [...prev, f.path]);
                            } else {
                              setChecked((prev) => prev.filter((p) => p !== f.path));
                            }
                          }}
                        />
                      </td>
                      <td>{f.path}</td>
                      <td>
                        <span className={`git-badge g-${f.state}`}>
                          {stateMeta(f.state).label}
                        </span>
                      </td>
                      <td>
                        {f.conflict ? (
                          <span className="unstaged">冲突</span>
                        ) : f.staged ? (
                          <span className="staged">已暂存</span>
                        ) : (
                          <span className="unstaged">未暂存</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <div className="cols">
            <section className="card">
              <h3>提交历史</h3>
              <div className="list">
                {current.log.length === 0 ? (
                  <div className="empty">暂无提交</div>
                ) : (
                  current.log.map((item) => (
                    <div className="row" key={item.hash}>
                      <span className="t">{item.date}</span> · <b>{item.short_hash}</b> ·{' '}
                      {item.author}
                      <br />
                      {item.subject}
                    </div>
                  ))
                )}
              </div>
            </section>
            <section className="card">
              <h3>Git 动作记录</h3>
              <div className="list">
                {current.actions.length === 0 ? (
                  <div className="empty">暂无 Git 动作记录</div>
                ) : (
                  current.actions.map((item) => (
                    <div className="row" key={item.id}>
                      <span className="t">{item.ts}</span> · {item.action} ·{' '}
                      <span className={item.ok ? 'ok' : 'fail'}>
                        {item.ok ? '成功' : '失败'}
                      </span>
                      {item.message && <br />}
                      {item.message}
                      {item.files.length > 0 && (
                        <>
                          <br />
                          <span className="t">{item.files.join('、')}</span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* 额外：顶栏按钮区在 App.tsx，这里不重复 */}
      <RepoDialog open={repoDialogOpen} onClose={() => setRepoDialogOpen(false)} />

      {/* 顶栏里的按钮通过全局暴露给 App.tsx 使用——这里把 open 方法暴露到 window */}
      <OpenApi
        openAddDialog={() => setRepoDialogOpen(true)}
        removeRepo={handleRemoveRepo}
      />
    </div>
  );
}

/** 暴露全局方法给 App.tsx 顶栏按钮使用 */
function OpenApi({
  openAddDialog,
  removeRepo,
}: {
  openAddDialog: () => void;
  removeRepo: () => void;
}): null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as unknown as { __lmGitAdd?: () => void; __lmGitRemove?: () => void };
  w.__lmGitAdd = openAddDialog;
  w.__lmGitRemove = removeRepo;
  // 让 GitPage 也注册顶栏按钮 link
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return null;
}

export default GitPage;
