-- Initialize Orderly database
CREATE DATABASE IF NOT EXISTS orderly;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE orderly TO orderly;