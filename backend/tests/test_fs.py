"""FS 模块契约测试（B-1/B-2/F-3 + 路径越权拦截）。"""

import pytest

pytestmark = pytest.mark.usefixtures("knowledge_root")


async def test_dirs_listing(client):
    r = await client.get("/api/v1/fs/dirs", params={"path": ""})
    assert r.status_code == 200
    d = r.json()["data"]
    # 存量契约：camelCase 字段 + parent null 表示根目录
    assert d["rootName"] == "知识库"
    assert d["parent"] is None
    names = {item["name"] for item in d["dirs"]}
    assert names == {"产品研发"}
    product = d["dirs"][0]
    assert product["hasChildren"] is True
    assert product["mdCount"] == 1


async def test_dirs_traversal_blocked(client):
    r = await client.get("/api/v1/fs/dirs", params={"path": "../"})
    assert r.json()["code"] == 403


async def test_dirs_missing(client):
    r = await client.get("/api/v1/fs/dirs", params={"path": "不存在"})
    assert r.json()["code"] == 404


async def test_tree_with_doc_props(client):
    r = await client.get("/api/v1/fs/tree", params={"path": "产品研发"})
    d = r.json()["data"]
    assert d["name"] == "产品研发"
    prop = d["props"][0]
    assert prop["label"] == "需求"
    assert prop["doc"] is True
    assert prop["content"].startswith("# 需求")
    assert prop["truncated"] is False
    assert prop["content_length"] > 0
    assert d["children"][0]["name"] == "架构"


async def test_doc_content(client):
    r = await client.get("/api/v1/docs/content", params={"path": "产品研发/需求.md"})
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["name"] == "需求.md"
    assert d["content"].startswith("# 需求")


async def test_doc_content_traversal_blocked(client):
    r = await client.get("/api/v1/docs/content", params={"path": "../../etc/passwd"})
    assert r.json()["code"] == 403
