import type {
  FsDirListing,
  GitAction,
  GitCommit,
  GitCommitPayload,
  GitRepo,
  GitRepoCreatePayload,
  ResolveStrategy,
} from './types';

/** 后端 API 基础地址：开发环境由 .env.development 注入，缺省走同源代理 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

interface ApiResult<T> {
  data: T;
  msg: string;
}

/**
 * 后端统一分页结构（A-11 / A-12 / C-1）：`{ total, items }`。
 * 与旧版前端 `limit` + `data.log` / `data.actions` 的约定不一致，已按后端契约修正。
 */
export interface Page<T> {
  total: number;
  items: T[];
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
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

const json = (method: string, payload?: unknown): RequestInit => ({
  method,
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
});

export const gitApi = {
  async listRepos(): Promise<ApiResult<GitRepo[]>> {
    const result = await request<{ repos: GitRepo[] }>('/git/repos');
    return { data: result.data.repos, msg: result.msg };
  },

  async getRepo(repoId: string): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}`);
  },

  async createRepo(payload: GitRepoCreatePayload): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>('/git/repos', json('POST', payload));
  },

  async deleteRepo(repoId: string): Promise<ApiResult<{ removed: boolean }>> {
    return request<{ removed: boolean }>(`/git/repos/${repoId}`, json('DELETE'));
  },

  async commit(repoId: string, payload: GitCommitPayload): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}/commit`, json('POST', payload));
  },

  async pull(repoId: string): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}/pull`, json('POST'));
  },

  async push(repoId: string): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}/push`, json('POST'));
  },

  async resolveConflict(
    repoId: string,
    payload: { path: string; strategy: ResolveStrategy; content?: string },
  ): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}/conflicts/resolve`, json('POST', payload));
  },

  async continueMerge(repoId: string): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}/merge/continue`, json('POST'));
  },

  async abortMerge(repoId: string): Promise<ApiResult<GitRepo>> {
    return request<GitRepo>(`/git/repos/${repoId}/merge/abort`, json('POST'));
  },

  /** A-11 提交历史：后端返回 Page{total, items}，使用 page/page_size 分页 */
  async log(
    repoId: string,
    page = 1,
    pageSize = 20,
  ): Promise<ApiResult<Page<GitCommit>>> {
    return request<Page<GitCommit>>(
      `/git/repos/${repoId}/log?page=${page}&page_size=${pageSize}`,
    );
  },

  /** A-12 Git 动作记录：后端返回 Page{total, items}，使用 page/page_size 分页 */
  async actions(
    repoId: string,
    page = 1,
    pageSize = 60,
  ): Promise<ApiResult<Page<GitAction>>> {
    return request<Page<GitAction>>(
      `/git/repos/${repoId}/actions?page=${page}&page_size=${pageSize}`,
    );
  },

  async listDirs(path: string): Promise<ApiResult<FsDirListing>> {
    return request<FsDirListing>(`/fs/dirs?path=${encodeURIComponent(path)}`);
  },
};
