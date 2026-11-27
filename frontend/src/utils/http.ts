/**
 * 统一后端 HTTP 客户端。
 * - baseURL 由 VITE_API_BASE_URL 注入，缺省同源 /api/v1；
 * - 统一解析后端包裹 { code, msg, data }，非 200 抛 ApiError；
 * - 供 git / fs / mindmap 等模块复用。
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

/** 业务层返回值：data + 后端提示语 */
export interface ApiResult<T> {
  data: T;
  msg: string;
}

/** 后端统一分页结构：{ total, items } */
export interface Page<T> {
  total: number;
  items: T[];
}

export async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError('无法连接后端服务，请确认服务已启动', 0);
  }

  const text = await response.text();
  let body: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(`服务响应格式异常（HTTP ${response.status}）`, response.status);
    }
  }

  if (!response.ok || !body || body.code !== 200) {
    throw new ApiError(body?.msg || `请求失败（HTTP ${response.status}）`, response.status);
  }
  return { data: body.data, msg: body.msg };
}

/** 构造 JSON 请求 init */
export const json = (method: string, payload?: unknown): RequestInit => ({
  method,
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
});

/** 把任意异常转成可展示文案 */
export function errorMessage(err: unknown, fallback = '操作失败'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
