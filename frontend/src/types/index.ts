export interface NotePayload {
  c: string;
  t: string[];
  r: string;
}

export interface TreeNodeProp {
  label: string;
  note: NotePayload;
  doc?: boolean;
  path?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  props: TreeNodeProp[];
  children: TreeNode[];
}

export interface RepoRef {
  id: string;
  name: string;
}

export interface TreeMap {
  id: string;
  title: string;
  desc?: string;
  props: TreeNodeProp[];
  nodes: TreeNode[];
  repo?: RepoRef | null;
}

export interface NodeViewModel {
  id: string;
  name: string;
  props: TreeNodeProp[];
  data: TreeNode | null; // 根节点为 null
  isRoot: boolean;
  d: number;
  top: number;
  off: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  kids: NodeViewModel[];
  parent: NodeViewModel | null;
  vis: boolean;
}

export interface ViewBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ROOT_ID = 'ROOT';
