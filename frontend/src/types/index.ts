export interface NotePayload {
  c: string;
  t: string[];
  r: string;
}

export interface TreeNodeProp {
  /** 后端稳定的属性主键（uuid）；前端本地种子数据可缺省，接入后端后由接口回填 */
  prop_id?: string;
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
  /** C-1 列表聚合计数（未加载整树时由后端提供） */
  node_count?: number;
  prop_count?: number;
  /** 是否已从服务端加载整棵树；false 表示仅有列表摘要 */
  loaded?: boolean;
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
