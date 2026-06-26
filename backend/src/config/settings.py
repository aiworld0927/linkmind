from pydantic_settings import BaseSettings, SettingsConfigDict
import os

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


class Settings(BaseSettings):
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    model_config = SettingsConfigDict(env_file=env_path, extra="ignore")


settings = Settings()