import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.models.base import Base  # noqa
from app.models.acceptance import Acceptance, AcceptanceItem  # noqa

target_metadata = Base.metadata

# Service-specific alembic version table，避免與其他服務衝突。
VERSION_TABLE = "alembic_version_acceptance"


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table=VERSION_TABLE,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Use unified configuration system for database URL
    import sys
    from pathlib import Path
    
    # Add parent directory to path to import app modules
    sys.path.insert(0, str(Path(__file__).parent.parent))
    
    try:
        from app.core.config import settings
        database_url = settings.get_database_url_sync()
    except ImportError:
        # Fallback to environment variable if unified config not available
        database_url = os.getenv("DATABASE_URL")
        if database_url and database_url.startswith("postgresql+asyncpg://"):
            database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    if database_url:
        connectable = create_engine(database_url, poolclass=pool.NullPool)
    else:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table=VERSION_TABLE,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
