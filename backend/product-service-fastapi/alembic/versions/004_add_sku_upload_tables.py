"""Add SKU batch upload tables with AI validation support

Revision ID: 004_add_sku_upload_tables
Revises: fix_sku_column_naming_manual
Create Date: 2025-09-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_add_sku_upload_tables'
down_revision = 'fix_sku_column_naming_manual'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create sku_uploads table for tracking upload jobs
    op.create_table(
        'sku_uploads',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        sa.Column('file_url', sa.Text, nullable=True),
        sa.Column('total_rows', sa.Integer, nullable=False),
        sa.Column('processed_rows', sa.Integer, server_default='0', nullable=False),
        sa.Column('valid_rows', sa.Integer, server_default='0', nullable=False),
        sa.Column('error_rows', sa.Integer, server_default='0', nullable=False),
        sa.Column('duplicate_rows', sa.Integer, server_default='0', nullable=False),
        sa.Column('category_corrections', sa.Integer, server_default='0', nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        # Status: pending, processing, ai_validating, review_required, approved, rejected, failed, cancelled
        sa.Column('upload_type', sa.String(50), server_default='create', nullable=False),
        # Type: create, update, upsert
        sa.Column('ai_validation_completed', sa.Boolean, server_default='false', nullable=False),
        sa.Column('ai_validation_results', postgresql.JSONB, nullable=True),
        sa.Column('duplicate_detection_results', postgresql.JSONB, nullable=True),
        sa.Column('category_validation_results', postgresql.JSONB, nullable=True),
        sa.Column('started_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('approved_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('error_summary', postgresql.JSONB, nullable=True),
        sa.Column('processing_metadata', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        # Constraints
        sa.CheckConstraint('total_rows <= 200', name='sku_uploads_max_rows_check'),
        sa.CheckConstraint('file_size <= 5242880', name='sku_uploads_max_file_size_check'),  # 5MB
        sa.CheckConstraint("status IN ('pending', 'processing', 'ai_validating', 'review_required', 'approved', 'rejected', 'failed', 'cancelled')", name='sku_uploads_status_check'),
        sa.CheckConstraint("upload_type IN ('create', 'update', 'upsert')", name='sku_uploads_type_check')
    )

    # Create sku_upload_items table for individual SKU items
    op.create_table(
        'sku_upload_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('row_number', sa.Integer, nullable=False),
        
        # System-generated fields (not provided by user)
        sa.Column('system_generated_sku_code', sa.String(100), nullable=True),
        sa.Column('system_generated_product_id', postgresql.UUID(as_uuid=True), nullable=True),
        
        # User-provided fields (from CSV)
        sa.Column('product_name', sa.String(500), nullable=False),
        sa.Column('category_name', sa.String(255), nullable=False),  # User's category choice
        sa.Column('variant', postgresql.JSONB, nullable=True),
        sa.Column('stock_quantity', sa.Integer, nullable=False),
        sa.Column('min_stock', sa.Integer, nullable=False),
        sa.Column('max_stock', sa.Integer, nullable=True),
        sa.Column('weight', sa.Float, nullable=True),
        sa.Column('package_type', sa.String(100), nullable=True),
        sa.Column('shelf_life_days', sa.Integer, nullable=True),
        sa.Column('storage_conditions', sa.String(200), nullable=True),
        
        # AI validation results
        sa.Column('ai_duplicate_score', sa.Float, nullable=True),  # 0-1 confidence
        sa.Column('ai_category_match_score', sa.Float, nullable=True),  # 0-1 confidence
        sa.Column('suggested_category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('suggested_category_path', sa.String(500), nullable=True),
        sa.Column('duplicate_candidates', postgresql.JSONB, nullable=True),
        sa.Column('category_suggestions', postgresql.JSONB, nullable=True),
        
        # Processing status and results
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        # Status: pending, validating, valid, error, warning, duplicate_detected, category_mismatch, processed, skipped
        sa.Column('validation_errors', postgresql.JSONB, nullable=True),
        sa.Column('validation_warnings', postgresql.JSONB, nullable=True),
        sa.Column('ai_validation_results', postgresql.JSONB, nullable=True),
        
        # Data storage
        sa.Column('original_data', postgresql.JSONB, nullable=False),  # Store original CSV row
        sa.Column('processed_data', postgresql.JSONB, nullable=True),  # Store cleaned/transformed data
        sa.Column('final_sku_data', postgresql.JSONB, nullable=True),  # Final data for SKU creation
        
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['upload_id'], ['sku_uploads.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('upload_id', 'row_number', name='sku_upload_items_unique_row'),
        
        # Constraints
        sa.CheckConstraint('stock_quantity >= 0', name='sku_upload_items_stock_positive'),
        sa.CheckConstraint('min_stock >= 0', name='sku_upload_items_min_stock_positive'),
        sa.CheckConstraint('max_stock IS NULL OR max_stock >= min_stock', name='sku_upload_items_max_stock_valid'),
        sa.CheckConstraint('weight IS NULL OR weight > 0', name='sku_upload_items_weight_positive'),
        sa.CheckConstraint('shelf_life_days IS NULL OR shelf_life_days > 0', name='sku_upload_items_shelf_life_positive'),
        sa.CheckConstraint('ai_duplicate_score IS NULL OR (ai_duplicate_score >= 0 AND ai_duplicate_score <= 1)', name='sku_upload_items_duplicate_score_range'),
        sa.CheckConstraint('ai_category_match_score IS NULL OR (ai_category_match_score >= 0 AND ai_category_match_score <= 1)', name='sku_upload_items_category_score_range'),
        sa.CheckConstraint("status IN ('pending', 'validating', 'valid', 'error', 'warning', 'duplicate_detected', 'category_mismatch', 'processed', 'skipped')", name='sku_upload_items_status_check')
    )

    # Create sku_upload_audit_logs table for tracking all actions
    op.create_table(
        'sku_upload_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('upload_item_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        # Actions: upload_started, file_parsed, ai_validation_completed, duplicate_detected, category_corrected, 
        # item_approved, item_rejected, batch_approved, batch_rejected, sku_created, error_occurred
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('ai_decision', sa.Boolean, nullable=False, server_default='false'),  # Was this an AI-driven action?
        sa.Column('user_override', sa.Boolean, nullable=False, server_default='false'),  # Did user override AI?
        sa.Column('ip_address', sa.String(45), nullable=True),  # Support IPv6
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['upload_id'], ['sku_uploads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['upload_item_id'], ['sku_upload_items.id'], ondelete='CASCADE')
    )

    # Create sku_code_sequences table for auto-generating unique SKU codes
    op.create_table(
        'sku_code_sequences',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('category_code', sa.String(10), nullable=False),
        sa.Column('date_code', sa.String(8), nullable=False),  # YYYYMMDD
        sa.Column('sequence_number', sa.Integer, nullable=False, server_default='1'),
        sa.Column('last_used_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_code', 'date_code', name='sku_code_sequences_unique_per_day')
    )

    # Create indexes for performance
    op.create_index('idx_sku_uploads_user_status', 'sku_uploads', ['user_id', 'status'])
    op.create_index('idx_sku_uploads_org_created', 'sku_uploads', ['organization_id', 'created_at'])
    op.create_index('idx_sku_uploads_status_created', 'sku_uploads', ['status', 'created_at'])
    
    op.create_index('idx_sku_upload_items_upload_status', 'sku_upload_items', ['upload_id', 'status'])
    op.create_index('idx_sku_upload_items_upload_row', 'sku_upload_items', ['upload_id', 'row_number'])
    op.create_index('idx_sku_upload_items_sku_code', 'sku_upload_items', ['system_generated_sku_code'])
    op.create_index('idx_sku_upload_items_duplicate_score', 'sku_upload_items', ['ai_duplicate_score'])
    op.create_index('idx_sku_upload_items_category_score', 'sku_upload_items', ['ai_category_match_score'])
    
    op.create_index('idx_sku_upload_audit_logs_upload', 'sku_upload_audit_logs', ['upload_id', 'created_at'])
    op.create_index('idx_sku_upload_audit_logs_action', 'sku_upload_audit_logs', ['action', 'created_at'])
    op.create_index('idx_sku_upload_audit_logs_ai_decision', 'sku_upload_audit_logs', ['ai_decision', 'created_at'])
    
    op.create_index('idx_sku_code_sequences_category_date', 'sku_code_sequences', ['category_code', 'date_code'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_sku_code_sequences_category_date')
    op.drop_index('idx_sku_upload_audit_logs_ai_decision')
    op.drop_index('idx_sku_upload_audit_logs_action')
    op.drop_index('idx_sku_upload_audit_logs_upload')
    op.drop_index('idx_sku_upload_items_category_score')
    op.drop_index('idx_sku_upload_items_duplicate_score')
    op.drop_index('idx_sku_upload_items_sku_code')
    op.drop_index('idx_sku_upload_items_upload_row')
    op.drop_index('idx_sku_upload_items_upload_status')
    op.drop_index('idx_sku_uploads_status_created')
    op.drop_index('idx_sku_uploads_org_created')
    op.drop_index('idx_sku_uploads_user_status')
    
    # Drop tables
    op.drop_table('sku_code_sequences')
    op.drop_table('sku_upload_audit_logs')
    op.drop_table('sku_upload_items')
    op.drop_table('sku_uploads')