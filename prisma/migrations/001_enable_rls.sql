-- 井然 Orderly - Row Level Security Setup
-- Enable multi-tenant data isolation
-- Created: 2025-09-18

-- Enable Row Level Security on all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Create a function to get current user's organization ID from JWT
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS text AS $$
BEGIN
  -- Extract organization_id from current JWT token claims
  -- This will be set by the application layer when establishing connection
  RETURN COALESCE(
    current_setting('app.current_organization_id', true),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get current user ID from JWT
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS text AS $$
BEGIN
  -- Extract user_id from current JWT token claims
  RETURN COALESCE(
    current_setting('app.current_user_id', true),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.is_platform_admin', true)::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Organizations table
-- Platform admins can see all organizations
-- Users can only see their own organization
CREATE POLICY organizations_policy ON organizations
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR 
    id = current_user_organization_id()
  );

-- RLS Policies for Users table
-- Platform admins can see all users
-- Users can only see users from their own organization
CREATE POLICY users_policy ON users
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR 
    "organizationId" = current_user_organization_id()
  );

-- RLS Policies for Products table
-- Users can see products from suppliers they work with
-- Suppliers can see their own products
-- Restaurants can see products from their suppliers
CREATE POLICY products_policy ON products
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "supplierId" = current_user_organization_id() OR
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o."supplierId" = products."supplierId" 
      AND o."restaurantId" = current_user_organization_id()
    )
  );

-- RLS Policies for Orders table
-- Users can only see orders involving their organization
CREATE POLICY orders_policy ON orders
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "restaurantId" = current_user_organization_id() OR
    "supplierId" = current_user_organization_id()
  );

-- RLS Policies for Order Items table
-- Access follows order access rules
CREATE POLICY order_items_policy ON order_items
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_items."orderId" 
      AND (o."restaurantId" = current_user_organization_id() OR 
           o."supplierId" = current_user_organization_id())
    )
  );

-- RLS Policies for Reconciliations table
-- Users can only see reconciliations involving their organization
CREATE POLICY reconciliations_policy ON reconciliations
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "restaurantId" = current_user_organization_id() OR
    "supplierId" = current_user_organization_id()
  );

-- RLS Policies for Reconciliation Items table
-- Access follows reconciliation access rules
CREATE POLICY reconciliation_items_policy ON reconciliation_items
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM reconciliations r 
      WHERE r.id = reconciliation_items."reconciliationId" 
      AND (r."restaurantId" = current_user_organization_id() OR 
           r."supplierId" = current_user_organization_id())
    )
  );

-- RLS Policies for ERP Sync Logs table
-- Users can only see logs for their organization
CREATE POLICY erp_sync_logs_policy ON erp_sync_logs
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "organizationId" = current_user_organization_id()
  );

-- RLS Policies for Notifications table
-- Users can only see their own notifications
CREATE POLICY notifications_policy ON notifications
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "userId" = current_user_id() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = notifications."userId" 
      AND u."organizationId" = current_user_organization_id()
    )
  );

-- RLS Policies for Audit Logs table
-- Users can see audit logs for their organization's data
CREATE POLICY audit_logs_policy ON audit_logs
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "userId" = current_user_id() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = audit_logs."userId" 
      AND u."organizationId" = current_user_organization_id()
    )
  );

-- RLS Policies for File Uploads table
-- Users can see files uploaded by their organization
CREATE POLICY file_uploads_policy ON file_uploads
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    "uploadedBy" = current_user_id() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = file_uploads."uploadedBy" 
      AND u."organizationId" = current_user_organization_id()
    )
  );

-- Create indexes to optimize RLS policy performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_organization_id ON users("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_supplier_id ON products("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_supplier ON orders("restaurantId", "supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reconciliations_restaurant_supplier ON reconciliations("restaurantId", "supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads("uploadedBy");

-- Grant necessary permissions to application role
-- Create application role if it doesn't exist
DO $$ BEGIN
  CREATE ROLE orderly_app;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Grant permissions to application role
GRANT CONNECT ON DATABASE orderly TO orderly_app;
GRANT USAGE ON SCHEMA public TO orderly_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO orderly_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO orderly_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO orderly_app;