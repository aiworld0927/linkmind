# LinkMind API 接口文档

## 一、接口概述

LinkMind 知识图谱后端 API 基于 FastAPI 框架构建，提供知识节点管理、关系管理、笔记管理等核心功能的 RESTful 接口。

## 二、基础信息

| 项目 | 值 |
|------|------|
| 协议 | HTTP/HTTPS |
| 基础路径 | `/api` |
| 服务端口 | 8000 |
| API 文档 | http://localhost:8000/docs |
| 健康检查 | GET `/api/health` |

## 三、错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 四、接口列表

### 4.1 健康检查

**路径**: `GET /api/health`

**响应示例**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4.2 节点管理

#### 4.2.1 创建节点

**路径**: `POST /api/nodes`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 节点名称 |
| parent_id | string | 否 | 父节点ID |
| dependencies | string[] | 否 | 依赖节点ID列表 |

**请求示例**:

```json
{
  "name": "人工智能",
  "parent_id": "root",
  "dependencies": ["node-001"]
}
```

**响应示例**:

```json
{
  "id": "node-002",
  "name": "人工智能",
  "parent_id": "root",
  "dependencies": ["node-001"],
  "create_time": "2024-01-15T10:30:00Z",
  "update_time": "2024-01-15T10:30:00Z"
}
```

#### 4.2.2 获取单个节点

