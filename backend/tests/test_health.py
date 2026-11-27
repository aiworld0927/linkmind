"""健康检查契约测试。"""


async def test_health(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 200
    assert body["data"]["status"] == "healthy"


async def test_health_postgres(client):
    r = await client.get("/api/v1/health/postgres")
    assert r.status_code == 200
    assert r.json()["data"]["connected"] is True
