import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { MarkdownView } from '@/features/notes/MarkdownView';
import { VditorEditor } from '@/features/notes/VditorEditor';
import { renderMarkdown } from '@/features/notes/markdown';
import { useAppStore } from '@/store';
import { mindmapApi } from '@/features/mindmap/api';
import type { NoteDetail } from '@/features/mindmap/api';
import { errorMessage } from '@/utils/http';

/**
 * 把 markdownize 拼出来的 Markdown 反向解析回 { content, tags, remark }。
 * 约定：
 *   一级标题 `# xxx` 跳过（不是 note 的字段）
 *   `**标签**：a, b, c` → note.t
 *   `**备注**：xxx` → note.r
 *   剩下所有正文 → note.c
 */
function parseNoteMarkdown(md: string): { content: string; tags: string[]; remark: string } {
  if (!md) return { content: '', tags: [], remark: '' };
  const lines = md.split('\n');
  const body: string[] = [];
  let tags: string[] = [];
  let remark = '';
  for (const raw of lines) {
    const line = raw;
    if (/^#\s+/.test(line)) continue;
    const tagMatch = line.match(/^\*\*标签\*\*[：:]\s*(.+)$/);
    if (tagMatch) {
      tags = tagMatch[1]
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean);
      continue;
    }
    const remarkMatch = line.match(/^\*\*备注\*\*[：:]\s*(.+)$/);
    if (remarkMatch) {
      remark = remarkMatch[1].trim();
      continue;
    }
    body.push(line);
  }
  return { content: body.join('\n').trim(), tags, remark };
}

/** NoteDetail → 编辑器 Markdown（保留标签/备注行，便于继续编辑） */
function noteToMarkdown(note: NoteDetail): string {
  const lines = [`# ${note.label || '笔记'}`, '', note.content || ''];
  if (note.tags?.length) lines.push('', '**标签**：' + note.tags.join('、'));
  if (note.remark) lines.push('', '**备注**：' + note.remark);
  return lines.join('\n');
}

/**
 * 笔记详情页：
 * - mode=edit 进入 Vditor ir 即时渲染模式
 * - mode=view 进入预览态
 * - 数据来自 F-1，保存调用 F-2，均以后端数据库为准
 */
export function NotePage(): JSX.Element {
  const [params] = useSearchParams();

  const [title, setTitle] = useState(params.get('title') || '笔记');
  const node = params.get('node') || '';
  const md = params.get('md') || '';
  const mapId = params.get('mapId');
  const nodeId = params.get('nodeId');
  const propId = params.get('propId');
  const initialMode = (params.get('mode') as 'view' | 'edit') || 'view';

  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [draft, setDraft] = useState(md);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const vditorRef = useRef<import('vditor').default | null>(null);

  const setActiveMap = useAppStore((s) => s.setActiveMap);
  const saveNote = useAppStore((s) => s.saveNote);

  // 从后端读取最新笔记（F-1），用服务端内容覆盖 URL 里的初始值
  useEffect(() => {
    if (!mapId || !nodeId || !propId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await mindmapApi.getNote(mapId, nodeId, propId);
        if (cancelled) return;
        setTitle(data.label || '笔记');
        setDraft(noteToMarkdown(data));
      } catch (err) {
        if (!cancelled) message.error(errorMessage(err, '读取笔记失败'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapId, nodeId, propId]);

  const result = useMemo(() => renderMarkdown(draft), [draft]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [mode]);

  const handleSave = useCallback(async () => {
    if (!mapId || !nodeId || !propId) {
      message.warning('缺少地图或属性上下文，无法保存到数据库');
      return;
    }
    setSaving(true);
    try {
      const raw = vditorRef.current?.getValue() ?? draft;
      const parsed = parseNoteMarkdown(raw);
      setActiveMap(mapId);
      await saveNote(mapId, nodeId, propId, {
        content: parsed.content,
        tags: parsed.tags,
        remark: parsed.remark,
      });
      message.success('已保存到笔记');
      setDraft(raw);
      setMode('view');
    } catch (err) {
      message.error(errorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  }, [mapId, nodeId, propId, saveNote, setActiveMap, draft]);

  const canSave = Boolean(mapId && nodeId && propId);

  return (
    <div className="lm-page">
      <div className="lm-note-header">
        <b>{title}</b>
        {node && <span className="node">所属节点：{node}</span>}
        <span className="sp" />
        <Link className="bar-link" to="/">
          ← 返回首页
        </Link>
        {canSave && mode === 'edit' && (
          <button className="mini primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? '保存中…' : '保存到笔记'}
          </button>
        )}
        {canSave && (
          <button className="mini" onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}>
            {mode === 'edit' ? '切换预览' : '切换编辑'}
          </button>
        )}
      </div>

      <div className={`lm-note-body${mode === 'edit' && canSave ? ' is-edit' : ''}`}>
        {mode === 'edit' && canSave ? (
          <VditorEditor
            initialValue={draft}
            mode="ir"
            height="calc(100vh - 140px)"
            onChange={setDraft}
            onReady={(editor) => {
              vditorRef.current = editor;
            }}
          />
        ) : (
          <MarkdownView result={result} />
        )}
      </div>
    </div>
  );
}

export default NotePage;
