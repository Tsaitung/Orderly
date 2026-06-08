"""Refactor auth to social-only login."""

import sqlalchemy as sa
from alembic import op

revision = "0004_auth_refactor_social_only"
down_revision = "0003_acceptance_order_fk"
branch_labels = None
depends_on = None


def _drop_unique_constraint_on_users_email() -> None:
    op.execute(
        """
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT c.conname
      INTO constraint_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN unnest(c.conkey) AS colnum ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = colnum
     WHERE n.nspname = 'public'
       AND t.relname = 'users'
       AND c.contype = 'u'
       AND a.attname = 'email'
     LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;
"""
    )


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'platform_support'")
        op.execute("ALTER TYPE \"UserRole\" ADD VALUE IF NOT EXISTS 'super_admin'")

    _drop_unique_constraint_on_users_email()
    op.execute('ALTER TABLE users ALTER COLUMN email DROP NOT NULL')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS "passwordResetToken"')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS "passwordResetExpires"')
    op.execute('UPDATE users SET "mfaMethod" = NULL WHERE lower(coalesce("mfaMethod", \'\')) = \'email\'')

    op.execute("DROP TABLE IF EXISTS password_history")
    op.execute(
        """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM oauth_links
         GROUP BY provider, "providerUserId"
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate oauth_links provider/providerUserId rows must be resolved before auth 0004';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'oauth_links'::regclass
           AND conname = 'uq_oauth_links_provider_provider_user_id'
    ) THEN
        ALTER TABLE oauth_links
            ADD CONSTRAINT uq_oauth_links_provider_provider_user_id
            UNIQUE (provider, "providerUserId");
    END IF;
END $$;
"""
    )

    op.execute(
        """
CREATE TABLE IF NOT EXISTS platform_provisioning (
    id varchar PRIMARY KEY,
    provider varchar(20) NOT NULL,
    "externalId" varchar NOT NULL,
    "userId" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "requireMfa" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT now()
)
"""
    )
    op.execute(
        """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'platform_provisioning'::regclass
           AND conname = 'uq_platform_provisioning_provider_external'
    ) THEN
        ALTER TABLE platform_provisioning
            ADD CONSTRAINT uq_platform_provisioning_provider_external
            UNIQUE (provider, "externalId");
    END IF;
END $$;
"""
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_platform_provisioning_provider ON platform_provisioning (provider)")
    op.execute(
        'CREATE INDEX IF NOT EXISTS "ix_platform_provisioning_externalId" '
        'ON platform_provisioning ("externalId")'
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS "ix_platform_provisioning_userId" '
        'ON platform_provisioning ("userId")'
    )


def downgrade() -> None:
    op.execute("ALTER TABLE oauth_links DROP CONSTRAINT IF EXISTS uq_oauth_links_provider_provider_user_id")
    op.execute('DROP INDEX IF EXISTS "ix_platform_provisioning_userId"')
    op.execute('DROP INDEX IF EXISTS "ix_platform_provisioning_externalId"')
    op.execute("DROP INDEX IF EXISTS ix_platform_provisioning_provider")
    op.execute("DROP TABLE IF EXISTS platform_provisioning")

    op.add_column("users", sa.Column("passwordResetExpires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("passwordResetToken", sa.String(), nullable=True))
    op.create_unique_constraint("users_passwordResetToken_key", "users", ["passwordResetToken"])

    # Downgrading email to NOT NULL/unique is unsafe if social-only rows already
    # contain null or duplicate billing emails. Keep the relaxed constraint.
    op.execute(
        """
CREATE TABLE IF NOT EXISTS password_history (
    id varchar PRIMARY KEY,
    "userId" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "passwordHash" varchar NOT NULL,
    "changedAt" timestamptz NOT NULL DEFAULT now(),
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
)
"""
    )
