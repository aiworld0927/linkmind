/** fs 模块调用后端 /api/v1/fs/tree 和 /api/v1/fs/dirs */
import { gitApi } from '@/features/git/api';

const API_BASE = '/api/v1';

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

interface FsTreeNode {
  name: string;
  path: string;
  props?: { label: string; content?: string; path?: string; doc?: boolean }[];
  children?: FsTreeNode[];
}

export async function fetchFsTree(path: string): Promise<FsTreeNode> {
  const url = `${API_BASE}/fs/tree?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as ApiEnvelope<FsTreeNode>;
  if (!body || body.code !== 200) throw new Error(body?.msg || '请求失败');
  return body.data;
}

/** 复用 gitApi.listDirs 已经封装好的 /api/v1/fs/dirs，拿 FsDirListing */
export const listDirs = gitApi.listDirs;

export type { FsTreeNode };
