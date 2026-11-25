from pydantic_settings import BaseSettings, SettingsConfigDict
import os

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


class Settings(BaseSettings):
    # ---- Neo4j（派生图索引）----
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

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

    model_config = SettingsConfigDict(env_file=env_path, extra="ignore")


settings = Settings()
