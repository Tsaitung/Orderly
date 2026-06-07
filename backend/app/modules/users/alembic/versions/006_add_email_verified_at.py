"""Add users.emailVerifiedAt (model-vs-migration drift fix)

The User model defines email_verified_at = Column("emailVerifiedAt",
DateTime(timezone=True), nullable=True) but no prior migration created it, so any
query selecting the full User row failed with
`column users.emailVerifiedAt does not exist` (login -> 500). This migration adds
the missing column to bring the schema in line with the model.

Revision ID: 006_add_email_verified_at
Revises: 005_auth_security_enhancement
Create Date: 2026-06-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006_add_email_verified_at"
down_revision: Union[str, None] = "005_auth_security_enhancement"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("emailVerifiedAt", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "emailVerifiedAt")
