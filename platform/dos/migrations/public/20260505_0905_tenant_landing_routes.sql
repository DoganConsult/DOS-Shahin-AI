-- Phase 1: DB-Driven Logo/Home-Link Configuration
-- Migration: 20260505_0905_tenant_landing_routes.sql
-- Purpose: Add landing route configuration for tenants and members
--
-- Note: This migration requires owner permissions to alter the tenants table.
-- If running as a non-owner, the ALTER TABLE statements will fail.
-- The dos.tenant_memberships table exists (not dos.memberships).
-- The tenants table uses 'tenant_code' column (not 'code').

-- Add default_landing_route to tenants table (requires owner permission)
-- ALTER TABLE dos.tenants 
-- ADD COLUMN IF NOT EXISTS default_landing_route VARCHAR(255) DEFAULT '/workspace-home';

-- Add landing_route_override to tenant_memberships table (requires owner permission)
-- ALTER TABLE dos.tenant_memberships 
-- ADD COLUMN IF NOT EXISTS landing_route_override VARCHAR(255);

-- Seed platform-admin tenant with /admin-hub default (if column exists)
-- UPDATE dos.tenants 
-- SET default_landing_route = '/admin-hub'
-- WHERE tenant_code = 'platform-admin' 
--   AND default_landing_route = '/workspace-home';

-- Add indexes for performance (if columns exist)
-- CREATE INDEX IF NOT EXISTS idx_tenants_default_landing_route ON dos.tenants(default_landing_route);
-- CREATE INDEX IF NOT EXISTS idx_tenant_memberships_landing_route_override ON dos.tenant_memberships(landing_route_override);

-- Add comments (if columns exist)
-- COMMENT ON COLUMN dos.tenants.default_landing_route IS 'Default landing route for all members of this tenant. Overrides /workspace-home default.';
-- COMMENT ON COLUMN dos.tenant_memberships.landing_route_override IS 'Per-member landing route override. Overrides tenant default. Highest priority.';

-- NOTE: This migration is partially complete. The ALTER TABLE statements require
-- owner permissions and should be run by the database owner. The schema changes
-- are documented here for manual execution if needed.
