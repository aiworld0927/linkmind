export type GitFileState =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'untracked'
  | 'conflict'
  | 'renamed'
  | 'copied'
  | 'changed';

export interface GitFile {
  path: string;
  code: string;
  state: GitFileState;
  staged: boolean;
  conflict: boolean;
}

export interface GitConflict {
  path: string;
  ours: string;
  theirs: string;
  working: string;
}

export interface GitCommit {
  hash: string;
  short_hash: string;
  author: string;
  /** ISO 8601 日期时间（后端 GitCommitOut.date: datetime） */
  date: string;
  subject: string;
}

export interface GitAction {
  /** 后端 GitActionOut.id 为 uuid 字符串（原前端误标为 number） */
  id: string;
  /** ISO 8601 日期时间（后端 GitActionOut.ts: datetime） */
  ts: string;
  action: string;
  message: string;
  files: string[];
  ok: boolean;
}

export interface GitCounts {
  total: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflict: number;
}

export interface GitRepo {
  id: string;
  name: string;
  path: string;
  fs_path: string;
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  remote: string | null;
  merging: boolean;
  files: GitFile[];
  conflicts: GitConflict[];
  counts: GitCounts;
  log: GitCommit[];
  actions: GitAction[];
}

export interface GitRepoCreatePayload {
  name: string;
  fs_path: string;
  init: boolean;
  remote_url: string | null;
}

export interface GitCommitPayload {
  message: string;
  paths?: string[];
  all: boolean;
}

export type ResolveStrategy = 'ours' | 'theirs' | 'content';

export interface FsDirEntry {
  name: string;
  path: string;
  hasChildren: boolean;
  mdCount: number;
}

export interface FsDirListing {
  rootName: string;
  path: string;
  name: string;
  parent: string | null;
  dirs: FsDirEntry[];
  mdCount: number;
}
