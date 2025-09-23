"""initial tables

Revision ID: 001_initial_tables
Revises: 
Create Date: 2025-09-23 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_tables'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create organizations table
    op.create_table('organizations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('settings', sa.JSON(), nullable=False, default=sa.text("'{}'::jsonb")),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)

    # Create users table
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('passwordHash', sa.String(), nullable=True),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('lastLoginAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, default=sa.text("'{}'::jsonb")),
        sa.Column('tokenVersion', sa.Integer(), nullable=False, default=0),
        sa.Column('isSuperUser', sa.Boolean(), nullable=False, default=False),
        sa.Column('emailVerified', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_organizationId'), 'users', ['organizationId'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_users_organizationId'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')