"""
Alembic environment configuration for Customer Hierarchy Service
"""
import asyncio
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from sqlalchemy.ext.asyncio import AsyncEngine
from alembic import context

# Add app directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import your models for autogenerate
from app.models.base import Base
from app.models.customer_group import CustomerGroup
from app.models.customer_company import CustomerCompany
from app.models.customer_location import CustomerLocation
from app.models.business_unit import BusinessUnit
from app.models.migration_log import CustomerMigrationLog
from app.core.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Use a dedicated version table so各服務的 migration 狀態互不干擾。
VERSION_TABLE = "alembic_version_customer_hierarchy"

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_url():
    """Get database URL from environment or config"""
    # Use sync URL for Alembic
    url = settings.database_url_sync
    
    # If no sync URL configured, convert from async URL
    if not url:
        url = settings.database_url_async.replace("+asyncpg", "+psycopg2")
    
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        render_as_batch=True,
        version_table=VERSION_TABLE,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """Run migrations with the given connection"""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        render_as_batch=True,
        include_schemas=True,
        version_table=VERSION_TABLE,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    """In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    from sqlalchemy.ext.asyncio import create_async_engine
    
    connectable = create_async_engine(
        settings.database_url_async,
        poolclass=pool.NullPool,
        echo=settings.database_echo
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    
    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    # For online mode, we can use either sync or async approach
    # Using sync approach for Alembic compatibility
    
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
