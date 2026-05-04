-- Phase 1: DB-Driven Logo/Home-Link Configuration
-- Migration: 20260505_0902_workspace_header_home_route_default.sql
-- Purpose: Ensure workspace.header has default homeRoute value in props
--
-- This migration ensures that all workspace.header bindings have a default
-- homeRoute value of /workspace-home in their props, eliminating the need
-- for hardcoded fallbacks in the frontend shell-host component.

-- Update existing workspace.header rows to include homeRoute default
UPDATE dos.workspace_shell_binding
SET props = COALESCE(props, '{}'::jsonb) || '{"homeRoute":"/workspace-home"}'::jsonb
WHERE component_key = 'workspace.header'
  AND (props->>'homeRoute') IS NULL;

-- Ensure all active tenants have workspace.header binding with homeRoute
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
ON CONFLICT (tenant_id, component_key) DO UPDATE
SET props = EXCLUDED.props || '{"homeRoute":"/workspace-home"}'::jsonb;
