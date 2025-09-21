"""initial_supplier_tables

Revision ID: 001_supplier_tables
Revises: 
Create Date: 2025-09-19 17:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql.sqltypes import Numeric


# revision identifiers, used by Alembic.
revision = '001_supplier_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create supplier_profiles table
    op.create_table('supplier_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'VERIFIED', 'SUSPENDED', 'DEACTIVATED', name='supplierstatus'), nullable=False),
        sa.Column('verifiedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verifiedBy', sa.String(), nullable=True),
        sa.Column('deliveryCapacity', sa.Enum('SMALL', 'MEDIUM', 'LARGE', name='deliverycapacity'), nullable=True),
        sa.Column('deliveryCapacityKgPerDay', sa.Integer(), nullable=False),
        sa.Column('operatingHours', sa.JSON(), nullable=False),
        sa.Column('deliveryZones', sa.JSON(), nullable=False),
        sa.Column('minimumOrderAmount', Numeric(precision=10, scale=2), nullable=False),
        sa.Column('paymentTermsDays', sa.Integer(), nullable=False),
        sa.Column('bankAccountInfo', sa.JSON(), nullable=True),
        sa.Column('qualityCertifications', sa.JSON(), nullable=False),
        sa.Column('foodSafetyLicense', sa.String(), nullable=True),
        sa.Column('foodSafetyExpiresAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('contactPreferences', sa.JSON(), nullable=False),
        sa.Column('settings', sa.JSON(), nullable=False),
        sa.Column('internalNotes', sa.String(), nullable=True),
        sa.Column('publicDescription', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('organizationId')
    )
    op.create_index(op.f('ix_supplier_profiles_organizationId'), 'supplier_profiles', ['organizationId'], unique=False)

    # Create supplier_customers table
    op.create_table('supplier_customers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('customerId', sa.String(), nullable=False),
        sa.Column('relationshipType', sa.String(), nullable=False),
        sa.Column('creditLimitNtd', sa.Integer(), nullable=False),
        sa.Column('paymentTermsDays', sa.Integer(), nullable=False),
        sa.Column('firstOrderDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lastOrderDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('totalOrders', sa.Integer(), nullable=False),
        sa.Column('totalRevenueNtd', Numeric(precision=12, scale=2), nullable=False),
        sa.Column('customPricingRules', sa.JSON(), nullable=False),
        sa.Column('specialDeliveryInstructions', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['supplierId'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customerId'], ['organizations.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_supplier_customers_supplierId'), 'supplier_customers', ['supplierId'], unique=False)
    op.create_index(op.f('ix_supplier_customers_customerId'), 'supplier_customers', ['customerId'], unique=False)

    # Create supplier_onboarding_progress table
    op.create_table('supplier_onboarding_progress',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('stepCompanyInfo', sa.Boolean(), nullable=False),
        sa.Column('stepCompanyInfoCompletedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stepBusinessDocuments', sa.Boolean(), nullable=False),
        sa.Column('stepBusinessDocumentsCompletedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stepDeliverySetup', sa.Boolean(), nullable=False),
        sa.Column('stepDeliverySetupCompletedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stepProductCategories', sa.Boolean(), nullable=False),
        sa.Column('stepProductCategoriesCompletedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('stepVerification', sa.Boolean(), nullable=False),
        sa.Column('stepVerificationCompletedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('isCompleted', sa.Boolean(), nullable=False),
        sa.Column('completedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewedBy', sa.String(), nullable=True),
        sa.Column('reviewedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewNotes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['supplierId'], ['organizations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('supplierId')
    )
    op.create_index(op.f('ix_supplier_onboarding_progress_supplierId'), 'supplier_onboarding_progress', ['supplierId'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_supplier_onboarding_progress_supplierId'), table_name='supplier_onboarding_progress')
    op.drop_table('supplier_onboarding_progress')
    op.drop_index(op.f('ix_supplier_customers_customerId'), table_name='supplier_customers')
    op.drop_index(op.f('ix_supplier_customers_supplierId'), table_name='supplier_customers')
    op.drop_table('supplier_customers')
    op.drop_index(op.f('ix_supplier_profiles_organizationId'), table_name='supplier_profiles')
    op.drop_table('supplier_profiles')
    
    # Drop enums
    sa.Enum('PENDING', 'VERIFIED', 'SUSPENDED', 'DEACTIVATED', name='supplierstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum('SMALL', 'MEDIUM', 'LARGE', name='deliverycapacity').drop(op.get_bind(), checkfirst=True)