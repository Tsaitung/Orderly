"""initial notifications table

Revision ID: notif_init_0001
Revises: 
Create Date: 2025-09-19
"""
from alembic import op
import sqlalchemy as sa


revision = 'notif_init_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('userId', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('readAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('priority', sa.String(), nullable=False, server_default='medium'),
    )
    op.create_index('ix_notifications_userId', 'notifications', ['userId'])


def downgrade() -> None:
    op.drop_index('ix_notifications_userId', table_name='notifications')
    op.drop_table('notifications')

