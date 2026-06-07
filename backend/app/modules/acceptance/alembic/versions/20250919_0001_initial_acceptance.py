"""initial acceptance tables

Revision ID: acc_init_0001
Revises: 
Create Date: 2025-09-19
"""
from alembic import op
import sqlalchemy as sa


revision = 'acc_init_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'acceptances',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('orderId', sa.String(), nullable=False),
        sa.Column('restaurantId', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('acceptedDate', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('discrepancies', sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )

    op.create_table(
        'acceptance_items',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('acceptanceId', sa.String(), nullable=False),
        sa.Column('productCode', sa.String(), nullable=False),
        sa.Column('productName', sa.String(), nullable=False),
        sa.Column('deliveredQty', sa.String(), nullable=False),
        sa.Column('acceptedQty', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('reason', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['acceptanceId'], ['acceptances.id'])
    )


def downgrade() -> None:
    op.drop_table('acceptance_items')
    op.drop_table('acceptances')

