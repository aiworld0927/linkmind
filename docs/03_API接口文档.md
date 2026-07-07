# LinkMind API 接口文档

## 一、基础信息

### 1.1 服务地址

| 环境 | 地址 |
|------|------|
| 开发 | http://{服务器IP}:8000 |
| 测试 | http://{服务器IP}:8000 |
| 生产 | http://{服务器域名或IP}:8000 |

> **说明**：将 `{服务器IP}` 替换为实际的服务器IP地址，例如 `192.168.1.100`

### 1.2 统一响应格式

所有接口返回统一格式：

```json
{
    "code": 200,
    "msg": "success",
    "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | Integer | 状态码，200表示成功，其他表示失败 |
| msg | String | 提示信息 |
| data | Object | 返回数据 |

### 1.3 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

## 二、健康检查

### 2.1 健康状态

**GET** `/api/v1/health`

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "status": "healthy",
        "neo4j": "connected"
    }
}
```

## 三、笔记管理

### 3.1 创建笔记

**POST** `/api/v1/notes/`

**请求体：**

```json
{
    "title": "笔记标题",
    "content": "笔记内容"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | String | 是 | 笔记标题 |
| content | String | 是 | 笔记内容 |

**响应示例：**

```json
{
    "code": 200,
    "msg": "Note created successfully",
    "data": {
        "id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "title": "笔记标题",
        "content": "笔记内容",
        "hash": "abc123...",
        "created_at": "2024-01-01T12:00:00",
        "updated_at": "2024-01-01T12:00:00"
    }
}
```

### 3.2 获取笔记

**GET** `/api/v1/notes/{note_id}`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| note_id | String | 笔记ID |

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "title": "笔记标题",
        "content": "笔记内容",
        "community_id": 0,
        "type": "note",
        "degree": 2
    }
}
```

### 3.3 更新笔记

**PUT** `/api/v1/notes/{note_id}`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| note_id | String | 笔记ID |

**请求体：**

```json
{
    "title": "新标题",
    "content": "新内容"
}
```

**响应示例：**

```json
{
    "code": 200,
    "msg": "Note updated successfully",
    "data": {
        "id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "title": "新标题",
        "content": "新内容",
        "updated_at": "2024-01-01T12:30:00"
    }
}
```

### 3.4 删除笔记

**DELETE** `/api/v1/notes/{note_id}`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| note_id | String | 笔记ID |

**响应示例：**

```json
{
    "code": 200,
    "msg": "Note deleted successfully",
    "data": null
}
```

### 3.5 列出所有笔记

**GET** `/api/v1/notes/`

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "notes": [
            {
                "id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
                "title": "笔记标题",
                "content": "笔记内容",
                "degree": 2
            }
        ],
        "total": 1
    }
}
```

## 四、关系管理

### 4.1 创建关系

**POST** `/api/v1/links/`

**请求体：**

```json
{
    "source_id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
    "target_id": "734d33b0-7904-411d-92bd-fc992740d3dd"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_id | String | 是 | 源节点ID |
| target_id | String | 是 | 目标节点ID |

**响应示例：**

```json
{
    "code": 200,
    "msg": "Link created successfully",
    "data": {
        "id": "2ba106c4-a1e0-4a05-b0cf-e10153a72066",
        "source": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "target": "734d33b0-7904-411d-92bd-fc992740d3dd",
        "weight": 1,
        "created_at": "2024-01-01T12:00:00"
    }
}
```

### 4.2 获取关系

**GET** `/api/v1/links/{link_id}`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| link_id | String | 关系ID |

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "id": "2ba106c4-a1e0-4a05-b0cf-e10153a72066",
        "source": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "target": "734d33b0-7904-411d-92bd-fc992740d3dd",
        "weight": 1,
        "description": ""
    }
}
```

### 4.3 更新关系

**PUT** `/api/v1/links/{link_id}`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| link_id | String | 关系ID |

**请求体：**

```json
{
    "source_id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
    "target_id": "cc9e4173-11b6-4614-be3d-dbc702f22420"
}
```

**响应示例：**

```json
{
    "code": 200,
    "msg": "Link updated successfully",
    "data": {
        "id": "2ba106c4-a1e0-4a05-b0cf-e10153a72066",
        "source": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "target": "cc9e4173-11b6-4614-be3d-dbc702f22420"
    }
}
```

### 4.4 删除关系

**DELETE** `/api/v1/links/{link_id}`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| link_id | String | 关系ID |

**响应示例：**

```json
{
    "code": 200,
    "msg": "Link deleted successfully",
    "data": null
}
```

### 4.5 列出所有关系

**GET** `/api/v1/links/`

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "links": [
            {
                "id": "2ba106c4-a1e0-4a05-b0cf-e10153a72066",
                "source": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
                "target": "734d33b0-7904-411d-92bd-fc992740d3dd",
                "weight": 1
            }
        ],
        "total": 1
    }
}
```

