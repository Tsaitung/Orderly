from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.modules._unified_metadata import unified_metadata
from app.modules.users.core.config import settings

config = context.config
# Alembic stores sqlalchemy.url in a ConfigParser, which treats `%` as
# interpolation syntax. A URL-encoded password (special chars like / + = ->
# %2F %2B %3D) would raise "invalid interpolation syntax". Escape `%` -> `%%`
# so ConfigParser stores it literally; get_main_option/get_section un-escape it
# back to the real URL-encoded string, which SQLAlchemy then decodes correctly.
config.set_main_option("sqlalchemy.url", settings.get_database_url_sync().replace("%", "%%"))

VERSION_TABLE = "alembic_version_monolith"
target_metadata = unified_metadata

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        version_table=VERSION_TABLE,
        dialect_opts={"paramstyle": "named"},
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
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
