/**
 * Wave 21 — WCAG 2.1 AA accessibility audit scaffold.
 *
 * Run with Playwright + axe-core. Requires both as devDependencies in the
 * top-level frontend workspace; see docs/wave-21-accessibility-setup.md.
 *
 * Each top-level compliance page is asserted to have zero `serious` or
 * `critical` axe violations under the WCAG 2.1 A + AA rule sets.
 *
 * Status as of 2026-04-30: scaffold only. Real Playwright runner wires up
 * in the products/shahin-ai/ workspace where the SPA lives. This file is
 * the canonical compliance-module-side surface that the runner imports.
 */

export interface A11yPageSpec {
  /** Component key (mirrors db/seeds/dynamic-ui/index.json componentKeys). */
  componentKey: string;
  /** Route under the SPA. */
  route: string;
  /** Permission required to view (matches PERMISSION_BY_KEY). */
  requiredPermission?: string;
  /** Set true once per-page Wave-21 audit has passed at least once. */
  audited?: boolean;
  /** Severity bar — fail on this and above. Default 'serious'. */
  severityBar?: 'critical' | 'serious' | 'moderate' | 'minor';
}

export const COMPLIANCE_A11Y_PAGES: A11yPageSpec[] = [
  { componentKey: 'ComplianceHome',                 route: '/compliance',                            audited: false },
  { componentKey: 'ComplianceOverviewPage',         route: '/compliance/overview',                   audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'CompliancePosturePage',          route: '/compliance/posture',                    audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceFrameworksPage',       route: '/compliance/frameworks',                 audited: false, requiredPermission: 'framework.record.read' },
  { componentKey: 'ComplianceObligationsPage',      route: '/compliance/obligations',                audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ObligationDetailPage',           route: '/compliance/obligations/sample-id',      audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ObligationWorkspacePage',        route: '/compliance/obligation-workspace',       audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceRegulatoryChangesPage', route: '/compliance/regulatory-changes',        audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceAssessmentsPage',      route: '/compliance/assessments',                audited: false, requiredPermission: 'assessment.record.read' },
  { componentKey: 'ComplianceAttestationsPage',     route: '/compliance/attestations',               audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceFindingsPage',         route: '/compliance/findings',                   audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceGapsPage',             route: '/compliance/gaps',                       audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceExceptionsPage',       route: '/compliance/exceptions',                 audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceEvidenceOpsPage',      route: '/compliance/evidence-ops',               audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceReportsPage',          route: '/compliance/reports',                    audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceCalendarPage',         route: '/compliance/calendar',                   audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceHeatmapPage',          route: '/compliance/heatmap',                    audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceRoadmapPage',          route: '/compliance/roadmap',                    audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceTemplatesPage',        route: '/compliance/templates',                  audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceWorkQueuePage',        route: '/compliance/work-queue',                 audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'ComplianceAdminPage',            route: '/compliance/admin',                      audited: false, requiredPermission: 'compliance.admin' },
  { componentKey: 'AssertionDashboardPage',         route: '/compliance/assertion-dashboard',        audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'RcsaCampaignsPage',              route: '/compliance/rcsa-campaigns',             audited: false, requiredPermission: 'assessment.record.read' },
  { componentKey: 'RegulatoryReasoningStudioPage',  route: '/compliance/regulatory-reasoning-studio', audited: false, requiredPermission: 'compliance.read' },
  { componentKey: 'GenericModuleLifecycle',         route: '/compliance/lifecycle',                  audited: false, requiredPermission: 'compliance.admin' },
  { componentKey: 'ComplianceCatchAll',             route: '/compliance/_404_test',                  audited: false },
];

/** Default rule set (WCAG 2.1 A + AA). */
export const A11Y_RULE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Severity bar above which axe violations count as failures. */
export const A11Y_FAIL_BAR: Array<'critical' | 'serious'> = ['critical', 'serious'];

/**
 * Helper for the Playwright runner (lives in products/shahin-ai/tests/a11y/).
 * Returns the spec entries that have not yet been audited.
 */
export function pendingPages(): A11yPageSpec[] {
  return COMPLIANCE_A11Y_PAGES.filter((p) => !p.audited);
}

/**
 * Coverage metric: % of declared compliance pages that have passed Wave-21
 * audit at least once. Wave 21 acceptance: 100%.
 */
export function coverageRatio(): number {
  const total = COMPLIANCE_A11Y_PAGES.length;
  const audited = COMPLIANCE_A11Y_PAGES.filter((p) => p.audited).length;
  return total === 0 ? 0 : audited / total;
}
