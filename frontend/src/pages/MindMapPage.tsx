import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { useActiveMap } from '@/store';
import { build, fitView } from '@/utils/layout';
import MindCanvas from '@/features/mindmap/MindCanvas';
import SideDrawer from '@/features/mindmap/SideDrawer';
import CtxMenu from '@/features/mindmap/CtxMenu';
import LogDrawer from '@/features/mindmap/LogDrawer';

/**
 * MindMapPage：当 hash 路由 `/map/:mapId` 匹配时挂载，自动 enterMap 并拉取整树。
 * 画布 + 抽屉 + 菜单 + 弹窗（弹窗已提升到 App 全局）。
 */
export function MindMapPage(): JSX.Element {
  const { mapId } = useParams<{ mapId: string }>();
  const enterMap = useAppStore((s) => s.enterMap);
  const goHome = useAppStore((s) => s.goHome);
  const activeMapId = useAppStore((s) => s.activeMapId);
  const collapsed = useAppStore((s) => s.collapsed);
  const setView = useAppStore((s) => s.setView);
  const ensureTree = useAppStore((s) => s.ensureTree);
  const treeLoading = useAppStore((s) => s.treeLoading);
  const treeError = useAppStore((s) => s.treeError);

  const map = useActiveMap();

  // 路由进来时 enterMap
  useEffect(() => {
    if (!mapId) {
      goHome();
      return;
    }
    if (activeMapId !== mapId) enterMap(mapId);
  }, [mapId, activeMapId, enterMap, goHome]);

  // 从后端加载整棵树（若已有缓存则跳过）
  useEffect(() => {
    if (mapId) void ensureTree(mapId);
  }, [mapId, ensureTree]);

  // 为 CtxMenu 计算 views
  const views = useMemo(() => {
    if (!map || !map.loaded) return undefined;
    return build(map, collapsed).views;
  }, [map, collapsed]);

  // fit() 供顶栏「居中布局」按钮调用
  const doFit = (): void => {
    const stage = document.getElementById('stage');
    const state = useAppStore.getState();
    const currentMap = state.maps.find((m) => m.id === state.activeMapId);
    if (!stage || !currentMap || !currentMap.loaded) return;
    const cr = stage.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    const { bounds } = build(currentMap, state.collapsed);
    const v = fitView(bounds, cr.width, cr.height);
    setView(v);
  };

  // 挂载后 fit 一次
  useEffect(() => {
    const stage = document.getElementById('stage');
    if (!stage || !map?.loaded) return;
    doFit();
    (window as unknown as { __lmFit?: () => void }).__lmFit = doFit;
    return () => {
      const w = window as unknown as { __lmFit?: () => void };
      if (w.__lmFit === doFit) delete w.__lmFit;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map?.id, map?.loaded]);

  if (!map) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#8a94a6' }}>加载中…</div>;
  }
  if (!map.loaded) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: treeError ? '#b91c1c' : '#8a94a6' }}>
        {treeError ? `加载失败：${treeError}` : treeLoading ? '加载脑图中…' : '加载中…'}
        {treeError && mapId && (
          <div style={{ marginTop: 12 }}>
            <button className="mini" onClick={() => void ensureTree(mapId)}>
              重试
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MindCanvas />
      <SideDrawer />
      <CtxMenu views={views} />
      <LogDrawer />
    </div>
  );
}

export default MindMapPage;
