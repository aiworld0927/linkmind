import { useEffect, useState } from 'react';
import { ConfigProvider, Spin, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app';
import { useStore } from '@/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { MindMapPage } from '@/pages/MindMapPage';
import { GitPage } from '@/pages/GitPage';
import { NotePage } from '@/pages/NotePage';

function AppShell() {
  const bootstrap = useStore((state) => state.bootstrap);
  const lastError = useStore((state) => state.lastError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. 先恢复本地会话（或内置示例数据），完成后再渲染页面，避免路由页面读到旧数据
    bootstrap();
    setReady(true);

    // 2. 暴露外部数据接入 API，便于宿主系统动态注入数据
    window.linkmind = {
      version: APP_CONFIG.version,
      load: (payload: unknown) => useStore.getState().importData(payload),
      snapshot: () => useStore.getState().exportData(),
      reset: () => {
        useStore.getState().resetCanvas();
        return { ok: true, message: '画布已重置' };
      },
    };

    // 3. 支持页面预置全局数据（window.__LINKMIND_DATA__）动态渲染
    if (window.__LINKMIND_DATA__ !== undefined) {
      const result = useStore.getState().importData(window.__LINKMIND_DATA__);
      if (!result.ok) console.warn('[linkmind] 外部数据加载失败:', result.message);
    }

    return () => {
      delete window.linkmind;
    };
  }, [bootstrap]);

  useEffect(() => {
    if (lastError) message.error(lastError);
  }, [lastError]);

  if (!ready) {
    return (
      <div className="lm-boot">
        <Spin size="large" tip="正在加载知识地图…" />
      </div>
    );
  }

  return (
    <div className="lm-app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map/:datasetId" element={<MindMapPage />} />
        <Route path="/git" element={<GitPage />} />
        <Route path="/note" element={<NotePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 6,
          fontFamily:
            '"Microsoft YaHei", "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <ErrorBoundary>
        <HashRouter>
          <AppShell />
        </HashRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
}
