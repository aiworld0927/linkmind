/**
 * 轻量 Markdown 渲染，行为对齐 docs/原型界面/demo-note.html。
 * 仅支持笔记场景所需的子集：h1-h3、列表、引用、围栏代码块、分隔线、行内标记。
 */

export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

export interface MarkdownResult {
  html: string;
  headings: MarkdownHeading[];
}

export function escapeHtml(value: string): string {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 先转义再替换行内标记，避免注入 HTML */
function inline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

/** 去掉行内标记，得到标题纯文本 */
function headingText(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .trim();
}

export function renderMarkdown(markdown: string): MarkdownResult {
  const lines = String(markdown == null ? '' : markdown)
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out: string[] = [];
  const headings: MarkdownHeading[] = [];

  let i = 0;
  let inCode = false;
  let code: string[] = [];
  let ul = false;
  let ol = false;

  const closeLists = (): void => {
    if (ul) {
      out.push('</ul>');
      ul = false;
    }
    if (ol) {
      out.push('</ol>');
      ol = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      if (!inCode) {
        inCode = true;
        code = [];
        closeLists();
      } else {
        out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        inCode = false;
      }
      i += 1;
      continue;
    }

    if (inCode) {
      code.push(line);
      i += 1;
      continue;
    }

    if (!line.trim()) {
      closeLists();
      i += 1;
      continue;
    }

    let match: RegExpMatchArray | null;

    if ((match = line.match(/^(#{1,3})\s+(.*)$/))) {
      closeLists();
      const level = match[1].length;
      const id = `h-${headings.length + 1}`;
      headings.push({ id, level, text: headingText(match[2]) });
      out.push(`<h${level} id="${id}">${inline(match[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeLists();
      out.push('<hr>');
      i += 1;
      continue;
    }

    if ((match = line.match(/^>\s?(.*)$/))) {
      closeLists();
      out.push(`<blockquote>${inline(match[1])}</blockquote>`);
      i += 1;
      continue;
    }

    if ((match = line.match(/^[-*+]\s+(.*)$/))) {
      if (ol) {
        out.push('</ol>');
        ol = false;
      }
      if (!ul) {
        out.push('<ul>');
        ul = true;
      }
      out.push(`<li>${inline(match[1])}</li>`);
      i += 1;
      continue;
    }

    if ((match = line.match(/^\d+\.\s+(.*)$/))) {
      if (ul) {
        out.push('</ul>');
        ul = false;
      }
      if (!ol) {
        out.push('<ol>');
        ol = true;
      }
      out.push(`<li>${inline(match[1])}</li>`);
      i += 1;
      continue;
    }

    closeLists();
    out.push(`<p>${inline(line)}</p>`);
    i += 1;
  }

  if (inCode) {
    out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  }
  closeLists();

  return { html: out.join('\n'), headings };
}
