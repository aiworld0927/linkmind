import { useMemo } from 'react';
import { Button, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MarkdownView } from '@/features/notes/MarkdownView';
import { renderMarkdown } from '@/features/notes/markdown';

export function NotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const title = searchParams.get('title') || '笔记';
  const node = searchParams.get('node') ?? '';
  const md = searchParams.get('md') ?? '';

  const result = useMemo(() => (md ? renderMarkdown(md) : null), [md]);

  const backHome = () => navigate('/');

  return (
    <div className="lm-page lm-note-page">
      <header className="lm-note-header">
        <div className="lm-note-title">
          <h1>{title}</h1>
          {node && <span>所属节点：{node}</span>}
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={backHome}>
          返回首页
        </Button>
      </header>

      <div className="lm-note-body">
        {result ? (
          <MarkdownView result={result} />
        ) : (
          <div className="lm-note-content lm-note-empty">
            <Empty description="未找到笔记内容">
              <Button type="primary" onClick={backHome}>
                返回首页
              </Button>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}
