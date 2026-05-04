-- Phase 1: DB-Driven Logo/Home-Link Configuration
-- Migration: 20260505_0903_tenant_landing_config.sql
-- Purpose: Create tenant_landing_config table for DB-driven landing page routes
--
-- This migration creates a new table to store tenant-specific landing page
-- configuration for different auth states, eliminating hardcoded route
-- fallbacks in the landingGuard and PostAuthOrchestrator.

-- Create tenant_landing_config table
CREATE TABLE IF NOT EXISTS dos.tenant_landing_config (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL UNIQUE,
  authenticated_route VARCHAR(255) NOT NULL DEFAULT '/workspace-home',
  unauthenticated_route VARCHAR(255) NOT NULL DEFAULT '/',
  session_expired_route VARCHAR(255) NOT NULL DEFAULT '/',
  post_auth_route VARCHAR(255), -- Specific route for post-auth flows
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tenant_landing_config_tenant_id ON dos.tenant_landing_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_landing_config_enabled ON dos.tenant_landing_config(enabled);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION dos.update_tenant_landing_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_landing_config_updated_at ON dos.tenant_landing_config;
CREATE TRIGGER trg_tenant_landing_config_updated_at
  BEFORE UPDATE ON dos.tenant_landing_config
  FOR EACH ROW
  EXECUTE FUNCTION dos.update_tenant_landing_config_updated_at();

-- Seed defaults for all active tenants
INSERT INTO dos.tenant_landing_config (tenant_id, authenticated_route, unauthenticated_route, session_expired_route, post_auth_route)
SELECT 
  tenant_id,
  '/workspace-home' as authenticated_route,
  '/' as unauthenticated_route,
  '/' as session_expired_route,
  '/workspace-home' as post_auth_route
FROM dos.tenants WHERE status='active'
ON CONFLICT (tenant_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE dos.tenant_landing_config IS 'Tenant-specific landing page configuration for different auth states. Eliminates hardcoded route fallbacks.';
COMMENT ON COLUMN dos.tenant_landing_config.authenticated_route IS 'Route for authenticated users (e.g., /workspace-home, /admin-hub)';
COMMENT ON COLUMN dos.tenant_landing_config.unauthenticated_route IS 'Route for unauthenticated users (e.g., /)';
COMMENT ON COLUMN dos.tenant_landing_config.session_expired_route IS 'Route when session expires (e.g., /)';
COMMENT ON COLUMN dos.tenant_landing_config.post_auth_route IS 'Route after successful authentication (overrides authenticated_route)';
