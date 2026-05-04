-- Phase 1: DB-Driven Logo/Home-Link Configuration
-- Migration: 20260505_0901_marketing_logo_href.sql
-- Purpose: Add logoHref to marketing.home.page props for DB-driven logo destination
--
-- This migration adds support for configuring the marketing landing page header logo href
-- via the dos.ui_route_template_binding table, allowing tenant-specific
-- customization of the logo click destination without hardcoding.

-- Add logoHref to props for marketing-landing archetype (/ route)
UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || '{"logoHref":"/"}'::jsonb
WHERE route = '/' 
  AND archetype = 'marketing-landing'
  AND (props->>'logoHref') IS NULL;

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for route configuration. For marketing-landing: {logoHref, ...}';
