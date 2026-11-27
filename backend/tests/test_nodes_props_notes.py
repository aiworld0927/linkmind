"""模块 D/E/F 契约与业务规则测试（节点/属性/笔记，含 'ROOT' 语义）。"""

from uuid import uuid4


async def _add_node(client, map_id, parent_id, name):
    r = await client.post(
        f"/api/v1/maps/{map_id}/nodes", json={"parent_id": parent_id, "name": name}
    )
    assert r.status_code == 200
    return r.json()["data"]


async def _add_prop(client, map_id, node_id, label="属性A", c="内容"):
    r = await client.post(
        f"/api/v1/maps/{map_id}/nodes/{node_id}/props",
        json={"label": label, "note": {"c": c, "t": ["x"], "r": "备注"}},
    )
    assert r.status_code == 200
    return r.json()["data"]


async def test_node_flow(client, map_id):
    # D-1 挂根级
    node = await _add_node(client, map_id, "ROOT", "章节1")
    node_id = node["id"]
    assert node["children"] == []

    # D-1 同级重名 → 400
    r = await client.post(
        f"/api/v1/maps/{map_id}/nodes", json={"parent_id": "ROOT", "name": "章节1"}
    )
    assert r.json()["code"] == 400

    # D-1 子节点 + 排序
    child = await _add_node(client, map_id, node_id, "子节")
    second = await _add_node(client, map_id, "ROOT", "章节2")

    # C-5 树验证层级与顺序
    r = await client.get(f"/api/v1/maps/{map_id}/tree")
    nodes = r.json()["data"]["nodes"]
    assert [n["name"] for n in nodes] == ["章节1", "章节2"]
    assert nodes[0]["children"][0]["id"] == child["id"]

    # D-2 重命名 ROOT → 地图标题（返回 TreeMap）
    r = await client.put(f"/api/v1/maps/{map_id}/nodes/ROOT", json={"name": "新标题"})
    assert r.json()["data"]["title"] == "新标题"

    # D-2 重命名节点
    r = await client.put(f"/api/v1/maps/{map_id}/nodes/{node_id}", json={"name": "章节1改"})
    assert r.json()["data"]["name"] == "章节1改"

    # D-3 ROOT 不可删除
    r = await client.delete(f"/api/v1/maps/{map_id}/nodes/ROOT")
    assert r.json()["code"] == 400

    # D-3 删除节点（级联子节点）
    r = await client.delete(f"/api/v1/maps/{map_id}/nodes/{node_id}")
    assert r.json()["data"]["removed"] is True
    r = await client.get(f"/api/v1/maps/{map_id}/tree")
    names = [n["name"] for n in r.json()["data"]["nodes"]]
    assert names == ["章节2"]
    assert second["id"] in {n["id"] for n in r.json()["data"]["nodes"]}

    # 非法 parent_id → 422
    r = await client.post(
        f"/api/v1/maps/{map_id}/nodes", json={"parent_id": "not-a-uuid", "name": "x"}
    )
    assert r.json()["code"] == 422


async def test_prop_flow(client, map_id):
    node = await _add_node(client, map_id, "ROOT", "节点N")
    node_id = node["id"]

    # E-1 节点属性
    prop = await _add_prop(client, map_id, node_id)
    prop_id = prop["prop_id"]
    assert prop["note"]["c"] == "内容"

    # E-1 地图级属性（ROOT）
    root_prop = await _add_prop(client, map_id, "ROOT", label="根属性")
    assert root_prop["doc"] is False

    # E-2 编辑
    r = await client.put(
        f"/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}",
        json={"label": "属性A2", "note": {"c": "内容2", "t": [], "r": ""}},
    )
    assert r.json()["data"]["note"]["c"] == "内容2"

    # 属性跨上下文 → 404
    r = await client.put(
        f"/api/v1/maps/{map_id}/nodes/ROOT/props/{prop_id}",
        json={"label": "x", "note": {"c": "", "t": [], "r": ""}},
    )
    assert r.json()["code"] == 404

    # E-3 删除
    r = await client.delete(f"/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}")
    assert r.json()["data"]["removed"] is True
    r = await client.get(f"/api/v1/maps/{map_id}/nodes/{node_id}/props/{prop_id}/note")
    assert r.json()["code"] == 404


async def test_note_flow(client, map_id):
    parent = await _add_node(client, map_id, "ROOT", "父节点")
    child = await _add_node(client, map_id, parent["id"], "子节点")
    prop = await _add_prop(client, map_id, child["id"], c="v1")

    # F-1 读取：node_path 层级路径
    r = await client.get(
        f"/api/v1/maps/{map_id}/nodes/{child['id']}/props/{prop['prop_id']}/note"
    )
    d = r.json()["data"]
    assert d["content"] == "v1"
    assert d["node_path"] == "测试地图 > 父节点 > 子节点"
    assert d["doc"] is False

    # F-1 地图级属性 node_path = 地图标题
    root_prop = await _add_prop(client, map_id, "ROOT")
    r = await client.get(
        f"/api/v1/maps/{map_id}/nodes/ROOT/props/{root_prop['prop_id']}/note"
    )
    assert r.json()["data"]["node_path"] == "测试地图"

    # F-2 保存（tags/remark 缺省保持原值）
    r = await client.put(
        f"/api/v1/maps/{map_id}/nodes/{child['id']}/props/{prop['prop_id']}/note",
        json={"content": "# 新笔记"},
    )
    d = r.json()["data"]
    assert d["note"]["c"] == "# 新笔记"
    assert d["note"]["t"] == ["x"]  # 缺省保持
    assert d["note"]["r"] == "备注"

    # F-2 显式覆盖
    r = await client.put(
        f"/api/v1/maps/{map_id}/nodes/{child['id']}/props/{prop['prop_id']}/note",
        json={"content": "# 全量", "tags": ["a", "b"], "remark": "r1"},
    )
    d = r.json()["data"]
    assert d["note"]["t"] == ["a", "b"] and d["note"]["r"] == "r1"


async def test_node_id_not_found(client, map_id):
    r = await client.put(f"/api/v1/maps/{map_id}/nodes/{uuid4()}", json={"name": "x"})
    assert r.json()["code"] == 404
