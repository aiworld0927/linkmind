import type {
  FsDirListing,
  GitAction,
  GitCommit,
  GitCommitPayload,
  GitRepo,
  GitRepoCreatePayload,
  ResolveStrategy,
} from './types';
import { request, json } from '@/utils/http';
import type { ApiResult, Page } from '@/utils/http';

// 兼容旧引用：ApiError / Page 统一由 utils/http 提供
export { ApiError } from '@/utils/http';
export type { Page } from '@/utils/http';

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
