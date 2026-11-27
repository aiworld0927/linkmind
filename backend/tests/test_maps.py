"""知识地图模块 C 契约与业务规则测试（C-1～C-8）。"""

from uuid import uuid4


def _tree_node(name, children=None, props=None):
    return {
        "name": name,
        "props": props or [],
        "children": children or [],
    }


async def test_map_crud_and_pagination(client, map_id):
    # C-2 重名拦截
    r = await client.post("/api/v1/maps", json={"title": "测试地图"})
    assert r.json()["code"] == 400

    # C-1 列表 + keyword + 分页
    r = await client.get("/api/v1/maps", params={"keyword": "测试", "page": 1, "page_size": 10})
    d = r.json()["data"]
    assert d["total"] == 1
    assert d["items"][0]["node_count"] == 0

    # C-3 更新
    r = await client.put(f"/api/v1/maps/{map_id}", json={"desc": "新描述"})
    assert r.json()["data"]["desc"] == "新描述"

    # C-3 绑定不存在的仓库
    r = await client.put(f"/api/v1/maps/{map_id}", json={"repo": {"id": str(uuid4())}})
    assert r.json()["code"] == 404

    # C-4 删除后再取 → 404
    r = await client.delete(f"/api/v1/maps/{map_id}")
    assert r.json()["data"]["removed"] is True
    r = await client.get(f"/api/v1/maps/{map_id}/tree")
    assert r.json()["code"] == 404


async def test_tree_roundtrip(client, map_id):
    node_id = str(uuid4())
    prop_id = str(uuid4())
    nodes = [
        {
            "id": node_id,
            "name": "前端",
            "props": [
                {
                    "prop_id": prop_id,
                    "label": "选型",
                    "note": {"c": "React", "t": ["技术"], "r": "备注"},
                }
            ],
            "children": [_tree_node("组件")],
        },
        _tree_node("后端"),
    ]

    # C-6 整树保存
    r = await client.put(f"/api/v1/maps/{map_id}/tree", json={"nodes": nodes})
    d = r.json()["data"]
    assert len(d["nodes"]) == 2
    assert d["nodes"][0]["id"] == node_id
    assert d["nodes"][0]["children"][0]["name"] == "组件"
    assert d["nodes"][0]["props"][0]["prop_id"] == prop_id

    # C-5 读回一致
    r = await client.get(f"/api/v1/maps/{map_id}/tree")
    assert r.json()["data"]["nodes"][0]["id"] == node_id

    # C-6 同级重名拦截
    r = await client.put(
        f"/api/v1/maps/{map_id}/tree",
        json={"nodes": [_tree_node("前端"), _tree_node("前端")]},
    )
    assert r.json()["code"] == 400

    # 再次保存：保留传入 id（幂等）
    r = await client.put(
        f"/api/v1/maps/{map_id}/tree",
        json={"nodes": [{"id": node_id, "name": "前端", "props": [], "children": []}]},
    )
    assert r.json()["data"]["nodes"][0]["id"] == node_id


async def test_map_level_props_isolated(client, map_id):
    # 地图级属性（ROOT）在整树保存后保持不变
    r = await client.post(
        f"/api/v1/maps/{map_id}/nodes/ROOT/props",
        json={"label": "根属性", "note": {"c": "", "t": [], "r": ""}},
    )
    assert r.status_code == 200

    r = await client.put(f"/api/v1/maps/{map_id}/tree", json={"nodes": [_tree_node("n1")]})
    d = r.json()["data"]
    assert len(d["props"]) == 1 and d["props"][0]["label"] == "根属性"
    assert len(d["nodes"]) == 1


async def test_import_from_fs_and_duplicate(client, knowledge_root):
    # C-7 目录导入（fs/tree → 树落库）
    r = await client.post("/api/v1/maps/import", json={"path": "产品研发"})
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["title"] == "产品研发"
    assert d["nodes"][0]["name"] == "产品研发"
    doc_props = [p for p in d["nodes"][0]["props"] if p["doc"]]
    assert doc_props and doc_props[0]["path"] == "产品研发/需求.md"

    # 同名地图拒绝重复导入
    r = await client.post("/api/v1/maps/import", json={"path": "产品研发"})
    assert r.json()["code"] == 400

    # 直接提交 TreeMap
    r = await client.post(
        "/api/v1/maps/import",
        json={"title": "直传地图", "nodes": [_tree_node("n1")]},
    )
    assert r.json()["data"]["title"] == "直传地图"

    # 缺少来源 → 422
    r = await client.post("/api/v1/maps/import", json={})
    assert r.json()["code"] == 422


async def test_export_maps(client, map_id):
    r = await client.get("/api/v1/maps/export")
    d = r.json()["data"]
    assert d["app"] == "linkmind"
    assert d["version"] == 1
    assert "exportedAt" in d
    assert len(d["maps"]) == 1
    assert d["maps"][0]["id"] == map_id


async def test_validation_error(client):
    r = await client.post("/api/v1/maps", json={"title": ""})
    assert r.json()["code"] == 422
