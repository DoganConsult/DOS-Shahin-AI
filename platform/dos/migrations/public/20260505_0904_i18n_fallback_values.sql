-- Phase 1: DB-Driven Logo/Home-Link Configuration
-- Migration: 20260505_0904_i18n_fallback_values.sql
-- Purpose: Create i18n_fallback_values table for DB-driven i18n fallback values
--
-- This migration creates a new table to store i18n fallback values with
-- tenant-specific and global (tenant_id=NULL) support, eliminating hardcoded
-- i18n fallback maps in the frontend workspace-resolver.

-- Create i18n_fallback_values table
CREATE TABLE IF NOT EXISTS dos.i18n_fallback_values (
  id BIGSERIAL PRIMARY KEY,
  i18n_key VARCHAR(255) NOT NULL,
  fallback_value_en TEXT NOT NULL,
  fallback_value_ar TEXT,
  tenant_id VARCHAR(255), -- NULL = global default
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(i18n_key, tenant_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_i18n_fallback_values_key ON dos.i18n_fallback_values(i18n_key);
CREATE INDEX IF NOT EXISTS idx_i18n_fallback_values_tenant ON dos.i18n_fallback_values(tenant_id);
CREATE INDEX IF NOT EXISTS idx_i18n_fallback_values_enabled ON dos.i18n_fallback_values(enabled);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION dos.update_i18n_fallback_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_i18n_fallback_values_updated_at ON dos.i18n_fallback_values;
CREATE TRIGGER trg_i18n_fallback_values_updated_at
  BEFORE UPDATE ON dos.i18n_fallback_values
  FOR EACH ROW
  EXECUTE FUNCTION dos.update_i18n_fallback_values_updated_at();

-- Seed global defaults for shell chrome i18n keys
INSERT INTO dos.i18n_fallback_values (i18n_key, fallback_value_en, fallback_value_ar, tenant_id)
VALUES 
  ('shell.header.home_route', '/workspace-home', '/الصفحة-الرئيسية', NULL),
  ('shell.header.brand', 'Shahin-AI', 'شاهين-أي', NULL),
  ('shell.header.workspace_title', 'Workspace', 'مساحة العمل', NULL),
  ('shell.header.account_action', 'Account', 'الحساب', NULL),
  ('shell.header.hide_navigation', 'Hide navigation', 'إخفاء التنقل', NULL),
  ('shell.header.show_navigation', 'Show navigation', 'إظهار التنقل', NULL),
  ('shell.header.expand_sidebar', 'Expand sidebar', 'توسيع الشريط الجانبي', NULL),
  ('shell.header.collapse_to_rail', 'Collapse to rail', 'طي إلى شريط', NULL),
  ('shell.breadcrumb.aria', 'Breadcrumb', 'مسار التنقل', NULL),
  ('shell.skeleton.loading_page', 'Loading page', 'جاري تحميل الصفحة', NULL),
  ('shell.drawer.title', 'Navigation', 'التنقل', NULL),
  ('shell.drawer.close', 'Close', 'إغلاق', NULL),
  ('shell.mobile_bottom_nav.aria', 'Bottom navigation', 'التنقل السفلي', NULL),
  ('shell.sidenav.aria_label', 'Workspace side navigation', 'التنقل الجانبي لمساحة العمل', NULL),
  ('shell.command.aria', 'Command search', 'بحث الأوامر', NULL),
  ('shell.command.placeholder', 'Search routes, records, actions…', 'البحث عن المسارات والسجلات والإجراءات…', NULL)
ON CONFLICT (i18n_key, tenant_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE dos.i18n_fallback_values IS 'I18n fallback values with tenant-specific overrides. NULL tenant_id = global default. Eliminates hardcoded i18n maps.';
COMMENT ON COLUMN dos.i18n_fallback_values.tenant_id IS 'NULL = global default, specific value = tenant override';
COMMENT ON COLUMN dos.i18n_fallback_values.fallback_value_en IS 'English fallback value';
COMMENT ON COLUMN dos.i18n_fallback_values.fallback_value_ar IS 'Arabic fallback value (optional)';
