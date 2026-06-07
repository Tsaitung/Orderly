import os
import sys
from pathlib import Path
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure /Users/leeyude/Projects/Orderly/backend is on sys.path so that
# "import app.modules.billing..." resolves when running from that cwd.
_backend_root = str(Path(__file__).parents[4])
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

config = context.config

# Allow DATABASE_URL env var to override the ini placeholder.
_db_url = os.environ.get("DATABASE_URL")
if _db_url:
    # Alembic engine_from_config expects a sync URL; swap asyncpg driver.
    _sync_url = _db_url.replace("postgresql+asyncpg://", "postgresql://")
    config.set_main_option("sqlalchemy.url", _sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.modules.billing.models.base import Base  # noqa
from app.modules.billing.models.enums import ReconciliationStatus, DiscrepancyType  # noqa
from app.modules.billing.models.reconciliation import Reconciliation, ReconciliationItem, BillingPeriod, FeeConfig  # noqa

target_metadata = Base.metadata

VERSION_TABLE = "alembic_version_billing"


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