## 五、图谱查询

### 5.1 获取全量图谱

**GET** `/api/v1/graph/`

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | Integer | 否 | None | 返回节点数量限制（1-500） |

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "nodes": [
            {
                "id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
                "title": "笔记标题",
                "content": "笔记内容",
                "community_id": 0,
                "type": "note",
                "degree": 2
            }
        ],
        "links": [
            {
                "id": "2ba106c4-a1e0-4a05-b0cf-e10153a72066",
                "source": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
                "target": "734d33b0-7904-411d-92bd-fc992740d3dd",
                "weight": 1
            }
        ],
        "total_nodes": 4,
        "total_links": 4,
        "has_more": false
    }
}
```

## 六、节点展开

### 6.1 展开邻居节点

**GET** `/api/v1/expand/neighborhood`

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| node_id | String | 是 | - | 中心节点ID |
| depth | Integer | 否 | 1 | 展开深度（1-3） |
| type_filter | String | 否 | None | 节点类型筛选 |

**POST** `/api/v1/expand/neighborhood`

**请求体：**

```json
{
    "node_id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
    "depth": 2,
    "type_filter": "note"
}
```

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "center_id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "nodes": [
            {
                "id": "734d33b0-7904-411d-92bd-fc992740d3dd",
                "title": "相关笔记",
                "degree": 2,
                "distance": 1
            }
        ],
        "links": [
            {
                "id": "2ba106c4-a1e0-4a05-b0cf-e10153a72066",
                "source": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
                "target": "734d33b0-7904-411d-92bd-fc992740d3dd"
            }
        ],
        "total_nodes": 3,
        "total_links": 2,
        "depth": 1
    }
}
```

### 6.2 路径查询

**GET** `/api/v1/expand/path`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source_id | String | 是 | 源节点ID |
| target_id | String | 是 | 目标节点ID |

**POST** `/api/v1/expand/path`

**请求体：**

```json
{
    "source_id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
    "target_id": "cc9e4173-11b6-4614-be3d-dbc702f22420"
}
```

**响应示例（找到路径）：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "found": true,
        "source_id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
        "target_id": "cc9e4173-11b6-4614-be3d-dbc702f22420",
        "nodes": [
            { "id": "...", "title": "节点1" },
            { "id": "...", "title": "节点2" },
            { "id": "...", "title": "节点3" }
        ],
        "links": [
            { "source": "...", "target": "...", "weight": 1 },
            { "source": "...", "target": "...", "weight": 1 }
        ],
        "path_length": 2,
        "message": "Path found successfully"
    }
}
```

**响应示例（未找到路径）：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "found": false,
        "message": "No path found between nodes"
    }
}
```

## 七、搜索与筛选

### 7.1 全文搜索

**GET** `/api/v1/search/fulltext`

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | String | 是 | - | 搜索关键词 |
| limit | Integer | 否 | 20 | 返回结果数量（1-100） |

**POST** `/api/v1/search/fulltext`

**请求体：**

```json
{
    "keyword": "机器学习",
    "limit": 10
}
```

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "results": [
            {
                "id": "27817ca0-cf9b-4c30-b242-0875beeaaeba",
                "title": "机器学习入门",
                "score": 0.95,
                "degree": 5
            }
        ],
        "total": 1
    }
}
```

### 7.2 多条件筛选

**GET** `/api/v1/search/filter`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type_filter | String | 否 | 节点类型筛选 |
| tag_filter | String | 否 | 标签筛选 |
| days_filter | Integer | 否 | 时间范围（天数） |
| min_degree | Integer | 否 | 最小度数 |
| max_degree | Integer | 否 | 最大度数 |

**POST** `/api/v1/search/filter`

**请求体：**

```json
{
    "type_filter": "note",
    "days_filter": 7,
    "min_degree": 1,
    "max_degree": 10
}
```

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "nodes": [...],
        "links": [...],
        "total_nodes": 10,
        "total_links": 15
    }
}
```

### 7.3 错题复盘

