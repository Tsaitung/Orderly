"""
Configuration management using Pydantic settings
"""
import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    app_name: str = Field(default="Orderly Product Service (FastAPI)")
    app_version: str = Field(default="2.0.0")
    debug: bool = Field(default=False)
    port: int = Field(default=3003)
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
    )
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379")
    
    # JWT
    jwt_secret: str = Field(default="dev-jwt-secret")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expires_in: int = Field(default=30)  # minutes
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"]
    )
    
    # Logging
    log_level: str = Field(default="INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create global settings instance
settings = Settings()