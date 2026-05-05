-- Migration: 20260505_risk_contract_pack_seed.sql
-- Purpose: Apply contract pack seed for risk module (dynamic UI OS process)
-- Based on: platform/ui-system/module_ui_os_contract-pack/risk-complete-direct-seed.md

BEGIN;

-- 1. module_registry (column set: module_code, product_key, display_name, status)
INSERT INTO dos.module_registry (module_code, product_key, display_name, status)
VALUES ('risk', 'agrc', 'Risk Management', 'active')
ON CONFLICT (module_code) DO UPDATE SET status='active';

-- 2. navigation_registry parent (real columns: nav_item_code, module_code, parent_code, route, label_en, label_ar, sort_order)
INSERT INTO dos.navigation_registry (module_code, nav_item_code, label_en, label_ar, route, parent_code, sort_order)
VALUES ('risk', 'grc.risk', 'Risk Management', 'إدارة المخاطر', '/risk', NULL, 30)
ON CONFLICT DO NOTHING;

-- 3. navigation_registry children (one row per child page)
INSERT INTO dos.navigation_registry (module_code, nav_item_code, label_en, label_ar, route, parent_code, sort_order) VALUES
  ('risk', 'risk.overview', 'Overview', 'نظرة عامة', '/risk/overview', 'grc.risk', 10),
  ('risk', 'risk.register', 'Risk Register', 'سجل المخاطر', '/risk/register', 'grc.risk', 20),
  ('risk', 'risk.assessments', 'Assessments', 'التقييمات', '/risk/assessments', 'grc.risk', 30),
  ('risk', 'risk.heatmap', 'Heatmap', 'الخريطة الحرارية', '/risk/heatmap', 'grc.risk', 40),
  ('risk', 'risk.treatments', 'Treatments', 'المعالجات', '/risk/treatments', 'grc.risk', 50),
  ('risk', 'risk.records', 'Records', 'السجلات', '/risk/records', 'grc.risk', 60),
  ('risk', 'risk.workflows', 'Workflows', 'سير العمل', '/risk/workflows', 'grc.risk', 70),
  ('risk', 'risk.reports', 'Reports', 'التقارير', '/risk/reports', 'grc.risk', 80),
  ('risk', 'risk.settings', 'Settings', 'الإعدادات', '/risk/settings', 'grc.risk', 90)
ON CONFLICT DO NOTHING;

-- 4. dynamic_ui_routes — permission_key MUST be 3+ dotted segments, use path_pattern (not route)
-- Unique constraint is on (module_code, path_pattern) WHERE tenant_id IS NULL
INSERT INTO dos.dynamic_ui_routes (path_pattern, component_key, permission_key, module_code, sort_order, tenant_id) VALUES
  ('/risk', 'module.entry.page', 'risk.record.read', 'risk', 10, NULL),
  ('/risk/overview', 'module.overview.page', 'risk.record.read', 'risk', 20, NULL),
  ('/risk/register', 'RiskRegisterPage', 'risk.record.read', 'risk', 30, NULL),
  ('/risk/assessments', 'RiskAssessmentsPage', 'risk.assessment.create', 'risk', 40, NULL),
  ('/risk/heatmap', 'RiskHeatmapPage', 'risk.record.read', 'risk', 50, NULL),
  ('/risk/treatments', 'RiskTreatmentsPage', 'risk.treatment.assign', 'risk', 60, NULL),
  ('/risk/records', 'module.records.page', 'risk.record.read', 'risk', 70, NULL),
  ('/risk/workflows', 'module.workflows.page', 'risk.manage', 'risk', 80, NULL),
  ('/risk/reports', 'module.reports.page', 'risk.record.read', 'risk', 90, NULL),
  ('/risk/settings', 'module.settings.page', 'risk.manage', 'risk', 100, NULL)
ON CONFLICT (module_code, path_pattern) WHERE tenant_id IS NULL DO UPDATE SET component_key=EXCLUDED.component_key, permission_key=EXCLUDED.permission_key;

-- 5. dynamic_ui_component_registry — INSERT only with vendor='ibm-carbon'
INSERT INTO dos.dynamic_ui_component_registry (component_key, vendor, carbon_key, approval_status) VALUES
  ('module.entry.page', 'ibm-carbon', 'tiles', 'approved'),
  ('module.overview.page', 'ibm-carbon', 'tiles', 'approved'),
  ('module.records.page', 'ibm-carbon', 'table', 'approved'),
  ('module.workflows.page', 'ibm-carbon', 'tabs', 'approved'),
  ('module.reports.page', 'ibm-carbon', 'tiles', 'approved'),
  ('module.settings.page', 'ibm-carbon', 'tabs', 'approved'),
  ('RiskRegisterPage', 'ibm-carbon', 'tiles', 'approved'),
  ('RiskAssessmentsPage', 'ibm-carbon', 'tiles', 'approved'),
  ('RiskHeatmapPage', 'ibm-carbon', 'tiles', 'approved'),
  ('RiskTreatmentsPage', 'ibm-carbon', 'tiles', 'approved')
