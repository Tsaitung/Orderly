"""Add tenant and security fields to users

Revision ID: 004_user_tenant_security_fields
Revises: 003_add_missing_fields
Create Date: 2025-12-07 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_user_tenant_security_fields"
down_revision: Union[str, None] = "003_add_missing_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("tenantId", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("tenantType", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("permissions", sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("status", sa.String(), server_default="active", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("mfaEnabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("mfaSecret", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("displayName", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("locale", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("timezone", sa.String(), nullable=True),
    )

    # 回填既有資料
    op.execute('UPDATE users SET "tenantId" = "organizationId" WHERE "tenantId" IS NULL')
    op.execute(
        'UPDATE users u SET "tenantType" = o.type FROM organizations o WHERE u."tenantId" = o.id'
    )
    op.execute('UPDATE users SET permissions = \'[]\'::json WHERE permissions IS NULL')
    op.execute('UPDATE users SET status = \'active\' WHERE status IS NULL')
    op.execute('UPDATE users SET "mfaEnabled" = false WHERE "mfaEnabled" IS NULL')


def downgrade() -> None:
    op.drop_column("users", "timezone")
    op.drop_column("users", "locale")
    op.drop_column("users", "displayName")
    op.drop_column("users", "mfaSecret")
    op.drop_column("users", "mfaEnabled")
    op.drop_column("users", "status")
    op.drop_column("users", "permissions")
    op.drop_column("users", "tenantType")
    op.drop_column("users", "tenantId")
