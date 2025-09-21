"""add_sku_sharing_to_product_skus

Revision ID: 5383f1cebc40
Revises: c31ee9a190ac
Create Date: 2025-09-21 09:17:08.606092

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5383f1cebc40'
down_revision = 'c31ee9a190ac'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 為 product_skus 表添加共享機制相關欄位
    op.add_column('product_skus', sa.Column('type', sa.Enum('public', 'private', name='sku_type_product'), nullable=False, server_default='private'))
    op.add_column('product_skus', sa.Column('creator_type', sa.Enum('platform', 'supplier', name='creator_type_product'), nullable=False, server_default='supplier'))
    op.add_column('product_skus', sa.Column('creator_id', sa.String(36), nullable=True))
    op.add_column('product_skus', sa.Column('standard_info', sa.JSON(), nullable=True, comment='共享型 SKU 的標準化資訊'))
    op.add_column('product_skus', sa.Column('approval_status', sa.Enum('draft', 'pending', 'approved', 'rejected', name='approval_status_product'), nullable=False, server_default='approved'))
    op.add_column('product_skus', sa.Column('approved_by', sa.String(36), nullable=True))
    op.add_column('product_skus', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('product_skus', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    
    # 創建供應商 SKU 參與表 (基於 product_skus)
    op.create_table('supplier_product_sku_participations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('product_sku_id', sa.String(36), sa.ForeignKey('product_skus.id', ondelete='CASCADE'), nullable=False),
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
        
        sa.UniqueConstraint('product_sku_id', 'supplier_id', name='uq_supplier_product_sku_participation'),
        sa.Index('idx_supplier_product_sku_participations_supplier', 'supplier_id'),
        sa.Index('idx_supplier_product_sku_participations_active', 'is_active', 'updated_at'),
        sa.Index('idx_supplier_product_sku_participations_sku', 'product_sku_id')
    )
    
    # 創建 Product SKU 審核記錄表
    op.create_table('product_sku_audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('product_sku_id', sa.String(36), sa.ForeignKey('product_skus.id'), nullable=False),
        sa.Column('action_type', sa.Enum('create', 'update', 'convert_to_public', 'approve', 'reject', name='audit_action_type_product'), nullable=False),
        sa.Column('requested_by', sa.String(36), nullable=False, comment='請求用戶 ID'),
        sa.Column('requested_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('reviewed_by', sa.String(36), nullable=True, comment='審核用戶 ID'),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', name='audit_status_product'), nullable=False, server_default='pending'),
        sa.Column('change_details', sa.JSON(), nullable=False, comment='變更詳情'),
        sa.Column('review_comments', sa.Text(), nullable=True, comment='審核意見'),
        
        sa.Index('idx_product_sku_audit_status', 'status'),
        sa.Index('idx_product_sku_audit_sku', 'product_sku_id'),
        sa.Index('idx_product_sku_audit_requested_by', 'requested_by')
    )
    
    # 為 product_skus 表添加索引以優化查詢性能
    op.create_index('idx_product_skus_type_status', 'product_skus', ['type', 'approval_status'])
    op.create_index('idx_product_skus_creator', 'product_skus', ['creator_type', 'creator_id'])
    
    # 遷移現有資料：設定所有現有 SKU 為獨占型且已審核
    op.execute("UPDATE product_skus SET type = 'private', approval_status = 'approved' WHERE type IS NULL")


def downgrade() -> None:
    # 移除添加的索引
    op.drop_index('idx_product_skus_creator', 'product_skus')
    op.drop_index('idx_product_skus_type_status', 'product_skus')
    
    # 移除新創建的表
    op.drop_table('product_sku_audit_logs')
    op.drop_table('supplier_product_sku_participations')
    
    # 移除 product_skus 表的新欄位
    op.drop_column('product_skus', 'version')
    op.drop_column('product_skus', 'approved_at')
    op.drop_column('product_skus', 'approved_by')
    op.drop_column('product_skus', 'approval_status')
    op.drop_column('product_skus', 'standard_info')
    op.drop_column('product_skus', 'creator_id')
    op.drop_column('product_skus', 'creator_type')
    op.drop_column('product_skus', 'type')
    
    # 移除 ENUM 類型
    op.execute("DROP TYPE IF EXISTS sku_type_product")
    op.execute("DROP TYPE IF EXISTS creator_type_product")
    op.execute("DROP TYPE IF EXISTS approval_status_product")
    op.execute("DROP TYPE IF EXISTS audit_action_type_product")
    op.execute("DROP TYPE IF EXISTS audit_status_product")