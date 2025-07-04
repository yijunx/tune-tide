-- 1. Create the database
CREATE DATABASE "local-db";

-- 2. Connect to the database
\c "local-db";

-- 3. Create the user and grant permissions
CREATE USER "local-user" WITH PASSWORD 'local-password';

-- 4. Revoke access to the public schema
REVOKE ALL ON SCHEMA public FROM public;
DROP SCHEMA public CASCADE;

-- 5. Create and set up the "myschema" schema
CREATE SCHEMA myschema AUTHORIZATION "local-user";
GRANT ALL ON SCHEMA myschema TO "local-user";
ALTER ROLE "local-user" SET search_path TO myschema;

-- 6. Enable required PostgreSQL extensions
-- the below vector is not working, i give up first.. no time for it..
-- CREATE EXTENSION IF NOT EXISTS vector;
-- allow using index for fuzzy search (in string)
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA myschema;

-- 7. Confirm
SELECT 'Database setup complete' AS status;
