"""全局配置（pydantic-settings），读取 backend/.env。"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# app/core/config.py → parents[2] = backend/
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    # ---- PostgreSQL（主数据存储）----
    DATABASE_URL: str = "postgresql+asyncpg://linkmind:linkmind@localhost:5432/linkmind"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # ---- 知识仓库 ----
    KNOWLEDGE_ROOT: str = "/app/knowledge"
    GIT_AUTHOR_NAME: str = "LinkMind"
    GIT_AUTHOR_EMAIL: str = "linkmind@local"
    GIT_OPERATION_TIMEOUT: int = 60
    GIT_MAX_FILE_BYTES: int = 256 * 1024

    # ---- 鉴权：JWT + 匿名开关（docs/18 决策 3，不新增登录接口）----
    SECRET_KEY: str = "linkmind-dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 120
    ALLOW_ANONYMOUS: bool = True

    # ---- CORS（逗号分隔前端源；"*" 表示全部放行）----
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:8080,http://127.0.0.1:8080"
    )

    # ---- Neo4j（仅健康检查连通性使用，业务不迁移）----
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def cors_origins(self) -> list[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if raw == "*":
            return ["*"]
        return [item.strip() for item in raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
