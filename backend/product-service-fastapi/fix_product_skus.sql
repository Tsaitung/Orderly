-- Add missing columns to product_skus table
ALTER TABLE product_skus 
ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS creator_type VARCHAR DEFAULT 'platform',
ADD COLUMN IF NOT EXISTS creator_id VARCHAR,
ADD COLUMN IF NOT EXISTS standard_info JSONB,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by VARCHAR,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_skus_type ON product_skus(type);
CREATE INDEX IF NOT EXISTS idx_product_skus_creator_type ON product_skus(creator_type);
CREATE INDEX IF NOT EXISTS idx_product_skus_approval_status ON product_skus(approval_status);
CREATE INDEX IF NOT EXISTS idx_product_skus_is_active ON product_skus("isActive");
CREATE INDEX IF NOT EXISTS idx_product_skus_product_id ON product_skus("productId");