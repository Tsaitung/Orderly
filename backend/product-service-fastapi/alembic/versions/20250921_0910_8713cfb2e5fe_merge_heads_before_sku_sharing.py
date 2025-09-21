"""merge_heads_before_sku_sharing

Revision ID: 8713cfb2e5fe
Revises: c7037736e98e, 74aed7eff66f
Create Date: 2025-09-21 09:10:22.180479

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8713cfb2e5fe'
down_revision = ('c7037736e98e', '74aed7eff66f')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass