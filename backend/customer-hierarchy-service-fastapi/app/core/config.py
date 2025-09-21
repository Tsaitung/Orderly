"""
Configuration settings for Customer Hierarchy Service
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Customer Hierarchy Service"
    API_VERSION: str = "1.0.0"
    API_V2_STR: str = "/api/v2"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 3007
    WORKERS: int = 4
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/orderly_hierarchy"
    
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return self.DATABASE_URL
    
    @property
    def database_echo(self) -> bool:
        """Get database echo setting"""
        return self.DATABASE_ECHO
    
    @property
    def database_pool_size(self) -> int:
        """Get database pool size"""
        return self.DATABASE_POOL_SIZE
    
    @property
    def database_max_overflow(self) -> int:
        """Get database max overflow"""
        return self.DATABASE_MAX_OVERFLOW
    
    # Redis
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    REDIS_TTL: int = 300  # 5 minutes default TTL
    
    # Authentication
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8000"]
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1"]
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # Service Discovery
    api_gateway_url: str = "http://localhost:8000"
    user_service_url: str = "http://localhost:3001"
    order_service_url: str = "http://localhost:3002"
    billing_service_url: str = "http://localhost:3005"
    
    # Business Rules
    max_hierarchy_depth: int = 4
    max_locations_per_company: int = 100
    max_units_per_location: int = 50
    default_migration_batch_size: int = 100
    
    # Tax ID Validation
    taiwan_company_tax_id_pattern: str = r"^\d{8}$"
    taiwan_individual_id_pattern: str = r"^[A-Z]\d{9}$"
    
    # Cache Settings
    cache_tree_ttl: int = 600  # 10 minutes for hierarchy trees
    cache_entity_ttl: int = 300  # 5 minutes for individual entities
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
    @property
    def database_url_async(self) -> str:
        """Get async database URL"""
        url = self.database_url
        # Normalize to async form regardless of input
        if url.startswith("postgresql+asyncpg://"):
            return url
        if url.startswith("postgresql+psycopg2://"):
            return "postgresql+asyncpg://" + url.split("postgresql+psycopg2://", 1)[1]
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Fallback: return as-is
        return url
    
    @property
    def database_url_sync(self) -> str:
        """Get sync database URL for Alembic"""
        url = self.database_url
        # Normalize to sync form regardless of input
        if url.startswith("postgresql+psycopg2://"):
            return url
        if url.startswith("postgresql+asyncpg://"):
            return "postgresql+psycopg2://" + url.split("postgresql+asyncpg://", 1)[1]
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        # Fallback: return as-is
        return url


# Global settings instance
settings = Settings()
