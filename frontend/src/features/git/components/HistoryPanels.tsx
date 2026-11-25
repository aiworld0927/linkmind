import { Card, Empty, Tag } from 'antd';
import { actionLabel } from '../labels';
import type { GitRepo } from '../types';

interface HistoryPanelsProps {
  repo: GitRepo;
}

export function HistoryPanels({ repo }: HistoryPanelsProps) {
  return (
    <>
      <Card className="lm-git-card" title="提交历史" style={{ marginBottom: 16 }}>
        {repo.log.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无提交记录" />
        ) : (
          <ul className="lm-commit-list">
            {repo.log.map((commit) => (
              <li key={commit.hash}>
                <div className="lm-commit-subject">{commit.subject}</div>
                <div className="lm-commit-meta">
                  <Tag>{commit.short_hash}</Tag>
                  <span>{commit.author}</span>
                  <span>{commit.date}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="lm-git-card" title="Git 动作记录">
        {repo.actions.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无动作记录" />
        ) : (
          <ul className="lm-action-list">
            {repo.actions.map((action) => (
              <li key={action.id}>
                <span className={`lm-action-dot${action.ok ? '' : ' fail'}`} />
                <div className="lm-action-body">
                  <b>{actionLabel(action.action)}</b>
                  <span> · {action.message}</span>
                  {action.files.length > 0 && (
                    <div className="lm-action-files">{action.files.join('、')}</div>
                  )}
                  <time>{action.ts}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
