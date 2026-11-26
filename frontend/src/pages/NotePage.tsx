import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { MarkdownView } from '@/features/notes/MarkdownView';
import { VditorEditor } from '@/features/notes/VditorEditor';
import { renderMarkdown } from '@/features/notes/markdown';
import { useAppStore } from '@/store';

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

/**
 * 笔记详情页：
 * - mode=edit 进入 Typora 体验（Vditor ir 即时渲染模式）
 * - mode=view 进入预览态（features/notes/MarkdownView，完全不动）
 * - 保存写回 store 里的 prop（note.c / note.t / note.r）
 */
export function NotePage(): JSX.Element {
  const [params] = useSearchParams();

  const title = params.get('title') || '笔记';
  const node = params.get('node') || '';
  const md = params.get('md') || '';
  const mapId = params.get('mapId');
  const nodeId = params.get('nodeId');
  const propIndex = Number(params.get('propIndex'));
  const initialMode = (params.get('mode') as 'view' | 'edit') || 'view';

  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [draft, setDraft] = useState(md);
  const [saving, setSaving] = useState(false);
  const vditorRef = useRef<import('vditor').default | null>(null);

  const setActiveMap = useAppStore((s) => s.setActiveMap);
  const updateProp = useAppStore((s) => s.updateProp);
  const maps = useAppStore((s) => s.maps);

  /** 在指定 map 中按 nodeId 查节点；nodeId === 'ROOT' 时返回 map 自身 */
  const findNode = useCallback(
    (mapId: string, nodeId: string): import('@/types').TreeNode | import('@/types').TreeMap | null => {
      const map = maps.find((m) => m.id === mapId);
      if (!map) return null;
      if (nodeId === 'ROOT') return map;
      const walk = (children: import('@/types').TreeNode[]): import('@/types').TreeNode | null => {
        for (const n of children) {
          if (n.id === nodeId) return n;
          const found = walk(n.children);
          if (found) return found;
        }
        return null;
      };
      return walk(map.nodes);
    },
    [maps],
  );

  const result = useMemo(() => renderMarkdown(draft), [draft]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [mode]);

  const handleSave = useCallback(async () => {
    if (!mapId || !nodeId || Number.isNaN(propIndex)) {
      message.warning('缺少地图或节点上下文，无法保存到脑图');
      return;
    }
    const target = findNode(mapId, nodeId);
    if (!target) {
      message.error('找不到节点或地图');
      return;
    }
    const existingProp = target.props[propIndex];
    if (!existingProp) {
      message.error('属性不存在');
      return;
    }
    setSaving(true);
    try {
      const raw = vditorRef.current?.getValue() ?? draft;
      const parsed = parseNoteMarkdown(raw);
      setActiveMap(mapId);
      updateProp(nodeId, propIndex, {
        ...existingProp,
        note: { c: parsed.content, t: parsed.tags, r: parsed.remark },
      });
      message.success('已保存到脑图');
      setDraft(raw);
      setMode('view');
    } catch (err) {
      console.error(err);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [mapId, nodeId, propIndex, findNode, setActiveMap, updateProp, draft]);

  const canSave = Boolean(mapId && nodeId && !Number.isNaN(propIndex));

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
          <button className="mini primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中…' : '保存到脑图'}
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
