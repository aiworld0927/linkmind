import { describe, expect, it } from 'vitest';
import { actionLabel, stateFromCode, stateMeta } from './labels';
import type { GitFileState } from './types';

describe('stateMeta', () => {
  it('返回已知状态的文案与颜色', () => {
    expect(stateMeta('modified')).toEqual({ label: '修改', color: 'orange' });
    expect(stateMeta('conflict')).toEqual({ label: '冲突', color: 'magenta' });
    expect(stateMeta('untracked')).toEqual({ label: '未跟踪', color: 'geekblue' });
  });

  it('未知状态回退到 changed', () => {
    expect(stateMeta('unknown' as unknown as GitFileState)).toEqual({
      label: '变更',
      color: 'default',
    });
  });
});

describe('stateFromCode', () => {
  it('识别未跟踪状态', () => {
    expect(stateFromCode('??')).toBe('untracked');
  });

  it('识别冲突状态', () => {
    expect(stateFromCode('UU')).toBe('conflict');
    expect(stateFromCode('AA')).toBe('conflict');
  });

  it('识别重命名与复制', () => {
    expect(stateFromCode('R100')).toBe('renamed');
    expect(stateFromCode('C75')).toBe('copied');
  });

  it('识别新增、删除、修改状态', () => {
    expect(stateFromCode('A ')).toBe('added');
    expect(stateFromCode(' D')).toBe('deleted');
    expect(stateFromCode('M ')).toBe('modified');
    expect(stateFromCode('T ')).toBe('modified');
  });

  it('未知状态码回退到 changed', () => {
    expect(stateFromCode('')).toBe('changed');
    expect(stateFromCode('ZZ')).toBe('changed');
  });
});

describe('actionLabel', () => {
  it('返回已知动作的中文文案', () => {
    expect(actionLabel('commit')).toBe('提交');
    expect(actionLabel('pull')).toBe('拉取');
    expect(actionLabel('push')).toBe('推送');
    expect(actionLabel('resolve')).toBe('解决冲突');
    expect(actionLabel('merge-continue')).toBe('完成合并');
    expect(actionLabel('merge-abort')).toBe('放弃合并');
  });

  it('未知动作原样返回', () => {
    expect(actionLabel('rebase')).toBe('rebase');
    expect(actionLabel('')).toBe('');
  });
});
