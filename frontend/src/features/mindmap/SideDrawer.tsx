import { useAppStore, selectInfo, useActiveMap } from '@/store';
import type { TreeNodeProp } from '@/types';
import { useNavigate } from 'react-router-dom';

function propSummary(c: string): string {
  return String(c).replace(/\s+/g, ' ').trim() || '（空笔记）';
}

export function SideDrawer(): JSX.Element {
  const map = useActiveMap();
  const selectedId = useAppStore((s) => s.selectedId);
  const sideOpen = useAppStore((s) => s.sideOpen);
  const closeSide = useAppStore((s) => s.closeSide);
  const openModal = useAppStore((s) => s.openModal);
  const activeMapId = useAppStore((s) => s.activeMapId);
  const navigate = useNavigate();

  if (!map) return <div id="side" />;
  const info = selectInfo(map, selectedId);
  const title = info ? info.name : '节点属性';

  const handleAddProp = (): void => {
    if (!info) return;
    openModal({
      kind: 'prop',
      mode: 'add',
      nodeId: info.isRoot ? 'ROOT' : info.node!.id,
      propIndex: -1,
    });
  };

  return (
    <div id="side" className={sideOpen ? 'on' : ''}>
      <div className="hd">
        <span>{title}</span>
        <button className="mini" onClick={closeSide}>
          关闭
        </button>
      </div>
      <div className="bd">
        {!info ? (
          <div className="empty">
            请在脑图中选择节点
            <br />
            左键点击节点可展开/收起，右键打开操作菜单
          </div>
        ) : (
          <>
            <div className="crumb">
              {/* 非 ROOT 时 path 不含 map.title，手动拼上并处理相邻重名去重 */}
              {(() => {
                const fullPath = info.isRoot ? info.path : [map.title, ...info.path];
                // 相邻重名去重（典型场景：地图标题和顶层节点同名）
                const deduped = fullPath.filter((p, i, arr) => p && p !== arr[i + 1]);
                return deduped.map((p, i) => (
                  <span key={i}>
                    {i > 0 && <span className="sep">/</span>}
                    {p}
                  </span>
                ));
              })()}
            </div>

            {map.repo?.name && (
              <div className="repo-tag">仓库：{map.repo.name}</div>
            )}

            <h4>
              属性列表（{info.props.length}）
            </h4>
            {info.props.length ? (
              info.props.map((p, i) => (
                <PropCard
                  key={i}
                  index={i}
                  prop={p}
                  nodeId={info.isRoot ? 'ROOT' : info.node!.id}
                  onOpenNote={() => {
                    const payload = {
                      title: p.label || '笔记',
                      node: info.path.join(' > '),
                      md: markdownize(p),
                      mapId: activeMapId || '',
                      nodeId: info.isRoot ? 'ROOT' : info.node!.id,
                      propId: p.prop_id || '',
                      propIndex: i,
                    };
                    navigate(
                      `/note?title=${encodeURIComponent(payload.title)}&node=${encodeURIComponent(
                        payload.node,
                      )}&md=${encodeURIComponent(payload.md)}&mapId=${encodeURIComponent(
                        payload.mapId,
                      )}&nodeId=${encodeURIComponent(payload.nodeId)}&propId=${encodeURIComponent(
                        payload.propId,
                      )}&propIndex=${payload.propIndex}&mode=view`,
                    );
                  }}
                />
              ))
            ) : (
              <div className="empty" style={{ padding: '14px 0' }}>
                暂无属性，点击下方按钮新增
              </div>
            )}

            <button className="mini wide" onClick={handleAddProp}>
              ＋ 新增属性
            </button>
            <div className="pTip">
              右键节点可新增子节点、修改或删除节点
              {info.isRoot
                ? '；根节点即地图标题，删除请回首页删除整张地图'
                : ''}
              。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function markdownize(p: TreeNodeProp): string {
  const note = p.note || { c: '', t: [], r: '' };
  const lines = [`# ${p.label || '笔记'}`, '', note.c || '（暂无内容）'];
  if (note.t && note.t.length) lines.push('', '**标签**：' + note.t.join('、'));
  if (note.r) lines.push('', '**备注**：' + note.r);
  return lines.join('\n');
}

function PropCard({
  index,
  prop,
  nodeId,
  onOpenNote,
}: {
  index: number;
  prop: TreeNodeProp;
  nodeId: string;
  onOpenNote: () => void;
}): JSX.Element {
  const openModal = useAppStore((s) => s.openModal);
  const summary = propSummary(prop.note.c);
  const tags = prop.note.t || [];
  return (
    <div className="prop">
      <div className="prop-hd">
        <b title={prop.label}>{prop.label || '属性'}</b>
        <a onClick={onOpenNote}>{prop.doc ? '打开文档' : '打开笔记'} →</a>
      </div>
      <div className="prop-note" title={summary}>
        {summary}
      </div>
      <div className="prop-meta">
        {tags.length ? (
          tags.map((t, i) => (
            <span className="tag" key={i}>
              {t}
            </span>
          ))
        ) : (
          <span className="mini-empty">无标签</span>
        )}
        <span className="prop-act">
          <button
            onClick={() => openModal({ kind: 'prop', mode: 'edit', nodeId, propIndex: index })}
          >
            编辑
          </button>
          <button
            className="danger"
            onClick={() => openModal({ kind: 'prop', mode: 'delete', nodeId, propIndex: index })}
          >
            删除
          </button>
        </span>
      </div>
    </div>
  );
}

export default SideDrawer;
