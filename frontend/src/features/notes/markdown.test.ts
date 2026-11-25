import { describe, expect, it } from 'vitest';
import { escapeHtml, renderMarkdown } from './markdown';

describe('escapeHtml', () => {
  it('转义 & < > " \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('转义脚本标签', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });
});

describe('renderMarkdown', () => {
  it('空输入返回空结果', () => {
    expect(renderMarkdown('')).toEqual({ html: '', headings: [] });
  });

  it('段落中的 HTML 被转义', () => {
    const result = renderMarkdown('<script>alert("x")</script>');
    expect(result.html).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>');
    expect(result.html).not.toContain('<script>');
    expect(result.headings).toEqual([]);
  });

  it('标题生成编号 id 并收集纯文本', () => {
    const result = renderMarkdown('# 标题 `code` **粗**\n\n## 二级\n\n### 三级');
    expect(result.headings).toEqual([
      { id: 'h-1', level: 1, text: '标题 code 粗' },
      { id: 'h-2', level: 2, text: '二级' },
      { id: 'h-3', level: 3, text: '三级' },
    ]);
    expect(result.html).toContain('<h1 id="h-1">标题 <code>code</code> <strong>粗</strong></h1>');
    expect(result.html).toContain('<h2 id="h-2">二级</h2>');
    expect(result.html).toContain('<h3 id="h-3">三级</h3>');
  });

  it('围栏代码块内容被转义', () => {
    const result = renderMarkdown('```ts\n<script>alert(1)</script>\n```');
    expect(result.html).toBe(
      '<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>',
    );
  });

  it('未闭合代码块在结尾补齐', () => {
    const result = renderMarkdown('```\nconst a = 1;');
    expect(result.html).toBe('<pre><code>const a = 1;</code></pre>');
  });

  it('无序列表正确开闭 ul', () => {
    const result = renderMarkdown('- 第一\n- 第二');
    expect(result.html).toBe('<ul>\n<li>第一</li>\n<li>第二</li>\n</ul>');
  });

  it('有序列表正确开闭 ol', () => {
    const result = renderMarkdown('1. 第一\n2. 第二');
    expect(result.html).toBe('<ol>\n<li>第一</li>\n<li>第二</li>\n</ol>');
  });

  it('列表类型切换时关闭前一个列表', () => {
    const result = renderMarkdown('- 无序\n1. 有序');
    expect(result.html).toBe('<ul>\n<li>无序</li>\n</ul>\n<ol>\n<li>有序</li>\n</ol>');
  });

  it('引用块', () => {
    const result = renderMarkdown('> 引用 **粗**');
    expect(result.html).toBe('<blockquote>引用 <strong>粗</strong></blockquote>');
  });

  it('分隔线', () => {
    expect(renderMarkdown('---').html).toBe('<hr>');
    expect(renderMarkdown('***').html).toBe('<hr>');
  });

  it('行内 code / bold / italic / link', () => {
    const result = renderMarkdown('`code` **bold** *italic* [链接](https://example.com)');
    expect(result.html).toBe(
      '<p><code>code</code> <strong>bold</strong> <em>italic</em> ' +
        '<a href="https://example.com" target="_blank" rel="noopener">链接</a></p>',
    );
  });

  it('规范化 CRLF 换行', () => {
    expect(renderMarkdown('# 标题\r\n\r\n正文').html).toBe(
      '<h1 id="h-1">标题</h1>\n<p>正文</p>',
    );
  });
});
