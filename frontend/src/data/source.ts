import { clearSession, loadSession, saveSession, type PersistedSession } from '@/utils/storage';

/**
 * 画布数据源接口。
 * 默认使用浏览器本地存储，也可以通过 setDataSource 接入后端 API / 嵌入式宿主。
 * Store 仅依赖该接口，实现数据层与视图层解耦。
 */
export interface CanvasDataSource {
  name: string;
  load: () => { ok: boolean; data: PersistedSession | null; message: string };
  save: (session: PersistedSession) => { ok: boolean; message: string };
  clear: () => void;
}

export const localDataSource: CanvasDataSource = {
  name: 'localStorage',
  load: loadSession,
  save: saveSession,
  clear: clearSession,
};

let activeDataSource: CanvasDataSource = localDataSource;

export const getDataSource = (): CanvasDataSource => activeDataSource;

export const setDataSource = (source: CanvasDataSource): void => {
  activeDataSource = source;
};
