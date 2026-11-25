import { useEffect, useState } from 'react';
import type { MarkdownResult } from './markdown';

interface MarkdownViewProps {
  result: MarkdownResult;
}

export function MarkdownView({ result }: MarkdownViewProps) {
  const { headings } = result;
  const [activeId, setActiveId] = useState<string>(() => headings[0]?.id ?? '');

  useEffect(() => {
    setActiveId(headings[0]?.id ?? '');
  }, [headings]);

  useEffect(() => {
    if (headings.length === 0) return;

    const updateActive = (): void => {
      let current = headings[0].id;
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= 90) current = heading.id;
      });
      setActiveId(current);
    };

    updateActive();
    // 使用捕获阶段，兼容页面容器自身滚动的情况
    window.addEventListener('scroll', updateActive, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', updateActive, true);
  }, [headings]);

  const jumpTo = (id: string): void => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <aside className="lm-note-outline">
        <h2>文档大纲</h2>
        {headings.length === 0 ? (
          <div style={{ padding: '6px 8px', fontSize: 12.5, color: '#8a94a6' }}>本文档暂无标题</div>
        ) : (
          headings.map((heading) => (
            <button
              key={heading.id}
              type="button"
              className={`lv${heading.level}${activeId === heading.id ? ' active' : ''}`}
              onClick={() => jumpTo(heading.id)}
            >
              {heading.text}
            </button>
          ))
        )}
      </aside>
      <article
        className="lm-note-markdown"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    </>
  );
}
