export interface ListItem {
  id: string;
  content: string;
  tagList: string[];
  remark: string;
  createTime: string;
  parentNodeId: string;
}

export interface NodeItem {
  id: string;
  name: string;
  dependencies: string[];
  children: ListItem[];
  isExpanded: boolean;
  displayMode: 'inner' | 'popover' | 'drawer';
  createTime: string;
}

export interface BreadItem {
  id: string;
  name: string;
}

export interface CanvasViewState {
  zoom: number;
  x: number;
  y: number;
}

export type DisplayMode = 'inner' | 'popover' | 'drawer';
