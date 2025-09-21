"""add_sku_sharing_mechanism

Revision ID: c31ee9a190ac
Revises: 8713cfb2e5fe
Create Date: 2025-09-21 09:10:26.522920

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c31ee9a190ac'
down_revision = '8713cfb2e5fe'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 為 SKU 表添加共享機制相關欄位
    op.add_column('skus', sa.Column('type', sa.Enum('public', 'private', name='sku_type'), nullable=False, server_default='private'))
    op.add_column('skus', sa.Column('creator_type', sa.Enum('platform', 'supplier', name='creator_type'), nullable=False, server_default='supplier'))
    op.add_column('skus', sa.Column('creator_id', sa.String(36), nullable=True))
    op.add_column('skus', sa.Column('standard_info', sa.JSON(), nullable=True, comment='共享型 SKU 的標準化資訊'))
    op.add_column('skus', sa.Column('approval_status', sa.Enum('draft', 'pending', 'approved', 'rejected', name='approval_status'), nullable=False, server_default='approved'))
    op.add_column('skus', sa.Column('approved_by', sa.String(36), nullable=True))
    op.add_column('skus', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('skus', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    
    # 2. 創建供應商 SKU 參與表
    op.create_table('supplier_sku_participations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sku_id', sa.String(36), sa.ForeignKey('skus.id', ondelete='CASCADE'), nullable=False),
        sa.Column('supplier_id', sa.String(36), nullable=False, comment='供應商 ID'),
        
        # 供應商可自訂的參數
        sa.Column('custom_name', sa.String(200), nullable=True, comment='自訂商品名稱'),
        sa.Column('selling_price', sa.Numeric(12, 2), nullable=False, comment='銷售價格'),
        sa.Column('cost_price', sa.Numeric(12, 2), nullable=True, comment='成本價格（加密存儲）'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='TWD'),
        sa.Column('min_order_quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('max_order_quantity', sa.Integer(), nullable=True),
        sa.Column('lead_time_days', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('inventory_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('delivery_zones', sa.JSON(), nullable=True, server_default='[]', comment='配送區域'),
        
        # 自訂屬性
        sa.Column('custom_attributes', sa.JSON(), nullable=True, server_default='{}', comment='包裝、產地等自訂屬性'),
        sa.Column('supplier_notes', sa.Text(), nullable=True, comment='供應商備註'),
        
        # 狀態管理
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('joined_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        
        sa.UniqueConstraint('sku_id', 'supplier_id', name='uq_supplier_sku_participation'),
        sa.Index('idx_supplier_participations_supplier', 'supplier_id'),
        sa.Index('idx_supplier_participations_active', 'is_active', 'updated_at'),
        sa.Index('idx_supplier_participations_sku', 'sku_id')
    )
    
    # 3. 創建 SKU 審核記錄表
    op.create_table('sku_audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sku_id', sa.String(36), sa.ForeignKey('skus.id'), nullable=False),
        sa.Column('action_type', sa.Enum('create', 'update', 'convert_to_public', 'approve', 'reject', name='audit_action_type'), nullable=False),
        sa.Column('requested_by', sa.String(36), nullable=False, comment='請求用戶 ID'),
        sa.Column('requested_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('reviewed_by', sa.String(36), nullable=True, comment='審核用戶 ID'),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', name='audit_status'), nullable=False, server_default='pending'),
        sa.Column('change_details', sa.JSON(), nullable=False, comment='變更詳情'),
        sa.Column('review_comments', sa.Text(), nullable=True, comment='審核意見'),
        
        sa.Index('idx_sku_audit_status', 'status'),
        sa.Index('idx_sku_audit_sku', 'sku_id'),
        sa.Index('idx_sku_audit_requested_by', 'requested_by')
    )
    
    # 4. 創建 SKU 訪問控制表
    op.create_table('sku_access_permissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sku_id', sa.String(36), sa.ForeignKey('skus.id'), nullable=False),
        sa.Column('entity_type', sa.Enum('supplier', 'restaurant', 'user_group', name='entity_type'), nullable=False),
        sa.Column('entity_id', sa.String(36), nullable=False),
        sa.Column('permission_level', sa.Enum('view', 'participate', 'edit', name='permission_level'), nullable=False),
        sa.Column('granted_by', sa.String(36), nullable=False, comment='授權用戶 ID'),
        sa.Column('granted_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        
        sa.UniqueConstraint('sku_id', 'entity_type', 'entity_id', name='uq_sku_access_permission'),
        sa.Index('idx_sku_access_entity', 'entity_type', 'entity_id'),
        sa.Index('idx_sku_access_sku_permission', 'sku_id', 'permission_level')
    )
    
    # 5. 創建 SKU 版本歷史表
    op.create_table('sku_versions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sku_id', sa.String(36), sa.ForeignKey('skus.id'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=False, comment='該版本的完整資料'),
        sa.Column('changed_by', sa.String(36), nullable=False, comment='修改用戶 ID'),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('change_summary', sa.Text(), nullable=True, comment='變更摘要'),
        
        sa.UniqueConstraint('sku_id', 'version_number', name='uq_sku_version'),
        sa.Index('idx_sku_version_sku_version', 'sku_id', 'version_number')
    )
    
    # 6. 為 skus 表添加索引以優化查詢性能
    op.create_index('idx_skus_type_status', 'skus', ['type', 'approval_status'])
    op.create_index('idx_skus_creator', 'skus', ['creator_type', 'creator_id'])
    
    # 7. 遷移現有資料：設定所有現有 SKU 為獨占型
    op.execute("UPDATE skus SET type = 'private', approval_status = 'approved' WHERE type IS NULL OR type = ''")


def downgrade() -> None:
    # 移除添加的索引
    op.drop_index('idx_skus_creator', 'skus')
    op.drop_index('idx_skus_type_status', 'skus')
    
    # 移除新創建的表
    op.drop_table('sku_versions')
    op.drop_table('sku_access_permissions')
    op.drop_table('sku_audit_logs')
    op.drop_table('supplier_sku_participations')
    
    # 移除 skus 表的新欄位
    op.drop_column('skus', 'version')
    op.drop_column('skus', 'approved_at')
    op.drop_column('skus', 'approved_by')
    op.drop_column('skus', 'approval_status')
    op.drop_column('skus', 'standard_info')
    op.drop_column('skus', 'creator_id')
    op.drop_column('skus', 'creator_type')
    op.drop_column('skus', 'type')
    
    # 移除 ENUM 類型
    op.execute("DROP TYPE IF EXISTS sku_type")
    op.execute("DROP TYPE IF EXISTS creator_type")
    op.execute("DROP TYPE IF EXISTS approval_status")
    op.execute("DROP TYPE IF EXISTS audit_action_type")
    op.execute("DROP TYPE IF EXISTS audit_status")
    op.execute("DROP TYPE IF EXISTS entity_type")
    op.execute("DROP TYPE IF EXISTS permission_level")