import { useEffect, useMemo, useState } from 'react';
import { useAppStore, useActiveMap, ModalState, selectInfo } from '@/store';
import type { FsDirListing, GitRepo } from '@/features/git/types';
import { gitApi } from '@/features/git/api';
import { fetchFsTree } from '@/utils/api';
import type { TreeMap, TreeNode } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/** Modal 统一容器 */
function ModalWrap({
  open,
  title,
  onClose,
  children,
  okText = '保存',
  onOk,
  okClass = 'mini primary',
  err,
  bodyMaxWidth,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  okText?: string;
  onOk?: () => string | null | undefined | void;
  okClass?: string;
  err?: string;
  bodyMaxWidth?: number;
}): JSX.Element {
  const [errMsg, setErrMsg] = useState<string>(err ?? '');
  useEffect(() => setErrMsg(err ?? ''), [err]);

  const handleOk = (): void => {
    if (!onOk) {
      onClose();
      return;
    }
    const r = onOk();
    if (typeof r === 'string' && r) {
      setErrMsg(r);
      return;
    }
    setErrMsg('');
    onClose();
  };

  if (!open) return <div id="modal" />;
  return (
    <div id="modal" className="on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={bodyMaxWidth ? { width: bodyMaxWidth } : undefined}>
        <div className="modal-hd">
          <b>{title}</b>
          <button className="mini" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="modal-bd">{children}</div>
        <div className="modal-err">{errMsg}</div>
        <div className="modal-ft">
          <button className="mini" onClick={onClose}>
            取消
          </button>
          {onOk && (
            <button className={okClass} onClick={handleOk}>
              {okText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- MapModal ----------
function MapModal(): JSX.Element {
  const modal = useAppStore((s) => s.modal);
  const maps = useAppStore((s) => s.maps);
  const closeModal = useAppStore((s) => s.closeModal);
  const createMap = useAppStore((s) => s.createMap);
  const updateMap = useAppStore((s) => s.updateMap);
  const deleteMap = useAppStore((s) => s.deleteMap);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const isOpen = modal?.kind === 'map';
  useEffect(() => {
    if (!isOpen) return;
    if (modal.mode === 'edit' && modal.index >= 0) {
      const m = maps[modal.index];
      setTitle(m?.title ?? '');
      setDesc(m?.desc ?? '');
    } else {
      setTitle('');
      setDesc('');
    }
  }, [isOpen, modal, maps]);

  if (!isOpen) return <div id="modal" />;

  if (modal.mode === 'delete') {
    const target = maps[modal.index];
    const onOk = (): void => {
      if (target) deleteMap(target.id);
    };
    return (
      <ModalWrap
        open
        title="删除知识地图"
        onClose={closeModal}
        okText="确认删除"
        onOk={onOk}
        okClass="mini danger"
      >
        <div style={{ fontSize: 13, lineHeight: 1.8, color: '#4a5568' }}>
          确定删除「<b>{target?.title ?? ''}</b>」吗？
          <br />
          删除后无法恢复。
        </div>
      </ModalWrap>
    );
  }

  const editing = modal.mode === 'edit' && modal.index >= 0;
  const targetMap = editing ? maps[modal.index] : null;

  const onOk = (): string | null => {
    const t = title.trim();
    if (!t) return '请填写地图名称';
    if (t.length > 30) return '地图名称不能超过 30 个字';
    if (maps.some((m, i) => m.title === t && i !== modal.index)) return '已存在同名知识地图';
    if (editing && targetMap) {
      updateMap(targetMap.id, { title: t, desc: desc.trim() });
    } else {
      createMap(t, desc.trim());
    }
    return null;
  };

  return (
    <ModalWrap
      open={isOpen}
      title={editing ? '编辑知识地图' : '新建知识地图'}
      onClose={closeModal}
      okText="保存"
      onOk={onOk}
    >
      <label>地图名称</label>
      <input
        maxLength={30}
        value={title}
        placeholder="例如：机器学习基础"
        onChange={(e) => setTitle(e.target.value)}
      />
      <label>地图描述</label>
      <textarea
        maxLength={80}
        placeholder="一句话说明这张脑图"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
    </ModalWrap>
  );
}

// ---------- NodeModal ----------
function NodeModal(): JSX.Element {
  const modal = useAppStore((s) => s.modal);
  const map = useActiveMap();
  const closeModal = useAppStore((s) => s.closeModal);
  const addNode = useAppStore((s) => s.addNode);
  const renameNode = useAppStore((s) => s.renameNode);
  const deleteNode = useAppStore((s) => s.deleteNode);

  const [name, setName] = useState('');

  const isOpen = modal?.kind === 'node';
  useEffect(() => {
    if (!isOpen || !map) return;
    if (modal.mode === 'rename') {
      const info = selectInfo(map, modal.nodeId);
      setName(info ? info.name : '');
    } else {
      setName('');
    }
  }, [isOpen, modal, map]);

  if (!isOpen || !map) return <div id="modal" />;

  if (modal.mode === 'add-child') {
    const info = selectInfo(map, modal.nodeId);
    const parentName = info ? info.name : map.title;
    const onOk = (): string | null => {
      const n = name.trim();
      if (!n) return '请填写节点名称';
      if (n.length > 30) return '节点名称不能超过 30 个字';
      // 同级重名检查
      const list = info?.isRoot ? map.nodes : info?.node?.children ?? [];
      if (list.some((x) => x.name === n)) return '同级已存在同名节点';
      addNode(modal.nodeId, n);
      return null;
    };
    return (
      <ModalWrap open title="新增子节点" onClose={closeModal} okText="创建" onOk={onOk}>
        <label>父节点</label>
        <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 4 }}>{parentName}</div>
        <label>节点名称</label>
        <input
          maxLength={30}
          placeholder="例如：需求洞察"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </ModalWrap>
    );
  }

  if (modal.mode === 'rename') {
    const info = selectInfo(map, modal.nodeId);
    const isRoot = info?.isRoot ?? modal.nodeId === 'ROOT';
    const onOk = (): string | null => {
      const n = name.trim();
      if (!n) return '节点名称不能为空';
      if (n.length > 30) return '节点名称不能超过 30 个字';
      if (!isRoot && info?.siblings.some((x) => x.name === n)) return '同级已存在同名节点';
      if (isRoot) {
        // ROOT 即地图 title
        const updateMap = useAppStore.getState().updateMap;
        updateMap(map.id, { title: n });
      } else {
        renameNode(modal.nodeId, n);
      }
      return null;
    };
    return (
      <ModalWrap open title="修改节点" onClose={closeModal} okText="保存" onOk={onOk}>
        <label>节点名称</label>
        <input
          maxLength={30}
          value={name}
          placeholder="节点名称"
          onChange={(e) => setName(e.target.value)}
        />
      </ModalWrap>
    );
  }

  if (modal.mode === 'delete') {
    const info = selectInfo(map, modal.nodeId);
    const onOk = (): void => {
      deleteNode(modal.nodeId);
    };
    return (
      <ModalWrap
        open
        title="删除节点"
        onClose={closeModal}
        okText="确认删除"
        onOk={onOk}
        okClass="mini danger"
      >
        <div style={{ fontSize: 13, lineHeight: 1.8, color: '#4a5568' }}>
          确定删除「<b>{info?.name ?? modal.nodeId}</b>」吗？
          <br />
          该节点的所有子节点和属性都会被一起删除。
        </div>
      </ModalWrap>
    );
  }

  return <div id="modal" />;
}

// ---------- PropModal ----------
function PropModal(): JSX.Element {
  const modal = useAppStore((s) => s.modal);
  const map = useActiveMap();
  const closeModal = useAppStore((s) => s.closeModal);
  const addProp = useAppStore((s) => s.addProp);
  const updateProp = useAppStore((s) => s.updateProp);
  const deleteProp = useAppStore((s) => s.deleteProp);

  const [label, setLabel] = useState('');
  const [c, setC] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [r, setR] = useState('');

  const isOpen = modal?.kind === 'prop';
  useEffect(() => {
    if (!isOpen || !map) return;
    const info = selectInfo(map, modal.nodeId);
    const props = info?.props ?? [];
    const p = props[modal.propIndex];
    if (modal.mode === 'edit' && p) {
      setLabel(p.label || '');
      setC(p.note?.c || '');
      setTagsRaw((p.note?.t || []).join('，'));
      setR(p.note?.r || '');
    } else {
      setLabel('');
      setC('');
      setTagsRaw('');
      setR('');
    }
  }, [isOpen, modal, map]);

  if (!isOpen || !map) return <div id="modal" />;

  if (modal.mode === 'delete') {
    const info = selectInfo(map, modal.nodeId);
    const p = info?.props[modal.propIndex];
    const onOk = (): void => deleteProp(modal.nodeId, modal.propIndex);
    return (
      <ModalWrap
        open
        title="删除属性"
        onClose={closeModal}
        okText="确认删除"
        onOk={onOk}
        okClass="mini danger"
      >
        <div style={{ fontSize: 13, lineHeight: 1.8, color: '#4a5568' }}>
          确定删除属性「<b>{p?.label || '属性'}</b>」及其笔记内容吗？
        </div>
      </ModalWrap>
    );
  }

  const editing = modal.mode === 'edit';
  const onOk = (): string | null => {
    const l = label.trim();
    if (!l) return '请填写属性名';
    if (l.length > 30) return '属性名不能超过 30 个字';
    if (c.length > 500) return '笔记内容不能超过 500 字';
    const t = tagsRaw
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const prop = { label: l, note: { c, t, r: r.trim() } };
    if (editing) updateProp(modal.nodeId, modal.propIndex, prop);
    else addProp(modal.nodeId, prop);
    return null;
  };

  return (
    <ModalWrap
      open
      title={editing ? '编辑属性' : '新增属性'}
      onClose={closeModal}
      okText={editing ? '保存' : '创建'}
      onOk={onOk}
    >
      <label>属性名</label>
      <input
        maxLength={30}
        value={label}
        placeholder="例如：核心概念"
        onChange={(e) => setLabel(e.target.value)}
      />
      <label>笔记内容（≤500 字）</label>
      <textarea
        maxLength={500}
        placeholder="填写笔记正文"
        value={c}
        onChange={(e) => setC(e.target.value)}
      />
      <label>标签（逗号分隔）</label>
      <input
        value={tagsRaw}
        placeholder="例如：算法，基础"
        onChange={(e) => setTagsRaw(e.target.value)}
      />
      <label>备注</label>
      <input
        maxLength={60}
        value={r}
        placeholder="可选"
        onChange={(e) => setR(e.target.value)}
      />
    </ModalWrap>
  );
}

// ---------- PickerModal ----------
interface PickerState {
  repos: GitRepo[];
  repoId: string | null;
  listing: FsDirListing | null;
  loading: boolean;
  err: string;
  importing: boolean;
}

function PickerModal(): JSX.Element {
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);
  const importMap = useAppStore((s) => s.importMap);

  const isOpen = modal?.kind === 'picker';

  const [state, setState] = useState<PickerState>({
    repos: [],
    repoId: null,
    listing: null,
    loading: false,
    err: '',
    importing: false,
  });

  // 打开时加载 repos 列表
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setState((s) => ({ ...s, loading: true, err: '', repos: [], repoId: null, listing: null }));
      try {
        const r = await gitApi.listRepos();
        setState((s) => ({ ...s, repos: r.data, loading: false }));
      } catch (e) {
        setState((s) => ({
          ...s,
          loading: false,
          err: e instanceof Error ? e.message : '加载失败',
        }));
      }
    })();
  }, [isOpen]);

  // 选中 repo 后加载根目录 listing
  const enterRepo = async (repo: GitRepo): Promise<void> => {
    setState((s) => ({ ...s, repoId: repo.id, loading: true, err: '', listing: null }));
    try {
      const r = await gitApi.listDirs(repo.fs_path);
      setState((s) => ({ ...s, listing: r.data, loading: false }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        err: e instanceof Error ? e.message : '读取失败',
      }));
    }
  };

  const cd = async (path: string): Promise<void> => {
    setState((s) => ({ ...s, loading: true, err: '' }));
    try {
      const r = await gitApi.listDirs(path);
      setState((s) => ({ ...s, listing: r.data, loading: false }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        err: e instanceof Error ? e.message : '读取失败',
      }));
    }
  };

  const goRepoStep = (): void => {
    setState((s) => ({ ...s, repoId: null, listing: null, err: '' }));
  };

  const onImport = async (): Promise<void> => {
    const { repoId, repos, listing } = state;
    if (!repoId || !listing) return;
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    setState((s) => ({ ...s, importing: true, err: '' }));
    try {
      const tree = await fetchFsTree(listing.path);
      const map = mapFromTree(tree, repo);
      importMap(map);
      closeModal();
    } catch (e) {
      setState((s) => ({
        ...s,
        importing: false,
        err: e instanceof Error ? e.message : '导入失败',
      }));
    }
  };

  if (!isOpen) return <div id="picker" />;

  const { repos, repoId, listing, loading, err, importing } = state;

  return (
    <div id="picker" className="on" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="pk">
        <div className="pk-hd">
          <b>导入知识地图</b>
          <button className="mini" onClick={closeModal}>
            关闭
          </button>
        </div>

        <div className="pk-path">
          {!repoId ? (
            <span>选择知识仓库</span>
          ) : (
            <span>
              <a onClick={goRepoStep}>仓库：{repos.find((r) => r.id === repoId)?.name}</a>
              <span> / </span>
              <span className="cur">{listing?.path ?? ''}</span>
            </span>
          )}
        </div>

        <div className="pk-list">
          {loading && <div className="pk-empty">加载中…</div>}
          {!loading && !repoId && (
            <>
              {repos.length === 0 ? (
                <div className="pk-empty">
                  {err ? err : '还没有知识仓库'}
                  <br />
                  点击下方「添加仓库」登记一个
                </div>
              ) : (
                repos.map((r) => (
                  <div
                    className="pk-row"
                    key={r.id}
                    onClick={() => void enterRepo(r)}
                  >
                    <span className="nm">{r.name}</span>
                    <span className="meta">
                      {r.path} · {r.branch}
                    </span>
                  </div>
                ))
              )}
            </>
          )}
          {!loading && repoId && listing && (
            <>
              {listing.dirs.length === 0 ? (
                <div className="pk-empty">当前目录没有子目录，可直接导入此目录</div>
              ) : (
                listing.dirs.map((d) => (
                  <div
                    className="pk-row"
                    key={d.path}
                    onClick={() => void cd(d.path)}
                  >
                    <span className="nm">{d.name}</span>
                    <span className="meta">
                      {d.mdCount} 篇文档{d.hasChildren ? ' · 含子目录' : ''}
                    </span>
                  </div>
                ))
              )}
            </>
          )}
          {!loading && repoId && !listing && !err && <div className="pk-empty">请稍候…</div>}
        </div>

        <div className="pk-ft">
          <span className={`pk-tip ${err ? 'err' : ''}`}>
            {err
              ? err
              : !repoId
              ? repos.length
                ? `共 ${repos.length} 个知识仓库，选择后进入目录`
                : '请先添加知识仓库'
              : listing
              ? `将把「${listing.name}」作为区块与根目录，含 ${listing.mdCount} 篇文档`
              : ''}
          </span>
          <span style={{ flex: 1 }} />
          <button className="mini" onClick={() => closeModal()} disabled={importing}>
            添加仓库…
          </button>
          <button
            className="mini"
            onClick={() => {
              if (!listing || listing.parent === null || !repoId) return;
              void cd(listing.parent);
            }}
            disabled={!listing || listing.parent === null}
          >
            上一级
          </button>
          <button
            className="mini primary"
            onClick={onImport}
            disabled={!repoId || !listing || importing}
          >
            {importing ? '扫描中…' : '导入此目录'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- RepoModal ----------
function RepoModal(): JSX.Element {
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);

  const [name, setName] = useState('');
  const [fsPath, setFsPath] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const isOpen = modal?.kind === 'repo';
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setFsPath('');
    setErr('');
  }, [isOpen]);

  const candidates = useMemo(
    () => [
      { name: '示例知识库', fsPath: '示例知识库' },
      { name: '机器学习知识库', fsPath: '示例知识库/机器学习' },
    ],
    [],
  );

  const submit = async (): Promise<void> => {
    const n = name.trim();
    const p = fsPath.trim().replace(/^\/+|\/+$/g, '');
    if (!n) {
      setErr('请填写仓库名称');
      return;
    }
    if (!p) {
      setErr('请填写起始目录');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await gitApi.createRepo({
        name: n,
        fs_path: p,
        init: true,
        remote_url: null,
      });
      closeModal();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '添加失败');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return <div id="repoDlg" />;

  return (
    <div id="repoDlg" className="on" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-hd">
          <b>添加知识仓库</b>
          <button className="mini" onClick={closeModal}>
            关闭
          </button>
        </div>
        <div className="modal-bd">
          <label>仓库名称</label>
          <input
            maxLength={30}
            placeholder="例如：示例知识库"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>起始目录（相对知识库根目录，可留空）</label>
          <input
            placeholder="示例知识库"
            value={fsPath}
            onChange={(e) => setFsPath(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <div className="mini-empty" style={{ marginBottom: 6 }}>
              候选仓库（点击填入）
            </div>
            {candidates.map((c, i) => (
              <div
                className="cand"
                key={i}
                onClick={() => {
                  setName(c.name);
                  setFsPath(c.fsPath);
                }}
              >
                <b>{c.name}</b>
                <span>{c.fsPath}</span>
              </div>
            ))}
          </div>
          <div className="pTip">
            知识仓库是独立 git 仓库，与产品工程仓库无关。登记时会在后端真实创建。
          </div>
        </div>
        <div className="modal-err">{err}</div>
        <div className="modal-ft">
          <button className="mini" onClick={closeModal} disabled={busy}>
            取消
          </button>
          <button className="mini primary" onClick={submit} disabled={busy}>
            {busy ? '添加中…' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- 统一出口 ----------
export function Modals(): JSX.Element {
  const modal = useAppStore((s) => s.modal);
  // 根据 kind 渲染对应 modal。MapNodeProp 共用 #modal；Picker 用 #picker；Repo 用 #repoDlg。
  return (
    <>
      {(modal?.kind === 'map' || modal?.kind === 'node' || modal?.kind === 'prop') && (
        <>
          {modal.kind === 'map' && <MapModal />}
          {modal.kind === 'node' && <NodeModal />}
          {modal.kind === 'prop' && <PropModal />}
        </>
      )}
      {modal?.kind === 'picker' && <PickerModal />}
      {modal?.kind === 'repo' && <RepoModal />}
    </>
  );
}

// ---------- 目录树 → TreeMap ----------
interface FsTreeNodeApi {
  name: string;
  path: string;
  props?: { label: string; content?: string; path?: string; doc?: boolean }[];
  children?: FsTreeNodeApi[];
}

function dirToNode(dir: FsTreeNodeApi): TreeNode {
  return {
    id: uuidv4(),
    name: dir.name,
    props: (dir.props || []).map((p) => ({
      label: p.label,
      doc: true,
      note: { c: p.content || '', t: [], r: p.path || '' },
    })),
    children: (dir.children || []).map(dirToNode),
  };
}

function mapFromTree(tree: FsTreeNodeApi, repo: GitRepo): TreeMap {
  const rootProps = (tree.props || []).map((p) => ({
    label: p.label,
    doc: true,
    note: { c: p.content || '', t: [], r: p.path || '' },
  }));
  return {
    id: uuidv4(),
    title: tree.name,
    desc: `知识仓库目录：${repo.name} / ${tree.path || ''}`,
    repo: { id: repo.id, name: repo.name },
    props: rootProps,
    nodes: (tree.children || []).map(dirToNode),
  };
}

export default Modals;

// 消除 ESLint 未使用 ModalState 警告
export type _ModalState = ModalState;
