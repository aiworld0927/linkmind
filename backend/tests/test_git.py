"""Git 模块契约测试（A-1～A-12 核心路径；需 git 可用）。"""

import shutil

import pytest

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git 不可用")


@pytest.fixture
def repo_dir(knowledge_root):
    target = knowledge_root / "仓库A"
    target.mkdir()
    (target / "README.md").write_text("# A\n", encoding="utf-8")
    return target


async def test_repo_full_flow(client, repo_dir):
    # A-3 登记并初始化
    r = await client.post(
        "/api/v1/git/repos",
        json={"name": "仓库A", "fs_path": "仓库A", "init": True, "remote_url": None},
    )
    assert r.status_code == 200
    repo = r.json()["data"]
    repo_id = repo["id"]
    assert repo["fs_path"] == "仓库A"
    assert repo["branch"] == "main"

    # A-3 重名拦截
    r = await client.post("/api/v1/git/repos", json={"name": "仓库A", "fs_path": "仓库A"})
    assert r.json()["code"] == 400

    # A-1 列表（包裹结构 {"repos": [...]}）
    r = await client.get("/api/v1/git/repos")
    assert [item["id"] for item in r.json()["data"]["repos"]] == [repo_id]

    # A-2 详情
    r = await client.get(f"/api/v1/git/repos/{repo_id}")
    assert r.json()["data"]["counts"]["total"] >= 0

    # A-5 提交全部变更
    (repo_dir / "README.md").write_text("# A2\n", encoding="utf-8")
    r = await client.post(
        f"/api/v1/git/repos/{repo_id}/commit", json={"message": "更新", "paths": None, "all": True}
    )
    assert r.json()["msg"] == "提交完成"

    # A-5 参数校验：无目标文件
    r = await client.post(f"/api/v1/git/repos/{repo_id}/commit", json={"message": "x"})
    assert r.json()["code"] == 422

    # A-11 提交历史（分页 Page：初始化 + 更新 共 2 条）
    r = await client.get(f"/api/v1/git/repos/{repo_id}/log", params={"page": 1, "page_size": 1})
    d = r.json()["data"]
    assert d["total"] == 2
    assert len(d["items"]) == 1

    # A-12 动作审计（分页 Page）
    r = await client.get(f"/api/v1/git/repos/{repo_id}/actions")
    d = r.json()["data"]
    assert d["total"] >= 1
    assert d["items"][0]["ok"] is True

    # A-4 移除
    r = await client.delete(f"/api/v1/git/repos/{repo_id}")
    assert r.json()["data"]["removed"] is True

    # A-2 404
    r = await client.get(f"/api/v1/git/repos/{repo_id}")
    assert r.json()["code"] == 404


async def test_repo_path_guard(client, knowledge_root):
    # 越界路径拒绝
    r = await client.post("/api/v1/git/repos", json={"name": "越界", "fs_path": "../x"})
    assert r.json()["code"] == 400
    # 不存在的目录 → 404
    r = await client.post("/api/v1/git/repos", json={"name": "无目录", "fs_path": "没有"})
    assert r.json()["code"] == 404


async def test_merge_actions_without_merge(client, knowledge_root):
    (knowledge_root / "仓库B").mkdir()
    r = await client.post(
        "/api/v1/git/repos", json={"name": "仓库B", "fs_path": "仓库B", "init": True}
    )
    repo_id = r.json()["data"]["id"]
    # A-9 / A-10 无合并时业务报错（400）
    r = await client.post(f"/api/v1/git/repos/{repo_id}/merge/continue")
    assert r.json()["code"] == 400
    r = await client.post(f"/api/v1/git/repos/{repo_id}/merge/abort")
    assert r.json()["code"] == 400
    # 失败动作也写入审计且 ok=False
    r = await client.get(f"/api/v1/git/repos/{repo_id}/actions")
    assert r.json()["data"]["items"][0]["ok"] is False
