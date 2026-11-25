import type { ExportDataPayload, OperationResult } from '@/types';

declare global {
  interface Window {
    linkmind?: {
      version: string;
      load: (payload: unknown) => OperationResult;
      snapshot: () => ExportDataPayload;
      reset: () => OperationResult;
    };
    /** 宿主页面在加载脚本前注入的数据集 / 导出备份 */
    __LINKMIND_DATA__?: unknown;
  }
}

export {};
