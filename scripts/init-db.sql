-- Initialize Orderly Database
-- This script runs when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application user (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'orderly_app') THEN
        CREATE ROLE orderly_app WITH LOGIN PASSWORD 'orderly_app_password';
    END IF;
END $$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE orderly TO orderly_app;
GRANT USAGE ON SCHEMA public TO orderly_app;
GRANT CREATE ON SCHEMA public TO orderly_app;

-- Create schemas for different services (if using multi-schema approach)
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS products;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS notifications;

-- Grant permissions on schemas
GRANT USAGE, CREATE ON SCHEMA users TO orderly_app;
GRANT USAGE, CREATE ON SCHEMA orders TO orderly_app;
GRANT USAGE, CREATE ON SCHEMA products TO orderly_app;
GRANT USAGE, CREATE ON SCHEMA billing TO orderly_app;
GRANT USAGE, CREATE ON SCHEMA notifications TO orderly_app;

-- Set default search path
ALTER ROLE orderly_app SET search_path TO public, users, orders, products, billing, notifications;

-- Log the initialization
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0);

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS json AS $$
BEGIN
    RETURN json_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'database', current_database(),
        'version', version(),
        'connections', (SELECT count(*) FROM pg_stat_activity)
    );
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function for tracking changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = NOW();
        NEW.updated_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;