ON CONFLICT (component_key) DO UPDATE SET carbon_key=EXCLUDED.carbon_key, approval_status='approved';

-- 6. permissions — only insert if missing; respect <module>.<entity>.<verb> 3-segment convention
-- permission_id is the primary key and must be provided
INSERT INTO platform_dauth.permissions (permission_id, permission_code, description) VALUES
  ('risk.record.read', 'risk.record.read', 'Read risk records'),
  ('risk.record.write', 'risk.record.write', 'Edit risk records'),
  ('risk.record.update', 'risk.record.update', 'Update risk records'),
  ('risk.record.submit', 'risk.record.submit', 'Submit risk records'),
  ('risk.record.configure', 'risk.record.configure', 'Configure risk module'),
  ('risk.assessment.create', 'risk.assessment.create', 'Create risk assessments'),
  ('risk.assessment.approve', 'risk.assessment.approve', 'Approve risk assessments'),
  ('risk.treatment.assign', 'risk.treatment.assign', 'Assign risk treatments'),
  ('risk.register.read', 'risk.register.read', 'Read risk register'),
  ('risk.workflow.manage', 'risk.workflow.manage', 'Manage risk workflows/settings'),
  ('risk.workflow.approve', 'risk.workflow.approve', 'Approve risk workflow')
ON CONFLICT (permission_code) DO UPDATE SET description=EXCLUDED.description;

-- 7. role_permissions — bind to existing roles (only if not already bound)
INSERT INTO platform_dauth.role_permissions (role_id, permission_id) VALUES
  ('platform_super_admin', 'risk.record.read'),
  ('platform_super_admin', 'risk.record.write'),
  ('platform_super_admin', 'risk.record.update'),
  ('platform_super_admin', 'risk.record.submit'),
  ('platform_super_admin', 'risk.record.configure'),
  ('platform_super_admin', 'risk.assessment.create'),
  ('platform_super_admin', 'risk.assessment.approve'),
  ('platform_super_admin', 'risk.treatment.assign'),
  ('platform_super_admin', 'risk.register.read'),
  ('platform_super_admin', 'risk.workflow.manage'),
  ('platform_super_admin', 'risk.workflow.approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 8. tenant_module_entitlements — per tenant, product_code='shahin-ai'
-- Unique constraint is on (tenant_id, product_code, module_code) WHERE entitlement_status = 'active'
-- entitlement_id is the primary key and must be provided
INSERT INTO dos.tenant_module_entitlements (entitlement_id, tenant_id, module_code, product_code, entitlement_status)
SELECT 
  CONCAT(tenant_id, '-risk') as entitlement_id,
  tenant_id, 
  'risk', 
  'shahin-ai', 
  'active'
FROM dos.tenants
WHERE status = 'active'
ON CONFLICT (tenant_id, product_code, module_code) WHERE entitlement_status = 'active' DO UPDATE SET entitlement_status='active';

-- Self-assertion
DO $$
BEGIN
  -- Verify module_registry
  IF NOT EXISTS (SELECT 1 FROM dos.module_registry WHERE module_code = 'risk') THEN
    RAISE EXCEPTION 'Module risk not found in module_registry';
  END IF;
  
  -- Verify navigation_registry parent
  IF NOT EXISTS (SELECT 1 FROM dos.navigation_registry WHERE nav_item_code = 'grc.risk') THEN
    RAISE EXCEPTION 'Navigation parent grc.risk not found';
  END IF;
  
  -- Verify navigation_registry children
  IF (SELECT COUNT(*) FROM dos.navigation_registry WHERE module_code = 'risk' AND parent_code = 'grc.risk') < 9 THEN
    RAISE EXCEPTION 'Navigation children count mismatch: expected at least 9, found %', 
      (SELECT COUNT(*) FROM dos.navigation_registry WHERE module_code = 'risk' AND parent_code = 'grc.risk');
  END IF;
  
  -- Verify dynamic_ui_routes
  IF (SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE module_code = 'risk') < 10 THEN
    RAISE EXCEPTION 'Dynamic UI routes count mismatch: expected at least 10, found %',
      (SELECT COUNT(*) FROM dos.dynamic_ui_routes WHERE module_code = 'risk');
  END IF;
  
  -- Verify dynamic_ui_component_registry
  IF (SELECT COUNT(*) FROM dos.dynamic_ui_component_registry WHERE component_key LIKE '%Risk%' OR component_key LIKE 'module.%') < 10 THEN
    RAISE EXCEPTION 'Component registry count mismatch: expected at least 10 risk-related components';
  END IF;
  
  -- Verify permissions
  IF (SELECT COUNT(*) FROM platform_dauth.permissions WHERE permission_code LIKE 'risk.%') < 11 THEN
    RAISE EXCEPTION 'Permissions count mismatch: expected at least 11 risk permissions, found %',
      (SELECT COUNT(*) FROM platform_dauth.permissions WHERE permission_code LIKE 'risk.%');
  END IF;
  
  RAISE NOTICE 'Risk module contract pack seed verification passed';
END $$;

COMMIT;
