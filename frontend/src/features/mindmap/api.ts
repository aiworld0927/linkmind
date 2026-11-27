/**
 * 模块 C/D/E/F：知识地图、节点、属性、笔记的服务端 API。
 * 契约见 docs/15_API接口列表.md。所有写操作均由后端落库，前端只做本地缓存刷新。
 */
import type { NotePayload, TreeNode, TreeNodeProp, TreeMap } from '@/types';
import { json, request } from '@/utils/http';
import type { ApiResult, Page } from '@/utils/http';

/** C-1 列表项（带节点/属性聚合计数） */
export interface MapSummary {
  id: string;
  title: string;
  desc: string;
  node_count: number;
  prop_count: number;
  repo: { id: string; name: string } | null;
}

/** F-1 笔记详情 */
export interface NoteDetail {
  label: string;
  node_path: string;
  content: string;
  tags: string[];
  remark: string;
  doc: boolean;
  doc_path: string | null;
}

export interface ImportMapPayload {
  /** 目录相对 KNOWLEDGE_ROOT 的路径 */
  path: string;
  /** 可选：绑定知识仓库 */
  repo_id?: string;
  title?: string;
  desc?: string;
}

export const mindmapApi = {
  /** C-1 地图列表（分页） */
  listMaps(page = 1, pageSize = 100, keyword?: string): Promise<ApiResult<Page<MapSummary>>> {
    const qs = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (keyword) qs.set('keyword', keyword);
    return request<Page<MapSummary>>(`/maps?${qs.toString()}`);
  },

  /** C-2 创建地图 */
  createMap(title: string, desc = ''): Promise<ApiResult<TreeMap>> {
    return request<TreeMap>('/maps', json('POST', { title, desc }));
  },

  /** C-3 更新地图元信息 */
  updateMap(
    mapId: string,
    patch: { title?: string; desc?: string; repo?: { id: string; name?: string } | null },
  ): Promise<ApiResult<TreeMap>> {
    return request<TreeMap>(`/maps/${mapId}`, json('PUT', patch));
  },

  /** C-4 删除地图（级联） */
  deleteMap(mapId: string): Promise<ApiResult<unknown>> {
    return request<unknown>(`/maps/${mapId}`, json('DELETE'));
  },

  /** C-5 读取整棵树 */
  getTree(mapId: string): Promise<ApiResult<TreeMap>> {
    return request<TreeMap>(`/maps/${mapId}/tree`);
  },

  /** C-6 整树保存（画布批量操作通道） */
  saveTree(mapId: string, nodes: TreeNode[]): Promise<ApiResult<TreeMap>> {
    return request<TreeMap>(`/maps/${mapId}/tree`, json('PUT', { nodes }));
  },

  /** C-7 目录导入（后端扫描并落库） */
  importMap(payload: ImportMapPayload): Promise<ApiResult<TreeMap>> {
    return request<TreeMap>('/maps/import', json('POST', payload));
  },

  /** C-8 导出全部地图 */
  exportMaps(): Promise<ApiResult<unknown>> {
    return request<unknown>('/maps/export');
  },

  /** D-1 新增子节点 */
  createNode(mapId: string, parentId: string, name: string): Promise<ApiResult<TreeNode>> {
    return request<TreeNode>(
      `/maps/${mapId}/nodes`,
      json('POST', { parent_id: parentId, name }),
    );
  },

  /** D-2 重命名节点；nodeId='ROOT' 返回整张地图 */
  renameNode(
    mapId: string,
    nodeId: string,
    name: string,
  ): Promise<ApiResult<TreeNode | TreeMap>> {
    return request<TreeNode | TreeMap>(
      `/maps/${mapId}/nodes/${nodeId}`,
      json('PUT', { name }),
    );
  },

  /** D-3 删除节点 */
  deleteNode(mapId: string, nodeId: string): Promise<ApiResult<unknown>> {
    return request<unknown>(`/maps/${mapId}/nodes/${nodeId}`, json('DELETE'));
  },

  /** E-1 新增属性 */
  createProp(
    mapId: string,
    nodeId: string,
    payload: { label: string; note: NotePayload },
  ): Promise<ApiResult<TreeNodeProp>> {
    return request<TreeNodeProp>(
      `/maps/${mapId}/nodes/${nodeId}/props`,
      json('POST', payload),
    );
  },

  /** E-2 更新属性 */
  updateProp(
    mapId: string,
    nodeId: string,
    propId: string,
    payload: { label: string; note: NotePayload },
  ): Promise<ApiResult<TreeNodeProp>> {
    return request<TreeNodeProp>(
      `/maps/${mapId}/nodes/${nodeId}/props/${propId}`,
      json('PUT', payload),
    );
  },

  /** E-3 删除属性 */
  deleteProp(mapId: string, nodeId: string, propId: string): Promise<ApiResult<unknown>> {
    return request<unknown>(
      `/maps/${mapId}/nodes/${nodeId}/props/${propId}`,
      json('DELETE'),
    );
  },

  /** F-1 读取笔记 */
  getNote(mapId: string, nodeId: string, propId: string): Promise<ApiResult<NoteDetail>> {
    return request<NoteDetail>(`/maps/${mapId}/nodes/${nodeId}/props/${propId}/note`);
  },

  /** F-2 保存笔记（content 全文 + tags/remark） */
  updateNote(
    mapId: string,
    nodeId: string,
    propId: string,
    payload: { content: string; tags?: string[]; remark?: string },
  ): Promise<ApiResult<TreeNodeProp>> {
    return request<TreeNodeProp>(
      `/maps/${mapId}/nodes/${nodeId}/props/${propId}/note`,
      json('PUT', payload),
    );
  },
};
