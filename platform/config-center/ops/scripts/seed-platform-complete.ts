/**
 * DOS Platform Complete Seed Script
 *
 * Populates ALL platform tables from monolith canonical seed data.
 * Run after migrations. Idempotent (ON CONFLICT DO NOTHING).
 *
 * Source: platform/dauth/access/rbac/ (roles, permissions, mappings, profiles)
 *         packs/base/v1/feature-flags.json
 *         products/shahin-ai/agrc-product.definition.ts
 *         migrations/master/093_product_modules.sql
 *
 * Usage: npx tsx ops/scripts/seed-platform-complete.ts
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc',
});

async function q(sql: string, params?: unknown[]) {
  return pool.query(sql, params);
}

// ═══════════════════════════════════════════════════════════════════
// 1. ROLES (12 canonical system roles)
// ═══════════════════════════════════════════════════════════════════

const ROLES = [
  { code: 'platform_super_admin', name: 'Platform Super Admin', module_code: 'platform', category: 'platform', tier: 'platform' },
  { code: 'tenant_admin', name: 'Tenant Admin', module_code: 'platform', category: 'platform', tier: 'tenant' },
  { code: 'security_admin', name: 'Security Admin', module_code: 'platform', category: 'platform', tier: 'tenant' },
  { code: 'compliance_officer', name: 'Compliance Officer', module_code: 'compliance', category: 'module', tier: 'module' },
  { code: 'risk_manager', name: 'Risk Manager', module_code: 'risk', category: 'module', tier: 'module' },
  { code: 'auditor', name: 'Auditor', module_code: 'audit', category: 'module', tier: 'module' },
  { code: 'policy_owner', name: 'Policy Owner', module_code: 'policy', category: 'module', tier: 'module' },
  { code: 'incident_manager', name: 'Incident Manager', module_code: 'incident', category: 'module', tier: 'module' },
  { code: 'vendor_manager', name: 'Vendor Manager', module_code: 'vendor', category: 'module', tier: 'module' },
  { code: 'standard_user', name: 'Standard User', module_code: 'platform', category: 'platform', tier: 'tenant' },
  { code: 'viewer', name: 'Viewer', module_code: 'platform', category: 'platform', tier: 'tenant' },
  { code: 'workflow_admin', name: 'Workflow Admin', module_code: 'workflow', category: 'module', tier: 'module' },
];

// ═══════════════════════════════════════════════════════════════════
// 2. ACCESS PROFILES (4 default profiles)
// ═══════════════════════════════════════════════════════════════════

const ACCESS_PROFILES = [
  { code: 'platform_super_admin', name: 'Platform Super Admin Profile', description: 'Full platform access — all roles, all modules' },
  { code: 'tenant_admin', name: 'Tenant Admin Profile', description: 'Tenant administration — user management, module config, settings' },
  { code: 'standard_user', name: 'Standard User Profile', description: 'Default access — read-level access to assigned modules' },
  { code: 'viewer', name: 'Viewer Profile', description: 'Read-only access across enabled modules' },
];

// ═══════════════════════════════════════════════════════════════════
// 3. PRODUCT REGISTRY
// ═══════════════════════════════════════════════════════════════════

const PRODUCTS = [
  { code: 'agrc', name_en: 'Shahin-AI GRC Suite', name_ar: 'منصة شاهين للحوكمة والمخاطر والامتثال', version: '1.0.0', tier: 'enterprise' },
];

// ═══════════════════════════════════════════════════════════════════
// 4. MODULE REGISTRY (25+ canonical modules)
// ═══════════════════════════════════════════════════════════════════

const MODULES = [
  // Platform core (always-on)
  { code: 'foundation', name_en: 'Foundation', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'admin', name_en: 'Administration', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'workflow', name_en: 'Workflow Engine', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'notification', name_en: 'Notifications', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'dauth', name_en: 'Authentication & Authorization', category: 'platform', tier: 'platform', owner_layer: 'DAuth' },
  { code: 'reporting', name_en: 'Reporting', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'analytics', name_en: 'Analytics', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'onboarding', name_en: 'Onboarding', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'navigation', name_en: 'Navigation', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'dashboard', name_en: 'Dashboards', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'provisioning', name_en: 'Provisioning', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'config-center', name_en: 'Config Center', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  { code: 'integrations', name_en: 'Integrations', category: 'platform', tier: 'platform', owner_layer: 'DOS' },
  // Flagship GRC modules
  { code: 'governance', name_en: 'Governance', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'risk', name_en: 'Risk Management', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'compliance', name_en: 'Compliance', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'policy', name_en: 'Policy Management', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'audit', name_en: 'Audit', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'evidence', name_en: 'Evidence', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'incident', name_en: 'Incident Management', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'vendor', name_en: 'Vendor Management', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'bcp', name_en: 'Business Continuity', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'asset', name_en: 'Asset Management', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'controls', name_en: 'Controls', category: 'core_grc', tier: 'product', owner_layer: 'Product' },
  { code: 'exception', name_en: 'Exception Management', category: 'operational', tier: 'product', owner_layer: 'Product' },
  { code: 'remediation', name_en: 'Remediation', category: 'operational', tier: 'product', owner_layer: 'Product' },
  { code: 'action', name_en: 'Action Items', category: 'operational', tier: 'product', owner_layer: 'Product' },
  { code: 'training', name_en: 'Training', category: 'advanced', tier: 'product', owner_layer: 'Product' },
  { code: 'privacy', name_en: 'Privacy', category: 'advanced', tier: 'product', owner_layer: 'Product' },
  { code: 'qiyas', name_en: 'Qiyas (Maturity)', category: 'advanced', tier: 'product', owner_layer: 'Product' },
  // AI layer
  { code: 'ai', name_en: 'AI Engine', category: 'intelligence', tier: 'platform', owner_layer: 'DOS' },
  { code: 'ai-governance', name_en: 'AI Governance', category: 'intelligence', tier: 'platform', owner_layer: 'DOS' },
  { code: 'agrc-engine', name_en: 'AGRC Engine', category: 'intelligence', tier: 'platform', owner_layer: 'DOS' },
];

// ═══════════════════════════════════════════════════════════════════
// 5. FEATURE FLAGS (19 base pack flags)
// ═══════════════════════════════════════════════════════════════════

const FEATURE_FLAGS = [
  { code: 'agrc_engine_enabled', name: 'AGRC Compliance Engine', module: 'agrc-engine', default_value: true },
  { code: 'agrc_control_monitor_enabled', name: 'Control Monitoring', module: 'controls', default_value: true },
  { code: 'agrc_remediation_monitor_enabled', name: 'Remediation Tracking', module: 'remediation', default_value: true },
  { code: 'agrc_kri_monitor_enabled', name: 'KRI Monitoring', module: 'risk', default_value: true },
  { code: 'agrc_policy_review_enabled', name: 'Policy Review Scheduling', module: 'policy', default_value: true },
  { code: 'agrc_auto_task_creation_enabled', name: 'Auto Task Creation', module: 'workflow', default_value: true },
  { code: 'agrc_auto_notification_enabled', name: 'Auto Notifications', module: 'notification', default_value: true },
  { code: 'control_monitoring', name: 'Control Monitoring System', module: 'controls', default_value: true },
  { code: 'kri_breach_detection', name: 'KRI Breach Detection', module: 'risk', default_value: true },
  { code: 'policy_review_alerts', name: 'Policy Review Alerts', module: 'policy', default_value: true },
  { code: 'remediation_overdue', name: 'Remediation Overdue Tracking', module: 'remediation', default_value: true },
  { code: 'ai_copilot', name: 'AI Copilot', module: 'ai', default_value: true },
  { code: 'advanced_analytics', name: 'Advanced Analytics', module: 'analytics', default_value: true },
  { code: 'evidence_automation', name: 'Evidence Automation', module: 'evidence', default_value: true },
  { code: 'vendor_risk_scoring', name: 'Vendor Risk Scoring', module: 'vendor', default_value: true },
  { code: 'maturity_assessment', name: 'Maturity Assessment', module: 'qiyas', default_value: true },
  { code: 'autonomous_workflow', name: 'Autonomous Workflow', module: 'workflow', default_value: false },
  { code: 'ai_squad', name: 'AI Squad', module: 'ai', default_value: false },
  { code: 'incident_auto_triage', name: 'Incident Auto Triage', module: 'incident', default_value: false },
];

// ═══════════════════════════════════════════════════════════════════
// 6. NAVIGATION ENTRIES (sidebar for platform admin)
// ═══════════════════════════════════════════════════════════════════

const NAV_ENTRIES = [
  // Platform admin
  { code: 'admin.overview', label_en: 'Admin Overview', label_ar: 'نظرة عامة', icon: 'dashboard', route: '/admin/overview', module: 'admin', sort: 10, perm: 'admin.system.read' },
  { code: 'admin.users', label_en: 'User Management', label_ar: 'إدارة المستخدمين', icon: 'people', route: '/admin/users', module: 'admin', sort: 20, perm: 'platform.user.read' },
  { code: 'admin.roles', label_en: 'Roles & Permissions', label_ar: 'الأدوار والصلاحيات', icon: 'admin_panel_settings', route: '/admin/roles', module: 'admin', sort: 30, perm: 'platform.role.manage' },
  { code: 'admin.modules', label_en: 'Modules', label_ar: 'الوحدات', icon: 'extension', route: '/admin/modules', module: 'admin', sort: 40, perm: 'platform.module.enable' },
  { code: 'admin.products', label_en: 'Products', label_ar: 'المنتجات', icon: 'inventory_2', route: '/admin/products', module: 'admin', sort: 50, perm: 'platform.tenant.read' },
  { code: 'admin.config', label_en: 'Configuration', label_ar: 'الإعدادات', icon: 'settings', route: '/admin/config', module: 'config-center', sort: 60, perm: 'platform.settings.read' },
  { code: 'admin.flags', label_en: 'Feature Flags', label_ar: 'علامات المميزات', icon: 'flag', route: '/admin/flags', module: 'admin', sort: 70, perm: 'platform.settings.update' },
  { code: 'admin.audit', label_en: 'Audit Log', label_ar: 'سجل التدقيق', icon: 'receipt_long', route: '/admin/audit', module: 'admin', sort: 80, perm: 'platform.audit.read' },
  { code: 'admin.security', label_en: 'Security', label_ar: 'الأمان', icon: 'security', route: '/admin/security', module: 'dauth', sort: 90, perm: 'dauth.sod.manage' },
  { code: 'admin.provisioning', label_en: 'Provisioning', label_ar: 'التزويد', icon: 'rocket_launch', route: '/admin/provisioning', module: 'provisioning', sort: 100, perm: 'provisioning.manage' },
  { code: 'admin.workflows', label_en: 'Workflows', label_ar: 'مسارات العمل', icon: 'account_tree', route: '/admin/workflows', module: 'workflow', sort: 110, perm: 'workflow.definition.manage' },
  { code: 'admin.ai', label_en: 'AI & Agents', label_ar: 'الذكاء الاصطناعي', icon: 'smart_toy', route: '/admin/ai', module: 'ai', sort: 120, perm: 'ai.agent.manage' },
  { code: 'admin.integrations', label_en: 'Integrations', label_ar: 'التكاملات', icon: 'hub', route: '/admin/integrations', module: 'integrations', sort: 130, perm: 'integrations.connector.read' },
  { code: 'admin.notifications', label_en: 'Notifications', label_ar: 'الإشعارات', icon: 'notifications', route: '/admin/notifications', module: 'notification', sort: 140, perm: 'notification.config.read' },
  // GRC modules
  { code: 'grc.governance', label_en: 'Governance', label_ar: 'الحوكمة', icon: 'account_balance', route: '/governance', module: 'governance', sort: 200, perm: 'governance.record.read' },
  { code: 'grc.risk', label_en: 'Risk', label_ar: 'المخاطر', icon: 'warning', route: '/risk', module: 'risk', sort: 210, perm: 'risk.record.read' },
  { code: 'grc.compliance', label_en: 'Compliance', label_ar: 'الامتثال', icon: 'verified_user', route: '/compliance', module: 'compliance', sort: 220, perm: 'compliance.control.read' },
  { code: 'grc.audit', label_en: 'Audit', label_ar: 'التدقيق', icon: 'fact_check', route: '/audit', module: 'audit', sort: 230, perm: 'audit.record.read' },
  { code: 'grc.policy', label_en: 'Policy', label_ar: 'السياسات', icon: 'gavel', route: '/policy', module: 'policy', sort: 240, perm: 'policy.document.read' },
  { code: 'grc.evidence', label_en: 'Evidence', label_ar: 'الأدلة', icon: 'folder_open', route: '/evidence', module: 'evidence', sort: 250, perm: 'evidence.item.read' },
  { code: 'grc.incident', label_en: 'Incidents', label_ar: 'الحوادث', icon: 'report_problem', route: '/incident', module: 'incident', sort: 260, perm: 'incident.record.read' },
  { code: 'grc.vendor', label_en: 'Vendors', label_ar: 'الموردون', icon: 'storefront', route: '/vendor', module: 'vendor', sort: 270, perm: 'vendor.record.read' },
  { code: 'grc.bcp', label_en: 'BCP', label_ar: 'استمرارية الأعمال', icon: 'health_and_safety', route: '/bcp', module: 'bcp', sort: 280, perm: 'bcp.plan.read' },
  { code: 'grc.training', label_en: 'Training', label_ar: 'التدريب', icon: 'school', route: '/training', module: 'training', sort: 290, perm: 'training.record.read' },
];

// ═══════════════════════════════════════════════════════════════════
// 7. SLA DEFAULTS (4 priority tiers)
// ═══════════════════════════════════════════════════════════════════

const SLA_DEFAULTS = [
  { module: 'platform', entity: 'task', severity: 'critical', hours: 4, warning_pct: 75, name_en: 'Critical Task SLA', name_ar: 'اتفاقية مهمة حرجة' },
  { module: 'platform', entity: 'task', severity: 'high', hours: 24, warning_pct: 75, name_en: 'High Priority Task SLA', name_ar: 'اتفاقية مهمة عالية' },
  { module: 'platform', entity: 'task', severity: 'medium', hours: 72, warning_pct: 75, name_en: 'Medium Priority Task SLA', name_ar: 'اتفاقية مهمة متوسطة' },
  { module: 'platform', entity: 'task', severity: 'low', hours: 168, warning_pct: 75, name_en: 'Low Priority Task SLA', name_ar: 'اتفاقية مهمة منخفضة' },
];

// ═══════════════════════════════════════════════════════════════════
// 8. PLATFORM SETTINGS (defaults)
// ═══════════════════════════════════════════════════════════════════

const PLATFORM_SETTINGS = [
  { key: 'bootstrap.enforce_email_verification', value: 'true', scope: 'platform' },
  { key: 'bootstrap.session_timeout_minutes', value: '60', scope: 'platform' },
  { key: 'bootstrap.max_concurrent_sessions', value: '3', scope: 'platform' },
  { key: 'bootstrap.stale_session_cleanup_days', value: '7', scope: 'platform' },
  { key: 'provisioning.allow_mock_runner', value: 'false', scope: 'platform' },
  { key: 'workspace.strict_mode', value: 'false', scope: 'platform' },
  { key: 'notification.email_enabled', value: 'true', scope: 'platform' },
  { key: 'notification.smtp_from_platform', value: 'Dogan-AI-OS <info@doganconsult.com>', scope: 'platform' },
  { key: 'notification.smtp_from_product', value: 'Shahin-Ai <info@shahin-ai.com>', scope: 'platform' },
  { key: 'platform.default_language', value: 'en', scope: 'platform' },
  { key: 'platform.supported_languages', value: '["en","ar"]', scope: 'platform' },
  { key: 'platform.rtl_enabled', value: 'true', scope: 'platform' },
];

// ═══════════════════════════════════════════════════════════════════
// SEED RUNNER
// ═══════════════════════════════════════════════════════════════════

async function seed() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  DOS Platform Complete Seed                  ║');
  console.log('╚══════════════════════════════════════════════╝');

  // 1. Roles
  let roleCount = 0;
  for (const r of ROLES) {
    await q(`INSERT INTO dos.functional_roles (code, module_code, name, category) VALUES ($1, $2, $3, $4) ON CONFLICT (code, module_code) DO NOTHING`, [r.code, r.module_code, r.name, r.category]);
    roleCount++;
  }
  console.log(`  ✓ Roles: ${roleCount} seeded`);

  // 2. Access Profiles
  let profileCount = 0;
  for (const p of ACCESS_PROFILES) {
    await q(`INSERT INTO dos.access_profiles (code, name, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`, [p.code, p.name, p.description]);
    profileCount++;
  }
  console.log(`  ✓ Access Profiles: ${profileCount} seeded`);

  // 3. Products
  for (const p of PRODUCTS) {
    await q(`INSERT INTO dos.product_registry (code, name_en, name_ar, version, tier) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`, [p.code, p.name_en, p.name_ar, p.version, p.tier]);
  }
  console.log(`  ✓ Products: ${PRODUCTS.length} seeded`);

  // 4. Modules
  for (const m of MODULES) {
    await q(`INSERT INTO dos.module_registry (code, name_en, category, tier, owner_layer) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`, [m.code, m.name_en, m.category, m.tier, m.owner_layer]);
  }
  console.log(`  ✓ Modules: ${MODULES.length} seeded`);

  // 5. Permissions (544+ from canonical-permissions.ts — inline the critical ones)
  // We read the file and extract permission codes
  const permFile = await import('./seed-data/canonical-permissions');
  let permCount = 0;
  for (const p of permFile.CANONICAL_PERMISSIONS) {
    await q(`INSERT INTO dos.permissions (code, description, module_code, resource, action) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`, [p.code, p.name, p.module, p.resource, p.action]);
    permCount++;
  }
  console.log(`  ✓ Permissions: ${permCount} seeded`);

  // 6. Role → Permission Mappings
  const mapFile = await import('./seed-data/role-permission-map');
  let mapCount = 0;
  for (const [roleCode, permCodes] of Object.entries(mapFile.ROLE_PERMISSION_MAP)) {
    const roleResult = await q(`SELECT id FROM dos.functional_roles WHERE code = $1 LIMIT 1`, [roleCode]);
    if (roleResult.rows.length === 0) continue;
    const roleId = roleResult.rows[0].id;
    for (const permCode of permCodes as string[]) {
      const permResult = await q(`SELECT id FROM dos.permissions WHERE code = $1 LIMIT 1`, [permCode]);
      if (permResult.rows.length === 0) continue;
      await q(`INSERT INTO dos.role_permissions (functional_role_id, permission_id) VALUES ($1, $2) ON CONFLICT (functional_role_id, permission_id) DO NOTHING`, [roleId, permResult.rows[0].id]);
      mapCount++;
    }
  }
  console.log(`  ✓ Role→Permission Mappings: ${mapCount} seeded`);

  // 7. Feature Flags
  for (const f of FEATURE_FLAGS) {
    await q(`INSERT INTO dos.feature_flags (flag_code, name_en, module_code, default_value, enabled) VALUES ($1, $2, $3, $4, $4) ON CONFLICT (flag_code) DO NOTHING`, [f.code, f.name, f.module, f.default_value]);
  }
  console.log(`  ✓ Feature Flags: ${FEATURE_FLAGS.length} seeded`);

  // 8. Navigation Entries
  for (const n of NAV_ENTRIES) {
    await q(`INSERT INTO dos.navigation_registry (code, label_en, label_ar, icon, route, module_code, sort_order, required_permission) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (code) DO UPDATE SET label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar, icon = EXCLUDED.icon, route = EXCLUDED.route, sort_order = EXCLUDED.sort_order`, [n.code, n.label_en, n.label_ar, n.icon, n.route, n.module, n.sort, n.perm]);
  }
  console.log(`  ✓ Navigation: ${NAV_ENTRIES.length} entries seeded`);

  // 9. SLA Defaults
  for (const s of SLA_DEFAULTS) {
    await q(`INSERT INTO dos.module_sla_defaults (module_code, entity_type, severity, sla_hours, warning_pct, name_en, name_ar) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (module_code, entity_type, severity) DO NOTHING`, [s.module, s.entity, s.severity, s.hours, s.warning_pct, s.name_en, s.name_ar]);
  }
  console.log(`  ✓ SLA Defaults: ${SLA_DEFAULTS.length} seeded`);

  // 10. Platform Settings
  for (const s of PLATFORM_SETTINGS) {
    await q(`INSERT INTO dos.tenant_settings (key, value, scope) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [s.key, s.value, s.scope]);
  }
  console.log(`  ✓ Platform Settings: ${PLATFORM_SETTINGS.length} seeded`);

  // 11. Link admin user to platform_super_admin role + profile
  const adminUser = await q(`SELECT user_id FROM dos.users LIMIT 1`);
  if (adminUser.rows.length > 0) {
    const userId = adminUser.rows[0].user_id;
    const superRole = await q(`SELECT id FROM dos.functional_roles WHERE code = 'platform_super_admin' LIMIT 1`);
    const superProfile = await q(`SELECT id FROM dos.access_profiles WHERE code = 'platform_super_admin' LIMIT 1`);
    if (superRole.rows.length > 0) {
      await q(`INSERT INTO dos.user_role_assignments (user_id, role_code, is_active) VALUES ($1, 'platform_super_admin', TRUE) ON CONFLICT DO NOTHING`, [userId]);
    }
    if (superProfile.rows.length > 0) {
      await q(`INSERT INTO dos.user_access_profiles (user_id, access_profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, superProfile.rows[0].id]);
    }
    console.log(`  ✓ Admin user linked to platform_super_admin role + profile`);
  }

  // 12. Tenant product activation
  const tenant = await q(`SELECT tenant_id FROM dos.tenants LIMIT 1`);
  if (tenant.rows.length > 0) {
    const tenantId = tenant.rows[0].tenant_id;
    await q(`INSERT INTO dos.tenant_product_activation (tenant_id, product_code) VALUES ($1, 'agrc') ON CONFLICT DO NOTHING`, [tenantId]);
    console.log(`  ✓ Tenant ${tenantId} activated for product 'agrc'`);
  }

  // Final counts
  console.log('');
  console.log('  ── Final Counts ──');
  const counts = await q(`
    SELECT 'roles' AS t, count(*)::int AS c FROM dos.functional_roles
    UNION ALL SELECT 'permissions', count(*) FROM dos.permissions
    UNION ALL SELECT 'role_permissions', count(*) FROM dos.role_permissions
    UNION ALL SELECT 'access_profiles', count(*) FROM dos.access_profiles
    UNION ALL SELECT 'products', count(*) FROM dos.product_registry
    UNION ALL SELECT 'modules', count(*) FROM dos.module_registry
    UNION ALL SELECT 'feature_flags', count(*) FROM dos.feature_flags
    UNION ALL SELECT 'nav_entries', count(*) FROM dos.navigation_registry
    UNION ALL SELECT 'sla_defaults', count(*) FROM dos.module_sla_defaults
    UNION ALL SELECT 'settings', count(*) FROM dos.tenant_settings
  `);
  for (const row of counts.rows) {
    console.log(`    ${row.t}: ${row.c}`);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  SEED COMPLETE                               ║');
  console.log('╚══════════════════════════════════════════════╝');
}

seed()
  .then(() => pool.end())
  .catch(err => { console.error('Seed failed:', err); pool.end(); process.exit(1); });
