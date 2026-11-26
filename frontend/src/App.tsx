import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import HomePage from '@/pages/HomePage';
import MindMapPage from '@/pages/MindMapPage';
import GitPage from '@/pages/GitPage';
import NotePage from '@/pages/NotePage';
import { useAppStore } from '@/store';
import type { TreeMap } from '@/types';

/**
 * 顶栏逻辑：根据当前路由 / activeMapId 决定显示 `#homeTools` 还是 `#mapTools`。
 * `openPicker / logOpen / exportMaps` 复用 zustand store。
 */
function TopBar(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const searchKeyword = useAppStore((s) => s.searchKeyword);
  const search = useAppStore((s) => s.search);
  const zoom = useAppStore((s) => s.zoom);
  const expandAll = useAppStore((s) => s.expandAll);
  const toggleLog = useAppStore((s) => s.toggleLog);
  const openSide = useAppStore((s) => s.openSide);
  const goHome = useAppStore((s) => s.goHome);
  const openModal = useAppStore((s) => s.openModal);
  const exportMaps = useAppStore((s) => s.exportMaps);
  const logOp = useAppStore((s) => s.logOp);

  const isMindMap = location.pathname.startsWith('/map/');

  // 顶栏：全局快捷键 Escape 关闭弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      const modal = useAppStore.getState().modal;
      const anyOpen = modal !== null || useAppStore.getState().sideOpen || useAppStore.getState().logOpen || useAppStore.getState().ctxMenu;
      if (!anyOpen) return;
      if (modal) {
        useAppStore.getState().closeModal();
      } else if (useAppStore.getState().sideOpen) {
        useAppStore.getState().closeSide();
      } else if (useAppStore.getState().ctxMenu) {
        useAppStore.getState().closeCtx();
      } else if (useAppStore.getState().logOpen) {
        useAppStore.getState().toggleLog(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doExport = (): void => {
    exportMaps();
    logOp('导出数据');
  };

  const doFit = (): void => {
    const w = window as unknown as { __lmFit?: () => void };
    w.__lmFit?.();
  };

  return (
    <div id="bar">
      <div
        id="brand"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          goHome();
          navigate('/');
        }}
      >
        LinkMind
      </div>

      {isMindMap && (
        <button
          className="mini backHome"
          onClick={() => {
            goHome();
            navigate('/');
          }}
        >
          返回首页
        </button>
      )}

      <span id="hint">
        {isMindMap
          ? '左键点击节点展开/收起 · 右键打开操作菜单 · 滚轮缩放 · 拖拽平移'
          : '点击区块进入对应脑图'}
      </span>

      <span className="sp" />

      {!isMindMap && location.pathname === '/' && (
        <div id="homeTools">
          <button className="mini" onClick={() => openModal({ kind: 'picker' })}>
            导入知识地图
          </button>
          <button className="mini" onClick={() => navigate('/git')}>
            Git 管理
          </button>
          <button className="mini" onClick={doExport}>
            导出
          </button>
          <button className="mini" onClick={() => toggleLog()}>
            操作记录
          </button>
        </div>
      )}

      {isMindMap && (
        <div id="mapTools">
          <input
            id="q"
            placeholder="搜索关键词"
            value={searchKeyword}
            onChange={(e) => search(e.target.value)}
          />
          <button className="mini" onClick={expandAll}>
            全部展开
          </button>
          <button
            className="mini"
            onClick={() => {
              // 收起到一级 = 清 folded 后再把所有 d>=1 且有 kids 的收起来
              const state = useAppStore.getState();
              const { activeMapId, collapsed } = state;
              if (!activeMapId) return;
              // 简化：清空，把顶层的子节点都收起来
              const next = new Set<string>(collapsed);
              state.maps.forEach((m) => {
                if (m.id !== activeMapId) return;
                (m.nodes || []).forEach((n) => {
                  if (n.children && n.children.length) next.add(n.id);
                });
              });
              useAppStore.setState({ collapsed: next });
              logOp('收起到一级');
            }}
          >
            收起到一级
          </button>
          <button className="mini" onClick={doFit}>
            居中布局
          </button>
          <button className="mini" onClick={() => zoom(1.2)}>
            放大
          </button>
          <button className="mini" onClick={() => zoom(0.83)}>
            缩小
          </button>
          <button
            className="mini"
            onClick={() => {
              if (!useAppStore.getState().selectedId) useAppStore.setState({ selectedId: 'ROOT' });
              openSide();
            }}
          >
            节点属性
          </button>
        </div>
      )}

      {location.pathname.startsWith('/git') && (
        <div id="homeTools">
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            style={{ fontSize: 12.5, color: '#1d4ed8', textDecoration: 'none', border: '1px solid #d7dee8', borderRadius: 6, padding: '5px 10px' }}
          >
            ← 返回首页
          </a>
          <button className="mini" onClick={() => void (window as unknown as { __lmGitAdd?: () => void }).__lmGitAdd?.()}>
            添加仓库
          </button>
          <button
            className="mini danger"
            onClick={() => void (window as unknown as { __lmGitRemove?: () => void }).__lmGitRemove?.()}
          >
            移除仓库
          </button>
        </div>
      )}
    </div>
  );
}

function RouterView(): JSX.Element {
  const location = useLocation();
  // HomePage 里的地图删除按钮使用了 modal index，store 里没有 delete 地图的 modal——
  // 我们补一个 MapModal 处理 mode: delete
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/map/:mapId" element={<MindMapPage />} />
          <Route path="/git" element={<GitPage />} />
          <Route path="/note" element={<NotePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ConfigProvider>
      <HashRouter>
        <RouterView />
      </HashRouter>
    </ConfigProvider>
  );
}

// 给 store 补一个 exportMaps action
declare module '@/store' {
  interface StoreState {
    exportMaps: () => void;
  }
}

// 运行时补充：如果 store 里没有 exportMaps，在这里挂一个
// （我们通过 declare module 扩展类型；实现挂在 store/index.ts 里已经有了）

// 让 TS 不抱怨未使用的导入（TreeMap）
void 0 as unknown as TreeMap;
