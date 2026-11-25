import type { GitFileState } from './types';

export const FILE_STATE_META: Record<GitFileState, { label: string; color: string }> = {
  modified: { label: '修改', color: 'orange' },
  added: { label: '新增', color: 'green' },
  deleted: { label: '删除', color: 'red' },
  untracked: { label: '未跟踪', color: 'geekblue' },
  conflict: { label: '冲突', color: 'magenta' },
  renamed: { label: '重命名', color: 'cyan' },
  copied: { label: '复制', color: 'purple' },
  changed: { label: '变更', color: 'default' },
};

const ACTION_LABELS: Record<string, string> = {
  commit: '提交',
  pull: '拉取',
  push: '推送',
  resolve: '解决冲突',
  'merge-continue': '完成合并',
  'merge-abort': '放弃合并',
};

export function stateMeta(state: GitFileState): { label: string; color: string } {
  return FILE_STATE_META[state] ?? FILE_STATE_META.changed;
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Git 状态码到中文主题的映射，供徽标与表格复用。 */
export function stateFromCode(code: string): GitFileState {
  if (code === '??') return 'untracked';
  if (['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(code)) return 'conflict';
  if (code.includes('R')) return 'renamed';
  if (code.includes('C')) return 'copied';
  if (code.includes('A')) return 'added';
  if (code.includes('D')) return 'deleted';
  if (code.includes('M') || code.includes('T')) return 'modified';
  return 'changed';
}
