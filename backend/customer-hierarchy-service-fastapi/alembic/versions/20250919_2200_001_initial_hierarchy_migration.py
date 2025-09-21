"""
Initial Customer Hierarchy Migration

Creates the 4-level customer hierarchy tables:
1. customer_groups (集團)
2. customer_companies (公司)  
3. customer_locations (地點)
4. business_units (業務單位)
5. customer_migration_logs (遷移記錄)

Revision ID: 001_initial_hierarchy
Revises: 
Create Date: 2025-09-19 22:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_hierarchy'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create hierarchy tables"""
    
    # Create customer_groups table (集團)
    op.create_table(
        'customer_groups',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False, comment='Group name (集團名稱)'),
        sa.Column('code', sa.String(50), nullable=True, comment='Unique group code (集團代碼)'),
        sa.Column('description', sa.Text(), nullable=True, comment='Group description (集團描述)'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Flexible metadata storage'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Notes'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.Column('created_by', sa.String(), nullable=False, comment='Created by user ID'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='Updated by user ID'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        
        # Constraints
        sa.UniqueConstraint('code', name='uq_customer_group_code'),
        
        comment='Customer Groups - Top level of hierarchy (集團)'
    )
    
    # Create customer_companies table (公司)
    op.create_table(
        'customer_companies',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('group_id', sa.String(), sa.ForeignKey('customer_groups.id', ondelete='SET NULL'), nullable=True, comment='Parent group ID (上級集團)'),
        sa.Column('name', sa.String(255), nullable=False, comment='Company name (公司名稱)'),
        sa.Column('legal_name', sa.String(255), nullable=True, comment='Legal registered name (法定名稱)'),
        sa.Column('tax_id', sa.String(50), nullable=False, comment='Tax ID or personal ID (統一編號或身分證號碼)'),
        sa.Column('tax_id_type', sa.String(20), nullable=False, default='company', comment='Type of tax ID'),
        sa.Column('billing_address', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Billing address details'),
        sa.Column('billing_contact', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Billing contact information'),
        sa.Column('billing_email', sa.String(255), nullable=True, comment='Billing email address'),
        sa.Column('payment_terms', sa.String(50), nullable=True, comment='Payment terms (e.g., NET30)'),
        sa.Column('credit_limit', sa.DECIMAL(12, 2), nullable=True, comment='Credit limit'),
        sa.Column('legacy_organization_id', sa.String(), nullable=True, comment='Legacy organization ID for migration'),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Company-specific settings'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Flexible metadata storage'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Notes'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.Column('created_by', sa.String(), nullable=False, comment='Created by user ID'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='Updated by user ID'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        
        # Constraints
        sa.UniqueConstraint('tax_id', name='uq_customer_company_tax_id'),
        sa.UniqueConstraint('legacy_organization_id', name='uq_customer_company_legacy'),
        sa.CheckConstraint("tax_id_type IN ('company', 'individual', 'foreign')", name='check_tax_id_type'),
        
        comment='Customer Companies - Legal entity for billing (公司)'
    )
    
    # Create customer_locations table (地點)
    op.create_table(
        'customer_locations',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('company_id', sa.String(), sa.ForeignKey('customer_companies.id', ondelete='CASCADE'), nullable=False, comment='Parent company ID (所屬公司)'),
        sa.Column('name', sa.String(255), nullable=False, comment='Location name (地點名稱)'),
        sa.Column('code', sa.String(50), nullable=True, comment='Location code within company (地點代碼)'),
        sa.Column('address', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Complete address details'),
        sa.Column('city', sa.String(100), nullable=True, comment='City for indexing (城市)'),
        sa.Column('delivery_contact', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Delivery contact information'),
        sa.Column('delivery_phone', sa.String(50), nullable=True, comment='Primary delivery phone'),
        sa.Column('delivery_instructions', sa.Text(), nullable=True, comment='Special delivery instructions (配送說明)'),
        sa.Column('operating_hours', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Operating hours by day'),
        sa.Column('coordinates', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='GPS coordinates {lat, lng}'),
        sa.Column('timezone', sa.String(50), nullable=True, default='Asia/Taipei', comment='Timezone'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Flexible metadata storage'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Notes'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.Column('created_by', sa.String(), nullable=False, comment='Created by user ID'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='Updated by user ID'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        
        # Constraints
        sa.UniqueConstraint('company_id', 'code', name='uq_company_location_code'),
        
        comment='Customer Locations - Physical delivery destinations (地點)'
    )
    
    # Create business_units table (業務單位)
    op.create_table(
        'business_units',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('location_id', sa.String(), sa.ForeignKey('customer_locations.id', ondelete='CASCADE'), nullable=False, comment='Parent location ID (所屬地點)'),
        sa.Column('name', sa.String(255), nullable=False, comment='Business unit name (業務單位名稱)'),
        sa.Column('code', sa.String(50), nullable=False, comment='Unique code within location (單位代碼)'),
        sa.Column('type', sa.String(50), nullable=True, comment='Type of business unit (e.g., kitchen, bar)'),
        sa.Column('cost_center_code', sa.String(50), nullable=True, comment='Cost center code for accounting (成本中心代碼)'),
        sa.Column('budget_monthly', sa.DECIMAL(12, 2), nullable=True, comment='Monthly budget limit (月度預算)'),
        sa.Column('budget_alert_threshold', sa.DECIMAL(5, 2), nullable=True, default=80.0, comment='Budget alert threshold percentage'),
        sa.Column('manager_contact', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Manager contact info'),
        sa.Column('ordering_permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Ordering permissions configuration'),
        sa.Column('allowed_suppliers', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='List of allowed supplier IDs'),
        sa.Column('blocked_categories', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='List of blocked category IDs'),
        sa.Column('max_order_value', sa.DECIMAL(12, 2), nullable=True, comment='Maximum single order value'),
        sa.Column('requires_approval', sa.Boolean(), nullable=False, default=False, comment='Whether orders require approval'),
        sa.Column('approval_threshold', sa.DECIMAL(12, 2), nullable=True, comment='Order value threshold for approval'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Flexible metadata storage'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Notes'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.Column('created_by', sa.String(), nullable=False, comment='Created by user ID'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='Updated by user ID'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        
        # Constraints
        sa.UniqueConstraint('location_id', 'code', name='uq_location_unit_code'),
        sa.CheckConstraint('budget_alert_threshold >= 0 AND budget_alert_threshold <= 100', name='check_budget_alert_threshold_range'),
        sa.CheckConstraint('max_order_value >= 0', name='check_max_order_value_positive'),
        sa.CheckConstraint('approval_threshold >= 0', name='check_approval_threshold_positive'),
        
        comment='Business Units - Actual ordering entities (業務單位)'
    )
    
    # Create customer_migration_logs table (遷移記錄)
    op.create_table(
        'customer_migration_logs',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('old_customer_id', sa.String(), nullable=False, comment='Original customer ID from old system'),
        sa.Column('old_organization_id', sa.String(), nullable=False, comment='Original organization ID from old system'),
        sa.Column('old_customer_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Snapshot of original customer data'),
        sa.Column('old_organization_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Snapshot of original organization data'),
        sa.Column('new_group_id', sa.String(), sa.ForeignKey('customer_groups.id', ondelete='SET NULL'), nullable=True, comment='Created/assigned group ID'),
        sa.Column('new_company_id', sa.String(), sa.ForeignKey('customer_companies.id', ondelete='SET NULL'), nullable=True, comment='Created company ID'),
        sa.Column('new_location_id', sa.String(), sa.ForeignKey('customer_locations.id', ondelete='SET NULL'), nullable=True, comment='Created location ID'),
        sa.Column('new_business_unit_id', sa.String(), sa.ForeignKey('business_units.id', ondelete='SET NULL'), nullable=True, comment='Created business unit ID'),
        sa.Column('migration_status', sa.String(20), nullable=False, default='pending', comment='Migration status'),
        sa.Column('migration_type', sa.String(20), nullable=False, default='auto', comment='Type of migration performed'),
        sa.Column('migration_date', sa.DateTime(timezone=True), nullable=True, comment='When migration was completed'),
        sa.Column('migration_started_at', sa.DateTime(timezone=True), nullable=True, comment='When migration was started'),
        sa.Column('migration_completed_at', sa.DateTime(timezone=True), nullable=True, comment='When migration was completed'),
        sa.Column('rollback_date', sa.DateTime(timezone=True), nullable=True, comment='When migration was rolled back'),
        sa.Column('rollback_reason', sa.Text(), nullable=True, comment='Reason for rollback'),
        sa.Column('rolled_back_by', sa.String(), nullable=True, comment='User who performed rollback'),
        sa.Column('validation_errors', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Validation errors during migration'),
        sa.Column('validation_warnings', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Validation warnings during migration'),
        sa.Column('data_mapping', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Configuration used for data mapping'),
        sa.Column('migration_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Migration configuration and options'),
        sa.Column('processing_duration_seconds', sa.String(), nullable=True, comment='How long migration took'),
        sa.Column('records_processed', sa.String(), nullable=True, comment='Number of records processed'),
        sa.Column('migrated_by', sa.String(), nullable=True, comment='User who initiated migration'),
        sa.Column('reviewed_by', sa.String(), nullable=True, comment='User who reviewed migration'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}', comment='Flexible metadata storage'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Notes'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.Column('created_by', sa.String(), nullable=False, comment='Created by user ID'),
        sa.Column('updated_by', sa.String(), nullable=True, comment='Updated by user ID'),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        
        # Constraints
        sa.CheckConstraint("migration_status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')", name='check_migration_status'),
        sa.CheckConstraint("migration_type IN ('auto', 'manual', 'assisted', 'bulk')", name='check_migration_type'),
        
        comment='Customer Migration Logs - Tracks migration from old to new hierarchy'
    )
    
    # Create indexes for performance
    
    # Customer Groups indexes
    op.create_index('idx_customer_groups_code', 'customer_groups', ['code'])
    op.create_index('idx_customer_groups_name', 'customer_groups', ['name'])
    op.create_index('idx_customer_groups_active', 'customer_groups', ['is_active'])
    op.create_index('idx_customer_groups_created_by', 'customer_groups', ['created_by'])
    
    # Customer Companies indexes
    op.create_index('idx_customer_companies_group', 'customer_companies', ['group_id'])
    op.create_index('idx_customer_companies_tax_id', 'customer_companies', ['tax_id'])
    op.create_index('idx_customer_companies_name', 'customer_companies', ['name'])
    op.create_index('idx_customer_companies_active', 'customer_companies', ['is_active'])
    op.create_index('idx_customer_companies_legacy', 'customer_companies', ['legacy_organization_id'])
    
    # Customer Locations indexes
    op.create_index('idx_customer_locations_company', 'customer_locations', ['company_id'])
    op.create_index('idx_customer_locations_name', 'customer_locations', ['name'])
    op.create_index('idx_customer_locations_active', 'customer_locations', ['is_active'])
    op.create_index('idx_customer_locations_city', 'customer_locations', ['city'])
    op.create_index('idx_customer_locations_coordinates', 'customer_locations', ['coordinates'], postgresql_using='gin')
    
    # Business Units indexes
    op.create_index('idx_business_units_location', 'business_units', ['location_id'])
    op.create_index('idx_business_units_type', 'business_units', ['type'])
    op.create_index('idx_business_units_name', 'business_units', ['name'])
    op.create_index('idx_business_units_active', 'business_units', ['is_active'])
    op.create_index('idx_business_units_cost_center', 'business_units', ['cost_center_code'])
    
    # Migration Logs indexes
    op.create_index('idx_migration_old_customer', 'customer_migration_logs', ['old_customer_id'])
    op.create_index('idx_migration_old_organization', 'customer_migration_logs', ['old_organization_id'])
    op.create_index('idx_migration_status', 'customer_migration_logs', ['migration_status'])
    op.create_index('idx_migration_type', 'customer_migration_logs', ['migration_type'])
    op.create_index('idx_migration_date', 'customer_migration_logs', ['migration_date'])
    op.create_index('idx_migration_migrated_by', 'customer_migration_logs', ['migrated_by'])


def downgrade() -> None:
    """Drop hierarchy tables"""
    
    # Drop indexes first
    op.drop_index('idx_migration_migrated_by', 'customer_migration_logs')
    op.drop_index('idx_migration_date', 'customer_migration_logs')
    op.drop_index('idx_migration_type', 'customer_migration_logs')
    op.drop_index('idx_migration_status', 'customer_migration_logs')
    op.drop_index('idx_migration_old_organization', 'customer_migration_logs')
    op.drop_index('idx_migration_old_customer', 'customer_migration_logs')
    
    op.drop_index('idx_business_units_cost_center', 'business_units')
    op.drop_index('idx_business_units_active', 'business_units')
    op.drop_index('idx_business_units_name', 'business_units')
    op.drop_index('idx_business_units_type', 'business_units')
    op.drop_index('idx_business_units_location', 'business_units')
    
    op.drop_index('idx_customer_locations_coordinates', 'customer_locations')
    op.drop_index('idx_customer_locations_city', 'customer_locations')
    op.drop_index('idx_customer_locations_active', 'customer_locations')
    op.drop_index('idx_customer_locations_name', 'customer_locations')
    op.drop_index('idx_customer_locations_company', 'customer_locations')
    
    op.drop_index('idx_customer_companies_legacy', 'customer_companies')
    op.drop_index('idx_customer_companies_active', 'customer_companies')
    op.drop_index('idx_customer_companies_name', 'customer_companies')
    op.drop_index('idx_customer_companies_tax_id', 'customer_companies')
    op.drop_index('idx_customer_companies_group', 'customer_companies')
    
    op.drop_index('idx_customer_groups_created_by', 'customer_groups')
    op.drop_index('idx_customer_groups_active', 'customer_groups')
    op.drop_index('idx_customer_groups_name', 'customer_groups')
    op.drop_index('idx_customer_groups_code', 'customer_groups')
    
    # Drop tables in reverse order (due to foreign keys)
    op.drop_table('customer_migration_logs')
    op.drop_table('business_units')
    op.drop_table('customer_locations')
    op.drop_table('customer_companies')
    op.drop_table('customer_groups')