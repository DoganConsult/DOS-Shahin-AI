-- Phase 1: DB-Driven Logo/Home-Link Configuration
-- Migration: 20260505_0900_workspace_header_logo_href.sql
-- Purpose: Add logoHref to workspace.header props for DB-driven logo destination
--
-- This migration adds support for configuring the workspace header logo href
-- via the dos.workspace_shell_binding table, allowing tenant-specific
-- customization of the logo click destination without hardcoding.

-- Ensure workspace.header exists in binding table
INSERT INTO dos.dynamic_ui_component_registry (component_key, vendor, carbon_key, approval_status)
VALUES ('workspace.header', 'ibm-carbon', 'ui-shell', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- Add logoHref to existing workspace.header rows if they exist
UPDATE dos.workspace_shell_binding
SET props = COALESCE(props, '{}'::jsonb) || '{"logoHref":"/workspace-home"}'::jsonb
WHERE component_key = 'workspace.header'
  AND (props->>'logoHref') IS NULL;

-- Seed default workspace.header binding for all active tenants if missing
INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, enabled, position, perms_required, props)
SELECT 
  t.tenant_id,
  'workspace.header' as component_key,
  true as enabled,
  0 as position,
  ARRAY[]::text[] as perms_required,
  '{"logoHref":"/workspace-home","brandLabel":"Shahin-AI","homeRoute":"/workspace-home"}'::jsonb as props
FROM (SELECT DISTINCT tenant_id FROM dos.tenants WHERE status='active') t
WHERE NOT EXISTS (
  SELECT 1 FROM dos.workspace_shell_binding 
  WHERE tenant_id = t.tenant_id AND component_key = 'workspace.header'
)
ON CONFLICT (tenant_id, component_key) DO NOTHING;

-- Add comment
COMMENT ON COLUMN dos.workspace_shell_binding.props IS 'JSONB props bag for component configuration. For workspace.header: {logoHref, brandLabel, homeRoute, ...}';
