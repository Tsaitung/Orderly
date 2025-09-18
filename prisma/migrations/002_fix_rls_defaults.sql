-- Fix RLS policies to deny access by default when no context is set
-- This prevents unauthorized access when session variables are empty

-- Update the helper functions to be more restrictive
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS text AS $$
DECLARE
  org_id text;
BEGIN
  -- Extract organization_id from current JWT token claims
  org_id := current_setting('app.current_organization_id', true);
  
  -- Return null if empty string or null to force denial
  IF org_id IS NULL OR org_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS text AS $$
DECLARE
  user_id text;
BEGIN
  -- Extract user_id from current JWT token claims
  user_id := current_setting('app.current_user_id', true);
  
  -- Return null if empty string or null to force denial
  IF user_id IS NULL OR user_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean AS $$
DECLARE
  is_admin text;
BEGIN
  is_admin := current_setting('app.is_platform_admin', true);
  
  -- Only return true if explicitly set to 'true'
  RETURN COALESCE(is_admin::boolean, false) AND is_admin = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to recreate them with better defaults
DROP POLICY IF EXISTS organizations_policy ON organizations;
DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS products_policy ON products;
DROP POLICY IF EXISTS orders_policy ON orders;
DROP POLICY IF EXISTS order_items_policy ON order_items;
DROP POLICY IF EXISTS reconciliations_policy ON reconciliations;
DROP POLICY IF EXISTS reconciliation_items_policy ON reconciliation_items;
DROP POLICY IF EXISTS erp_sync_logs_policy ON erp_sync_logs;
DROP POLICY IF EXISTS notifications_policy ON notifications;
DROP POLICY IF EXISTS audit_logs_policy ON audit_logs;
DROP POLICY IF EXISTS file_uploads_policy ON file_uploads;

-- Recreate policies with stricter defaults
-- Organizations policy - must have valid context
CREATE POLICY organizations_policy ON organizations
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR 
    (current_user_organization_id() IS NOT NULL AND id = current_user_organization_id())
  );

-- Users policy - must have valid context
CREATE POLICY users_policy ON users
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR 
    (current_user_organization_id() IS NOT NULL AND "organizationId" = current_user_organization_id())
  );

-- Products policy - must have valid context and relationship
CREATE POLICY products_policy ON products
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_organization_id() IS NOT NULL AND "supplierId" = current_user_organization_id()) OR
    (current_user_organization_id() IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders o 
      WHERE o."supplierId" = products."supplierId" 
      AND o."restaurantId" = current_user_organization_id()
    ))
  );

-- Orders policy - must have valid context and be involved in order
CREATE POLICY orders_policy ON orders
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_organization_id() IS NOT NULL AND 
     ("restaurantId" = current_user_organization_id() OR 
      "supplierId" = current_user_organization_id()))
  );

-- Order items policy - must have valid context through order
CREATE POLICY order_items_policy ON order_items
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_organization_id() IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_items."orderId" 
      AND (o."restaurantId" = current_user_organization_id() OR 
           o."supplierId" = current_user_organization_id())
    ))
  );

-- Reconciliations policy - must have valid context and be involved
CREATE POLICY reconciliations_policy ON reconciliations
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_organization_id() IS NOT NULL AND 
     ("restaurantId" = current_user_organization_id() OR 
      "supplierId" = current_user_organization_id()))
  );

-- Reconciliation items policy - must have valid context through reconciliation
CREATE POLICY reconciliation_items_policy ON reconciliation_items
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_organization_id() IS NOT NULL AND EXISTS (
      SELECT 1 FROM reconciliations r 
      WHERE r.id = reconciliation_items."reconciliationId" 
      AND (r."restaurantId" = current_user_organization_id() OR 
           r."supplierId" = current_user_organization_id())
    ))
  );

-- ERP sync logs policy - must have valid context for own organization
CREATE POLICY erp_sync_logs_policy ON erp_sync_logs
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_organization_id() IS NOT NULL AND "organizationId" = current_user_organization_id())
  );

-- Notifications policy - must have valid context for own notifications
CREATE POLICY notifications_policy ON notifications
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_id() IS NOT NULL AND "userId" = current_user_id()) OR
    (current_user_organization_id() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = notifications."userId" 
      AND u."organizationId" = current_user_organization_id()
    ))
  );

-- Audit logs policy - must have valid context for organization's audit trail
CREATE POLICY audit_logs_policy ON audit_logs
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_id() IS NOT NULL AND "userId" = current_user_id()) OR
    (current_user_organization_id() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = audit_logs."userId" 
      AND u."organizationId" = current_user_organization_id()
    ))
  );

-- File uploads policy - must have valid context for organization's files
CREATE POLICY file_uploads_policy ON file_uploads
  FOR ALL 
  TO PUBLIC
  USING (
    is_platform_admin() OR
    (current_user_id() IS NOT NULL AND "uploadedBy" = current_user_id()) OR
    (current_user_organization_id() IS NOT NULL AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = file_uploads."uploadedBy" 
      AND u."organizationId" = current_user_organization_id()
    ))
  );