**路径**: `GET /api/nodes/{node_id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| node_id | string | 是 | 节点ID |

**响应示例**:

```json
{
  "id": "node-001",
  "name": "机器学习",
  "parent_id": "root",
  "dependencies": [],
  "children": [],
  "create_time": "2024-01-15T10:00:00Z",
  "update_time": "2024-01-15T10:00:00Z"
}
```

#### 4.2.3 获取子节点列表

**路径**: `GET /api/nodes`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| parent_id | string | 否 | 父节点ID，不传则获取根节点 |

**响应示例**:

```json
{
  "nodes": [
    {
      "id": "node-001",
      "name": "机器学习",
      "parent_id": "root",
      "dependencies": [],
      "children_count": 2,
      "create_time": "2024-01-15T10:00:00Z"
    },
    {
      "id": "node-002",
      "name": "深度学习",
      "parent_id": "root",
      "dependencies": ["node-001"],
      "children_count": 1,
      "create_time": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 4.2.4 更新节点

**路径**: `PUT /api/nodes/{node_id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| node_id | string | 是 | 节点ID |

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 节点名称 |
| dependencies | string[] | 否 | 依赖节点ID列表 |

**请求示例**:

```json
{
  "name": "机器学习入门",
  "dependencies": ["node-003"]
}
```

**响应示例**:

```json
{
  "id": "node-001",
  "name": "机器学习入门",
  "parent_id": "root",
  "dependencies": ["node-003"],
  "update_time": "2024-01-15T11:00:00Z"
}
```

#### 4.2.5 删除节点

**路径**: `DELETE /api/nodes/{node_id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| node_id | string | 是 | 节点ID |

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cascade | boolean | 否 | 是否级联删除子节点，默认false |

**响应示例**:

```json
{
  "message": "节点删除成功",
  "deleted_id": "node-001",
  "cascade_deleted": ["child-node-001"]
}
```

### 4.3 关系管理

#### 4.3.1 添加依赖关系

**路径**: `POST /api/relationships`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_id | string | 是 | 源节点ID |
| target_id | string | 是 | 目标节点ID |

**请求示例**:

```json
{
  "source_id": "node-002",
  "target_id": "node-001"
}
```

**响应示例**:

```json
{
  "id": "rel-001",
  "source_id": "node-002",
  "target_id": "node-001",
  "type": "DEPENDS_ON",
  "create_time": "2024-01-15T11:30:00Z"
}
```

#### 4.3.2 删除依赖关系

**路径**: `DELETE /api/relationships`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_id | string | 是 | 源节点ID |
| target_id | string | 是 | 目标节点ID |

**响应示例**:

```json
{
  "message": "关系删除成功"
}
```

#### 4.3.3 检测循环依赖

**路径**: `POST /api/relationships/cycle-check`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_id | string | 是 | 源节点ID |
| target_id | string | 是 | 目标节点ID |

**响应示例**:

```json
{
  "has_cycle": false,
  "path": []
}
```

或存在循环时：

```json
{
  "has_cycle": true,
  "path": ["node-001", "node-002", "node-001"]
}
```

### 4.4 笔记管理

#### 4.4.1 创建笔记

**路径**: `POST /api/notes`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 笔记内容 |
| parent_node_id | string | 是 | 父节点ID |
| tags | string[] | 否 | 标签列表 |
| remark | string | 否 | 备注 |

**请求示例**:

```json
{
  "content": "机器学习是人工智能的分支",
  "parent_node_id": "node-001",
  "tags": ["基础概念", "AI"],
  "remark": "入门笔记"
}
```

**响应示例**:

```json
{
  "id": "note-001",
  "content": "机器学习是人工智能的分支",
  "parent_node_id": "node-001",
  "tags": ["基础概念", "AI"],
  "remark": "入门笔记",
  "create_time": "2024-01-15T12:00:00Z",
  "update_time": "2024-01-15T12:00:00Z"
}
```

#### 4.4.2 获取笔记列表

**路径**: `GET /api/notes`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| parent_node_id | string | 是 | 父节点ID |

**响应示例**:

```json
{
  "notes": [
    {
      "id": "note-001",
      "content": "机器学习是人工智能的分支",
      "parent_node_id": "node-001",
      "tags": ["基础概念", "AI"],
      "remark": "入门笔记",
      "create_time": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 1
}
```

#### 4.4.3 更新笔记

**路径**: `PUT /api/notes/{note_id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| note_id | string | 是 | 笔记ID |

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 否 | 笔记内容 |
| tags | string[] | 否 | 标签列表 |
| remark | string | 否 | 备注 |

**请求示例**:

```json
{
  "content": "机器学习是人工智能的重要分支",
  "tags": ["基础概念", "AI", "更新"]
}
```

**响应示例**:

```json
{
  "id": "note-001",
  "content": "机器学习是人工智能的重要分支",
  "parent_node_id": "node-001",
  "tags": ["基础概念", "AI", "更新"],
  "remark": "入门笔记",
  "update_time": "2024-01-15T12:30:00Z"
}
```

#### 4.4.4 删除笔记

**路径**: `DELETE /api/notes/{note_id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| note_id | string | 是 | 笔记ID |

**响应示例**:

```json
{
  "message": "笔记删除成功",
  "deleted_id": "note-001"
}
```

#### 4.4.5 批量删除笔记

**路径**: `DELETE /api/notes/batch`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| note_ids | string[] | 是 | 笔记ID列表 |

**请求示例**:

```json
{
  "note_ids": ["note-001", "note-002"]
}
```

**响应示例**:

```json
{
  "message": "批量删除成功",
  "deleted_count": 2
}
```

### 4.5 搜索

#### 4.5.1 搜索节点

**路径**: `GET /api/search/nodes`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| limit | integer | 否 | 返回数量限制，默认10 |

**响应示例**:

```json
{
  "nodes": [
    {
      "id": "node-001",
      "name": "机器学习",
      "parent_id": "root",
      "score": 0.95
    }
  ],
  "total": 1
}
```

#### 4.5.2 搜索笔记

**路径**: `GET /api/search/notes`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| limit | integer | 否 | 返回数量限制，默认10 |

**响应示例**:

```json
{
  "notes": [
    {
      "id": "note-001",
      "content": "机器学习是人工智能的分支",
      "parent_node_id": "node-001",
      "score": 0.88
    }
  ],
  "total": 1
}
```

### 4.6 数据导入导出

#### 4.6.1 导出数据

**路径**: `GET /api/export`

**响应示例**:

```json
{
  "version": "1.0",
  "export_time": "2024-01-15T13:00:00Z",
  "nodes": [...],
  "relationships": [...],
  "notes": [...]
}
```

#### 4.6.2 导入数据

**路径**: `POST /api/import`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | object | 是 | 导出的数据对象 |

**响应示例**:

```json
{
  "message": "数据导入成功",
  "imported": {
    "nodes": 10,
    "relationships": 5,
    "notes": 20
  }
}
```

## 五、数据模型

### 5.1 Node

```json
{
  "id": "string",
  "name": "string",
  "parent_id": "string",
  "dependencies": ["string"],
  "create_time": "string (ISO8601)",
  "update_time": "string (ISO8601)"
}
```

### 5.2 Relationship

```json
{
  "id": "string",
  "source_id": "string",
  "target_id": "string",
  "type": "string",
  "create_time": "string (ISO8601)"
}
```

### 5.3 Note

```json
{
  "id": "string",
  "content": "string",
  "parent_node_id": "string",
  "tags": ["string"],
  "remark": "string",
  "create_time": "string (ISO8601)",
  "update_time": "string (ISO8601)"
}
```

## 六、部署配置

### 6.1 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NEO4J_URI | Neo4j连接地址 | bolt://localhost:7687 |
| NEO4J_USER | Neo4j用户名 | neo4j |
| NEO4J_PASSWORD | Neo4j密码 | password |
| APP_PORT | 服务端口 | 8000 |

### 6.2 Docker 部署

```bash
docker run -d --name linkmind-backend \
  -p 8000:8000 \
  -e NEO4J_URI=bolt://neo4j:7687 \
  -e NEO4J_USER=neo4j \
  -e NEO4J_PASSWORD=password \
  linkmind-backend:latest
```
