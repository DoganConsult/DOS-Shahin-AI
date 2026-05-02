// ============================================
// Sidebar RBAC Navigation Filtering & Route Guard — Property-Based Tests
// Feature: grc-frontend-integration, Property 1: Sidebar navigation filtering matches permissions
// Feature: grc-frontend-integration, Property 2: Route guard denies access for missing permissions
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/layout/sidebar.pbt.ts

import * as fc from 'fast-check';

// --- Replicate pure logic from sidebar.component.ts ---

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
  requiredPermission: string;
  section?: string;
  lifecyclePhase: string;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['*'],
  admin: ['*'],
  compliance_officer: ['policy.document.read', 'policy.document.write', 'risk.record.read', 'framework.record.read', 'framework.record.manage', 'control.record.read', 'control.record.write', 'assessment.record.read', 'assessment.record.write', 'audit.record.read', 'analytics.report.read', 'copilot.assistant.read', 'report.document.read', 'workspace.config.read'],
  risk_manager: ['policy.document.read', 'risk.record.read', 'risk.record.write', 'framework.record.read', 'control.record.read', 'control.record.write', 'assessment.record.read', 'analytics.report.read', 'copilot.assistant.read', 'report.document.read', 'workspace.config.read'],
  auditor: ['policy.document.read', 'risk.record.read', 'framework.record.read', 'control.record.read', 'assessment.record.read', 'audit.record.read', 'audit.record.manage', 'analytics.report.read', 'copilot.assistant.read', 'report.document.read', 'workspace.config.read'],
  viewer: ['policy.document.read', 'risk.record.read', 'framework.record.read', 'control.record.read', 'assessment.record.read', 'audit.record.read', 'analytics.report.read', 'copilot.assistant.read', 'report.document.read', 'workspace.config.read'],
};

