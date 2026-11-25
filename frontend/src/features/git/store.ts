import { create } from 'zustand';
import { message } from 'antd';
import { gitApi } from './api';
import type {
  GitCommitPayload,
  GitRepo,
  GitRepoCreatePayload,
  ResolveStrategy,
} from './types';

interface GitStoreState {
  repos: GitRepo[];
  currentId: string | null;
  loading: boolean;
  busy: string | null;
  error: string | null;

  load: () => Promise<void>;
  select: (repoId: string) => void;
  refresh: () => Promise<void>;
  addRepo: (payload: GitRepoCreatePayload) => Promise<boolean>;
  removeRepo: (repoId: string) => Promise<boolean>;
  commit: (payload: GitCommitPayload) => Promise<boolean>;
  pull: () => Promise<boolean>;
  push: () => Promise<boolean>;
  resolveConflict: (path: string, strategy: ResolveStrategy, content?: string) => Promise<boolean>;
  continueMerge: () => Promise<boolean>;
  abortMerge: () => Promise<boolean>;
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : '操作失败，请稍后重试';

export const useGitStore = create<GitStoreState>()((set, get) => {
  const current = (): GitRepo | null => {
    const { repos, currentId } = get();
    return repos.find((item) => item.id === currentId) ?? null;
  };

  const applyRepo = (repo: GitRepo, successMessage?: string): void => {
    set((state) => ({
      repos: state.repos.some((item) => item.id === repo.id)
        ? state.repos.map((item) => (item.id === repo.id ? repo : item))
        : [...state.repos, repo],
      currentId: repo.id,
    }));
    if (successMessage) message.success(successMessage);
  };

  const run = async (label: string, task: () => Promise<boolean>): Promise<boolean> => {
    if (get().busy) return false;
    set({ busy: label });
    try {
      return await task();
    } catch (error) {
      message.error(errorText(error));
      return false;
    } finally {
      set({ busy: null });
    }
  };

  return {
    repos: [],
    currentId: null,
    loading: false,
    busy: null,
    error: null,

    load: async () => {
      set({ loading: true, error: null });
      try {
        const result = await gitApi.listRepos();
        set((state) => ({
          repos: result.data,
          currentId:
            state.currentId && result.data.some((item) => item.id === state.currentId)
              ? state.currentId
              : result.data[0]?.id ?? null,
          loading: false,
        }));
      } catch (error) {
        set({ loading: false, repos: [], error: errorText(error) });
      }
    },

    select: (repoId) => set({ currentId: repoId }),

    refresh: async () => {
      const repo = current();
      if (!repo) return;
      await run('refresh', async () => {
        const result = await gitApi.getRepo(repo.id);
        applyRepo(result.data, '状态已刷新');
        return true;
      });
    },

    addRepo: async (payload) =>
      run('add', async () => {
        const result = await gitApi.createRepo(payload);
        applyRepo(result.data, result.msg);
        set({ error: null });
        return true;
      }),

    removeRepo: async (repoId) =>
      run('remove', async () => {
        const result = await gitApi.deleteRepo(repoId);
        set((state) => {
          const repos = state.repos.filter((item) => item.id !== repoId);
          return {
            repos,
            currentId: state.currentId === repoId ? repos[0]?.id ?? null : state.currentId,
          };
        });
        message.success(result.msg);
        return true;
      }),

    commit: async (payload) => {
      const repo = current();
      if (!repo) return false;
      return run('commit', async () => {
        const result = await gitApi.commit(repo.id, payload);
        applyRepo(result.data, result.msg);
        return true;
      });
    },

    pull: async () => {
      const repo = current();
      if (!repo) return false;
      return run('pull', async () => {
        const result = await gitApi.pull(repo.id);
        applyRepo(result.data, result.msg);
        return true;
      });
    },

    push: async () => {
      const repo = current();
      if (!repo) return false;
      return run('push', async () => {
        const result = await gitApi.push(repo.id);
        applyRepo(result.data, result.msg);
        return true;
      });
    },

    resolveConflict: async (path, strategy, content) => {
      const repo = current();
      if (!repo) return false;
      return run('resolve', async () => {
        const payload = content === undefined ? { path, strategy } : { path, strategy, content };
        const result = await gitApi.resolveConflict(repo.id, payload);
        applyRepo(result.data, result.msg);
        return true;
      });
    },

    continueMerge: async () => {
      const repo = current();
      if (!repo) return false;
      return run('continue', async () => {
        const result = await gitApi.continueMerge(repo.id);
        applyRepo(result.data, result.msg);
        return true;
      });
    },

    abortMerge: async () => {
      const repo = current();
      if (!repo) return false;
      return run('abort', async () => {
        const result = await gitApi.abortMerge(repo.id);
        applyRepo(result.data, result.msg);
        return true;
      });
    },
  };
});
