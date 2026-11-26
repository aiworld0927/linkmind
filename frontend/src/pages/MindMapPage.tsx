import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { useActiveMap } from '@/store';
import { build, fitView } from '@/utils/layout';
import MindCanvas from '@/features/mindmap/MindCanvas';
import SideDrawer from '@/features/mindmap/SideDrawer';
import CtxMenu from '@/features/mindmap/CtxMenu';
import LogDrawer from '@/features/mindmap/LogDrawer';
import Modals from '@/features/mindmap/Modals';

/**
 * MindMapPage：当 hash 路由 `/map/:mapId` 匹配时挂载，自动 enterMap；
 * 画布 + 抽屉 + 菜单 + 弹窗。
 */
export function MindMapPage(): JSX.Element {
  const { mapId } = useParams<{ mapId: string }>();
  const enterMap = useAppStore((s) => s.enterMap);
  const goHome = useAppStore((s) => s.goHome);
  const activeMapId = useAppStore((s) => s.activeMapId);
  const collapsed = useAppStore((s) => s.collapsed);
  const setView = useAppStore((s) => s.setView);

  const map = useActiveMap();

  // 路由进来时 enterMap
  useEffect(() => {
    if (!mapId) {
      goHome();
      return;
    }
    if (activeMapId !== mapId) enterMap(mapId);
  }, [mapId, activeMapId, enterMap, goHome]);

  // 退出时回到首页（用户点「返回首页」也会触发 goHome；路由离开时我们不强制 goHome，留着历史）

  // 为 CtxMenu 计算 views
  const views = useMemo(() => {
    if (!map) return undefined;
    return build(map, collapsed).views;
  }, [map, collapsed]);

  // fit() 供顶栏「居中布局」按钮调用
  const doFit = (): void => {
    const stage = document.getElementById('stage');
    const state = useAppStore.getState();
    const currentMap = state.maps.find((m) => m.id === state.activeMapId);
    if (!stage || !currentMap) return;
    const cr = stage.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    const { bounds } = build(currentMap, state.collapsed);
    const v = fitView(bounds, cr.width, cr.height);
    setView(v);
  };

  // 挂载后 fit 一次
  useEffect(() => {
    const stage = document.getElementById('stage');
    if (!stage || !map) return;
    doFit();
    // 让顶栏 fit() 按钮也能调用我们
    (window as unknown as { __lmFit?: () => void }).__lmFit = doFit;
    return () => {
      const w = window as unknown as { __lmFit?: () => void };
      if (w.__lmFit === doFit) delete w.__lmFit;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map?.id]);

  if (!map) return <div style={{ padding: 40, textAlign: 'center', color: '#8a94a6' }}>加载中…</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MindCanvas />
      <SideDrawer />
      <CtxMenu views={views} />
      <LogDrawer />
      <Modals />
    </div>
  );
}

export default MindMapPage;
