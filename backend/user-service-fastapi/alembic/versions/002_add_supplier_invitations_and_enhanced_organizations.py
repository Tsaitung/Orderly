"""Add supplier invitations and enhanced organizations

Revision ID: 002_supplier_invitations
Revises: 
Create Date: 2025-09-19 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_supplier_invitations'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    organization_type_enum = postgresql.ENUM(
        'restaurant', 'supplier', 'platform',
        name='organizationtype',
        create_type=False
    )
    organization_type_enum.create(op.get_bind(), checkfirst=True)
    
    business_type_enum = postgresql.ENUM(
        'company', 'individual',
        name='businesstype',
        create_type=False
    )
    business_type_enum.create(op.get_bind(), checkfirst=True)
    
    onboarding_status_enum = postgresql.ENUM(
        'invited', 'company_info', 'product_categories', 'sku_setup', 'pricing_config', 'completed',
        name='onboardingstatus',
        create_type=False
    )
    onboarding_status_enum.create(op.get_bind(), checkfirst=True)
    
    invitation_status_enum = postgresql.ENUM(
        'pending', 'accepted', 'expired', 'cancelled',
        name='invitationstatus',
        create_type=False
    )
    invitation_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Enhance organizations table
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        # Convert type column to enum
        batch_op.alter_column('type',
                              existing_type=sa.VARCHAR(),
                              type_=organization_type_enum,
                              existing_nullable=False,
                              postgresql_using='type::organizationtype')
        
        # Add business information columns
        batch_op.add_column(sa.Column('businessType', business_type_enum, nullable=True))
        batch_op.add_column(sa.Column('taxId', sa.String(8), nullable=True))
        batch_op.add_column(sa.Column('personalId', sa.String(10), nullable=True))
        batch_op.add_column(sa.Column('businessLicenseNumber', sa.String(), nullable=True))
        
        # Add contact information columns
        batch_op.add_column(sa.Column('contactPerson', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('contactPhone', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('contactEmail', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('address', sa.String(), nullable=True))
        
        # Add invitation and onboarding tracking columns
        batch_op.add_column(sa.Column('invitedByOrganizationId', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('invitationAcceptedAt', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('onboardingStatus', onboarding_status_enum, nullable=True, default='invited'))
        batch_op.add_column(sa.Column('onboardingProgress', sa.JSON(), nullable=False, default={}))
        batch_op.add_column(sa.Column('onboardingCompletedAt', sa.DateTime(timezone=True), nullable=True))
        
        # Add business capabilities columns
        batch_op.add_column(sa.Column('deliveryZones', sa.JSON(), nullable=False, default=[]))
        batch_op.add_column(sa.Column('productCategories', sa.JSON(), nullable=False, default=[]))
        batch_op.add_column(sa.Column('certifications', sa.JSON(), nullable=False, default=[]))
        
        # Create indexes
        batch_op.create_index('ix_organizations_taxId', ['taxId'], unique=False)
        batch_op.create_index('ix_organizations_personalId', ['personalId'], unique=False)
        
        # Create foreign key constraint
        batch_op.create_foreign_key(
            'fk_organizations_invitedByOrganizationId',
            'organizations',
            ['invitedByOrganizationId'],
            ['id']
        )
    
    # Create supplier_invitations table
    op.create_table('supplier_invitations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('code', sa.String(8), nullable=False),
        sa.Column('inviterOrganizationId', sa.String(), nullable=False),
        sa.Column('inviterUserId', sa.String(), nullable=False),
        sa.Column('inviteeEmail', sa.String(), nullable=False),
        sa.Column('inviteeCompanyName', sa.String(), nullable=False),
        sa.Column('inviteeContactPerson', sa.String(), nullable=True),
        sa.Column('inviteePhone', sa.String(), nullable=True),
        sa.Column('status', invitation_status_enum, nullable=False, default='pending'),
        sa.Column('sentAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expiresAt', sa.DateTime(timezone=True), nullable=False),
        sa.Column('acceptedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acceptedOrganizationId', sa.String(), nullable=True),
        sa.Column('invitationMessage', sa.Text(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['inviterOrganizationId'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['inviterUserId'], ['users.id'], ),
        sa.ForeignKeyConstraint(['acceptedOrganizationId'], ['organizations.id'], ),
    )
    
    # Create indexes for supplier_invitations
    op.create_index('ix_supplier_invitations_code', 'supplier_invitations', ['code'], unique=True)
    op.create_index('ix_supplier_invitations_inviteeEmail', 'supplier_invitations', ['inviteeEmail'], unique=False)
    op.create_index('ix_supplier_invitations_status', 'supplier_invitations', ['status'], unique=False)
    op.create_index('ix_supplier_invitations_inviterOrganizationId', 'supplier_invitations', ['inviterOrganizationId'], unique=False)


def downgrade() -> None:
    # Drop supplier_invitations table
    op.drop_table('supplier_invitations')
    
    # Remove columns from organizations table
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        # Drop foreign key constraint first
        batch_op.drop_constraint('fk_organizations_invitedByOrganizationId', type_='foreignkey')
        
        # Drop indexes
        batch_op.drop_index('ix_organizations_personalId')
        batch_op.drop_index('ix_organizations_taxId')
        
        # Drop added columns
        batch_op.drop_column('certifications')
        batch_op.drop_column('productCategories')
        batch_op.drop_column('deliveryZones')
        batch_op.drop_column('onboardingCompletedAt')
        batch_op.drop_column('onboardingProgress')
        batch_op.drop_column('onboardingStatus')
        batch_op.drop_column('invitationAcceptedAt')
        batch_op.drop_column('invitedByOrganizationId')
        batch_op.drop_column('address')
        batch_op.drop_column('contactEmail')
        batch_op.drop_column('contactPhone')
        batch_op.drop_column('contactPerson')
        batch_op.drop_column('businessLicenseNumber')
        batch_op.drop_column('personalId')
        batch_op.drop_column('taxId')
        batch_op.drop_column('businessType')
        
        # Revert type column back to varchar
        batch_op.alter_column('type',
                              existing_type=postgresql.ENUM('restaurant', 'supplier', 'platform', name='organizationtype'),
                              type_=sa.VARCHAR(),
                              existing_nullable=False)
    
    # Drop enum types
    postgresql.ENUM(name='invitationstatus').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='onboardingstatus').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='businesstype').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='organizationtype').drop(op.get_bind(), checkfirst=True)