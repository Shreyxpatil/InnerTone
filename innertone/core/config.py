from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "InnerTone"
    DATABASE_URL: str
    GEMINI_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    
    # Vector DB settings
    EMBEDDING_MODEL_NAME: str = "models/gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768  # Default for Gemini text-embedding-004
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

@lru_cache()
def get_settings() -> Settings:
    return Settings()
