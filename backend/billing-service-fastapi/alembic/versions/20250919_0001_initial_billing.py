"""initial invoices table

Revision ID: bill_init_0001
Revises: 
Create Date: 2025-09-19
"""
from alembic import op
import sqlalchemy as sa


revision = 'bill_init_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'invoices',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('invoiceNumber', sa.String(), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('orderId', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='draft'),
        sa.Column('issueDate', sa.Date(), nullable=True),
        sa.Column('dueDate', sa.Date(), nullable=True),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('taxAmount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('totalAmount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('metadata', sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.create_unique_constraint('uq_invoices_invoiceNumber', 'invoices', ['invoiceNumber'])


def downgrade() -> None:
    op.drop_constraint('uq_invoices_invoiceNumber', 'invoices', type_='unique')
    op.drop_table('invoices')