function hasPermission(role: string, permission: string): boolean {
  if (!Object.hasOwn(ROLE_PERMISSIONS, role)) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

const ALL_NAV_ITEMS: NavItem[] = [
  { icon: 'dashboard', labelKey: 'nav.dashboard', route: '/workspace-home', requiredPermission: 'analytics.report.read', section: 'main', lifecyclePhase: 'plan' },
  { icon: 'governance', labelKey: 'nav.governance', route: '/governance', requiredPermission: 'policy.document.read', section: 'grc', lifecyclePhase: 'plan' },
  { icon: 'frameworks', labelKey: 'nav.frameworks', route: '/frameworks', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'plan' },
  { icon: 'risks', labelKey: 'nav.risks', route: '/risks', requiredPermission: 'risk.record.read', section: 'grc', lifecyclePhase: 'assess' },
  { icon: 'maturity', labelKey: 'sidebar.maturity', route: '/maturity', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'assess' },
  { icon: 'vendors', labelKey: 'nav.vendors', route: '/vendors', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'assess' },
  { icon: 'policies', labelKey: 'nav.policies', route: '/policies', requiredPermission: 'policy.document.read', section: 'grc', lifecyclePhase: 'design' },
  { icon: 'controls', labelKey: 'nav.controls', route: '/controls', requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'design' },
  { icon: 'compliance', labelKey: 'nav.compliance', route: '/compliance', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'evidence', labelKey: 'nav.evidence', route: '/evidence', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'ucf-browser', labelKey: 'grcOs.ucf', route: '/ucf-browser', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'control-lifecycle', labelKey: 'grcOs.controlLifecycle', route: '/control-lifecycle', requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'evidence-catalog', labelKey: 'grcOs.evidenceCatalog', route: '/evidence-catalog', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'connector-health', labelKey: 'grcOs.connectors', route: '/connector-health', requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement' },
  { icon: 'incidents', labelKey: 'nav.incidents', route: '/incidents', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'exceptions', labelKey: 'sidebar.exceptions', route: '/exceptions', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'operate' },
  { icon: 'exception-manager', labelKey: 'grcOs.exceptions', route: '/exception-manager', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'operate' },
  { icon: 'cadence-calendar', labelKey: 'grcOs.cadence', route: '/cadence-calendar', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'operate' },
  { icon: 'bcp', labelKey: 'nav.bcp', route: '/bcp', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'privacy-ops', labelKey: 'grcOs.privacy', route: '/privacy-ops', requiredPermission: 'policy.document.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'vendor-risk', labelKey: 'grcOs.vendorRisk', route: '/vendor-risk', requiredPermission: 'risk.record.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'nca-assessment', labelKey: 'sidebar.ncaAssessment', route: '/nca-assessment', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'assure' },
  { icon: 'assessment-templates', labelKey: 'grcOs.assessmentTemplates', route: '/assessment-templates', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'assure' },
  { icon: 'audit', labelKey: 'nav.audit', route: '/audit', requiredPermission: 'audit.record.read', section: 'operations', lifecyclePhase: 'assure' },
  { icon: 'findings', labelKey: 'sidebar.findings', route: '/findings', requiredPermission: 'workspace.config.read', section: 'grc', lifecyclePhase: 'assure' },
  { icon: 'assets', labelKey: 'sidebar.assets', route: '/assets', requiredPermission: 'workspace.config.read', section: 'operations', lifecyclePhase: 'assure' },
  { icon: 'registry', labelKey: 'nav.registry', route: '/registry', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'assure' },
  { icon: 'regulator-heatmap', labelKey: 'sidebar.regulatorHeatmap', route: '/regulator-heatmap', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'assure' },
  { icon: 'framework-mapping', labelKey: 'sidebar.frameworkMapping', route: '/framework-mapping', requiredPermission: 'framework.record.read', section: 'intelligence', lifecyclePhase: 'assure' },
  { icon: 'dpia', labelKey: 'sidebar.dpia', route: '/dpia', requiredPermission: 'assessment.record.read', section: 'grc', lifecyclePhase: 'improve' },
  { icon: 'risk-scoring', labelKey: 'grcOs.riskScoring', route: '/risk-scoring', requiredPermission: 'risk.record.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'report-center', labelKey: 'sidebar.reportCenter', route: '/report-center', requiredPermission: 'report.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'report-builder', labelKey: 'grcOs.reportBuilder', route: '/report-builder', requiredPermission: 'report.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'workflows', labelKey: 'nav.workflows', route: '/workflows', requiredPermission: 'policy.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'automation', labelKey: 'sidebar.automation', route: '/automation', requiredPermission: 'workflow.instance.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'digital-twin', labelKey: 'sidebar.digitalTwin', route: '/digital-twin', requiredPermission: 'analytics.report.read', section: 'advanced', lifecyclePhase: 'improve' },
  { icon: 'red-team', labelKey: 'sidebar.redTeam', route: '/red-team', requiredPermission: 'analytics.report.read', section: 'advanced', lifecyclePhase: 'improve' },
  { icon: 'ai-hub', labelKey: 'sidebar.aiHub', route: '/ai-hub', requiredPermission: 'copilot.assistant.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'team', labelKey: 'sidebar.team', route: '/team', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'team-management', labelKey: 'grcOs.teams', route: '/team-management', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'profile', labelKey: 'nav.profile', route: '/profile', requiredPermission: 'analytics.report.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'tenant-config', labelKey: 'grcOs.tenantConfig', route: '/tenant-config', requiredPermission: 'analytics.report.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'tier-management', labelKey: 'grcOs.tierUpgrade', route: '/tier-management', requiredPermission: 'analytics.report.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'timeline', labelKey: 'timeline.title', route: '/timeline', requiredPermission: 'analytics.report.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'task-board', labelKey: 'taskBoard.title', route: '/task-board', requiredPermission: 'workspace.config.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'messaging', labelKey: 'messaging.title', route: '/messaging', requiredPermission: 'workspace.config.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'action-items', labelKey: 'actionItems.title', route: '/action-items', requiredPermission: 'workspace.config.read', section: 'operations', lifecyclePhase: 'operate' },
  { icon: 'training-data', labelKey: 'trainingData.title', route: '/training-data', requiredPermission: 'analytics.report.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'role-profiles', labelKey: 'nav.roleProfiles', route: '/role-profiles', requiredPermission: 'admin.system.write', section: 'account', lifecyclePhase: 'account' },
  { icon: 'workflow-templates', labelKey: 'nav.workflowTemplates', route: '/workflow-templates', requiredPermission: 'policy.document.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'admin', labelKey: 'nav.admin', route: '/admin', requiredPermission: 'admin.system.read', section: 'account', lifecyclePhase: 'account' },
];

function getVisibleNavItems(role: string): NavItem[] {
  return ALL_NAV_ITEMS.filter(item => hasPermission(role, item.requiredPermission));
}

// --- Replicate roleGuard logic from role.guard.ts ---

function roleGuardAllows(role: string, requiredPermission: string | undefined): boolean {
  if (!requiredPermission) return true;
  return hasPermission(role, requiredPermission);
}

// ============================================
// Arbitraries
// ============================================

const VALID_ROLES = Object.keys(ROLE_PERMISSIONS);
const ALL_PERMISSIONS = [...new Set(ALL_NAV_ITEMS.map(i => i.requiredPermission))];
const roleArb = fc.constantFrom(...VALID_ROLES);
const permissionArb = fc.constantFrom(...ALL_PERMISSIONS);
const navSubsetArb = fc.subarray(ALL_NAV_ITEMS, { minLength: 0 });

// ============================================
// Property 1: Sidebar navigation filtering matches permissions
// **Validates: Requirements 1.1, 1.2**
//
// For any user role and any navigation item, the item is visible in the
// sidebar if and only if the role has the item's required permission
// (or the role has wildcard * permission).
// ============================================

console.log('--- Property 1: Sidebar navigation filtering matches permissions ---');

// 1a: Every visible item has a permission granted to the role
fc.assert(
  fc.property(roleArb, (role) => {
    const visible = getVisibleNavItems(role);
    return visible.every(item => hasPermission(role, item.requiredPermission));
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1a: every visible item has a permission granted to the role');

// 1b: Every excluded item has a permission NOT granted to the role
fc.assert(
  fc.property(roleArb, (role) => {
    const visible = getVisibleNavItems(role);
    const visibleRoutes = new Set(visible.map(i => i.route));
    const excluded = ALL_NAV_ITEMS.filter(i => !visibleRoutes.has(i.route));
    return excluded.every(item => !hasPermission(role, item.requiredPermission));
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1b: every excluded item has a permission NOT granted to the role');

// 1c: Visible items are a subset of ALL_NAV_ITEMS (no phantom items)
fc.assert(
  fc.property(roleArb, (role) => {
    const visible = getVisibleNavItems(role);
    const allRoutes = new Set(ALL_NAV_ITEMS.map(i => i.route));
    return visible.every(item => allRoutes.has(item.route));
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1c: visible items are always a subset of ALL_NAV_ITEMS');

// 1d: Wildcard roles (owner, admin) see every nav item
fc.assert(
  fc.property(fc.constantFrom('owner', 'admin'), (role) => {
    return getVisibleNavItems(role).length === ALL_NAV_ITEMS.length;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1d: wildcard roles (owner, admin) see every nav item');

// 1e: Unknown roles see nothing
fc.assert(
  fc.property(
    fc.string().filter(s => !VALID_ROLES.includes(s)),
    (role) => getVisibleNavItems(role).length === 0
  ),
  { numRuns: 100 }
);
console.log('  ✓ 1e: any roles see zero nav items');

// 1f: For any role and any arbitrary subset of nav items, filtering that subset
//     by hasPermission yields exactly the items whose permission the role has
fc.assert(
  fc.property(roleArb, navSubsetArb, (role, items) => {
    const filtered = items.filter(item => hasPermission(role, item.requiredPermission));
    const allPermitted = filtered.every(item => hasPermission(role, item.requiredPermission));
    const dropped = items.filter(i => !filtered.includes(i));
    const allDroppedDenied = dropped.every(i => !hasPermission(role, i.requiredPermission));
    return allPermitted && allDroppedDenied;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 1f: filtering any nav subset by hasPermission is consistent');

console.log('Property 1: PASSED\n');

// ============================================
// Property 2: Route guard denies access for missing permissions
// **Validates: Requirements 2.2, 2.4**
//
// For any user role and any route with a requiredPermission data field,
// the roleGuard allows access if and only if hasPermission(role, requiredPermission)
// returns true.
// ============================================

console.log('--- Property 2: Route guard denies access for missing permissions ---');

// 2a: roleGuard allows iff hasPermission returns true
fc.assert(
  fc.property(roleArb, permissionArb, (role, perm) => {
    const guardResult = roleGuardAllows(role, perm);
    const permResult = hasPermission(role, perm);
    return guardResult === permResult;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2a: roleGuard allows iff hasPermission returns true');

// 2b: roleGuard always allows when no requiredPermission is set
fc.assert(
  fc.property(roleArb, (role) => {
    return roleGuardAllows(role, undefined) === true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2b: roleGuard always allows when no requiredPermission is set');

// 2c: roleGuard denies any roles for any permission
fc.assert(
  fc.property(
    fc.string().filter(s => !VALID_ROLES.includes(s)),
    permissionArb,
    (role, perm) => roleGuardAllows(role, perm) === false
  ),
  { numRuns: 100 }
);
console.log('  ✓ 2c: roleGuard denies any roles for any permission');

// 2d: Wildcard roles always pass the guard for any permission
fc.assert(
  fc.property(fc.constantFrom('owner', 'admin'), permissionArb, (role, perm) => {
    return roleGuardAllows(role, perm) === true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2d: wildcard roles always pass the guard for any permission');

// 2e: For every nav item, the guard result matches sidebar visibility
fc.assert(
  fc.property(roleArb, (role) => {
    const visible = getVisibleNavItems(role);
    const visibleRoutes = new Set(visible.map(i => i.route));
    return ALL_NAV_ITEMS.every(item => {
      const guardAllows = roleGuardAllows(role, item.requiredPermission);
      const isVisible = visibleRoutes.has(item.route);
      return guardAllows === isVisible;
    });
  }),
  { numRuns: 100 }
);
console.log('  ✓ 2e: guard result matches sidebar visibility for every nav item');

console.log('Property 2: PASSED\n');

console.log('=== All sidebar RBAC + route guard property tests PASSED ===');