**GET** `/api/v1/search/review/errors`

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "results": [
            {
                "id": "...",
                "title": "错题笔记",
                "degree": 3
            }
        ],
        "total": 5,
        "type": "errors"
    }
}
```

### 7.4 高权重复盘

**GET** `/api/v1/search/review/high-weight`

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| min_weight | Float | 否 | 2.0 | 最小权重值 |

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "results": [
            {
                "id": "...",
                "title": "核心概念",
                "degree": 10
            }
        ],
        "total": 3,
        "type": "high_weight"
    }
}
```

### 7.5 近七日复盘

**GET** `/api/v1/search/review/recent`

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| days | Integer | 否 | 7 | 天数范围（1-365） |

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "results": [
            {
                "id": "...",
                "title": "最近更新的笔记",
                "degree": 2
            }
        ],
        "total": 8,
        "type": "recent",
        "days": 7
    }
}
```

## 八、社区聚类

### 8.1 触发聚类

**POST** `/api/v1/cluster/louvain`

**说明：** 运行Louvain社区检测算法，重新聚类并更新所有节点的community_id字段

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "success": true,
        "message": "聚类完成，共发现 2 个社区",
        "community_count": 2,
        "updated_count": 4,
        "statistics": {
            "communities": [
                { "community": 0, "count": 2 },
                { "community": 1, "count": 2 }
            ],
            "total_nodes": 4,
            "total_edges": 4,
            "community_count": 2
        }
    }
}
```

### 8.2 获取聚类统计

**GET** `/api/v1/cluster/statistics`

**响应示例：**

```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "communities": [
            { "community": 0, "count": 2 },
            { "community": 1, "count": 2 }
        ],
        "total_nodes": 4,
        "total_edges": 4,
        "community_count": 2
    }
}
```

## 九、数据导入

### 9.1 Markdown批量导入

**POST** `/api/v1/import/markdown`

**请求体：**

```json
{
    "file_paths": [
        "/path/to/file1.md",
        "/path/to/directory/"
    ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file_paths | List[String] | 是 | 文件或目录路径列表 |

**响应示例：**

```json
{
    "code": 200,
    "msg": "Import completed",
    "data": {
        "created": 2,
        "duplicated": 1,
        "failed": 0,
        "total": 3
    }
}
```

## 十、前端页面

### 10.1 前端可视化页面

**GET** `/frontend`

**说明：** 返回知识图谱可视化前端页面

## 十一、API文档

### 11.1 Swagger UI

**GET** `/docs`

**说明：** 交互式API文档界面

### 11.2 ReDoc

**GET** `/redoc`

**说明：** 另一种API文档展示方式

## 十二、使用示例

### 12.1 使用 curl

```bash
# 获取图谱数据
curl http://localhost:8000/api/v1/graph/

# 创建笔记
curl -X POST http://localhost:8000/api/v1/notes/ \
  -H "Content-Type: application/json" \
  -d '{"title":"测试笔记","content":"测试内容"}'

# 创建关系
curl -X POST http://localhost:8000/api/v1/links/ \
  -H "Content-Type: application/json" \
  -d '{"source_id":"node1","target_id":"node2"}'

# 全文搜索
curl "http://localhost:8000/api/v1/search/fulltext?keyword=机器学习"

# 触发聚类
curl -X POST http://localhost:8000/api/v1/cluster/louvain

# 路径查询
curl "http://localhost:8000/api/v1/expand/path?source_id=node1&target_id=node2"
```

### 12.2 使用 Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# 获取图谱数据
response = requests.get(f"{BASE_URL}/graph/")
data = response.json()
print(data["data"]["nodes"])

# 创建笔记
response = requests.post(
    f"{BASE_URL}/notes/",
    json={"title": "测试笔记", "content": "测试内容"}
)
print(response.json())

# 全文搜索
response = requests.get(
    f"{BASE_URL}/search/fulltext",
    params={"keyword": "机器学习"}
)
print(response.json())
```

### 12.3 使用 JavaScript

```javascript
const BASE_URL = 'http://localhost:8000/api/v1';

// 获取图谱数据
async function fetchGraph() {
    const response = await fetch(`${BASE_URL}/graph/`);
    const data = await response.json();
    return data.data;
}

// 创建笔记
async function createNote(title, content) {
    const response = await fetch(`${BASE_URL}/notes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
    });
    return response.json();
}

// 触发聚类
async function runClustering() {
    const response = await fetch(`${BASE_URL}/cluster/louvain`, {
        method: 'POST'
    });
    return response.json();
}
```
