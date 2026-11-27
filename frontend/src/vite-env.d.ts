/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基础地址；缺省时使用同源 /api/v1（走 Vite 代理或 nginx 转发） */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
