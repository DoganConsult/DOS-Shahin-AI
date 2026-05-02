/**
 * Page Registry — static catalog of all pages with their access requirements.
 *
 * Each entry defines WHAT COMPONENT EXISTS and WHAT'S NEEDED to see it.
 * The blueprint resolver checks these requirements against the UiRenderContext.
 */

import { ArchetypeCode } from '../core/runtime/ui-state.models';

export interface PageRegistryEntry {
  pageCode: string;
  moduleCode: string;
  /**
   * When requiresModuleActive is true, the page is allowed if ANY of these
   * module codes is entitled (plus platform modules). Defaults to [moduleCode].
   * Use for canonical matrix codes (notification, team, analytics) that tenants
   * may still access via foundation/admin bundles.
   */
  entitlementModuleCodes?: string[];
  route: string;
  layout: 'full' | 'split' | 'wizard' | 'detail' | 'hub';
  featureFlags?: string[];
  requiresModuleActive: boolean;
  requiresPermissions: string[];
  archetypeVisibility?: ArchetypeCode[];
  navVisibility: 'always' | 'entitled' | 'hidden';
}

export const PAGE_REGISTRY: PageRegistryEntry[] = [
  // ── Foundation ─────────────────────────────────────────────────────────
  { pageCode: 'foundation-overview',       moduleCode: 'foundation', route: '/foundation/overview',        layout: 'hub',    requiresModuleActive: false, requiresPermissions: [],                       navVisibility: 'always' },
  { pageCode: 'foundation-organization',   moduleCode: 'foundation', route: '/foundation/organization',    layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-business-units', moduleCode: 'foundation', route: '/foundation/business-units',  layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-departments',    moduleCode: 'foundation', route: '/foundation/departments',     layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-users',          moduleCode: 'foundation', route: '/foundation/users',           layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.user.write'],          navVisibility: 'entitled' },
  { pageCode: 'foundation-roles',          moduleCode: 'foundation', route: '/foundation/roles',           layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.admin'],     navVisibility: 'entitled' },
  { pageCode: 'foundation-teams',           moduleCode: 'team',       route: '/foundation/teams',           layout: 'full',   requiresModuleActive: true,  entitlementModuleCodes: ['foundation', 'team'], requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-locations',       moduleCode: 'foundation', route: '/foundation/locations',       layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-positions',       moduleCode: 'foundation', route: '/foundation/positions',       layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],        navVisibility: 'entitled' },
  { pageCode: 'foundation-committees',      moduleCode: 'foundation', route: '/foundation/committees',      layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],       navVisibility: 'entitled' },
  { pageCode: 'foundation-delegations',     moduleCode: 'foundation', route: '/foundation/delegations',     layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-access-review',   moduleCode: 'foundation', route: '/foundation/access-review',   layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-reference-data',  moduleCode: 'foundation', route: '/foundation/reference-data',  layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-policies',        moduleCode: 'foundation', route: '/foundation/policies',        layout: 'full',   requiresModuleActive: false, requiresPermissions: ['policy:read'],          navVisibility: 'entitled' },
  { pageCode: 'foundation-data-processing', moduleCode: 'foundation', route: '/foundation/data-processing', layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.read'],      navVisibility: 'entitled' },
  { pageCode: 'foundation-notifications',   moduleCode: 'notification', route: '/foundation/notifications', layout: 'full', requiresModuleActive: true, entitlementModuleCodes: ['foundation', 'notification'], requiresPermissions: ['foundation.read'], navVisibility: 'entitled' },
  { pageCode: 'foundation-audit-log',       moduleCode: 'foundation', route: '/foundation/audit',           layout: 'full',   requiresModuleActive: false, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'foundation-settings',        moduleCode: 'foundation', route: '/foundation/settings',        layout: 'full',   requiresModuleActive: false, requiresPermissions: ['foundation.admin'], navVisibility: 'entitled' },
  { pageCode: 'foundation-settings-workspace', moduleCode: 'foundation', route: '/foundation/settings/workspace', layout: 'full', requiresModuleActive: false, requiresPermissions: ['foundation.admin'], navVisibility: 'hidden' },
  { pageCode: 'foundation-role-detail',     moduleCode: 'foundation', route: '/foundation/roles/:roleCode', layout: 'detail', requiresModuleActive: false, requiresPermissions: ['foundation.admin'],    navVisibility: 'entitled' },
  { pageCode: 'foundation-ownership-mapping', moduleCode: 'foundation', route: '/foundation/ownership-mapping', layout: 'full', requiresModuleActive: false, requiresPermissions: ['foundation.read'], navVisibility: 'entitled' },

  // ── Governance ─────────────────────────────────────────────────────────
  { pageCode: 'governance-overview',       moduleCode: 'governance', route: '/governance/overview',        layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled' },
  { pageCode: 'governance-policies',       moduleCode: 'policy',     route: '/governance/policies',        layout: 'full',   requiresModuleActive: true, requiresPermissions: ['policy:read'],           navVisibility: 'entitled' },
  { pageCode: 'governance-procedures',     moduleCode: 'policy',     route: '/governance/procedures',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['policy:read'],           navVisibility: 'entitled' },
  { pageCode: 'governance-committees',     moduleCode: 'governance', route: '/governance/committees',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled', archetypeVisibility: ['standard', 'regulated', 'government'] },
  { pageCode: 'governance-decisions',      moduleCode: 'governance', route: '/governance/decisions',       layout: 'full',   requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled' },
  { pageCode: 'governance-actions',        moduleCode: 'action',     route: '/governance/actions',         layout: 'full',   requiresModuleActive: true, requiresPermissions: ['action:read'],           navVisibility: 'entitled' },
  { pageCode: 'governance-exceptions',     moduleCode: 'exception',  route: '/governance/exceptions',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['exception:read'],        navVisibility: 'entitled' },
  { pageCode: 'governance-calendar',       moduleCode: 'governance', route: '/governance/calendar',        layout: 'full',   requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled' },
  { pageCode: 'governance-mandates',       moduleCode: 'governance', route: '/governance/mandates',        layout: 'full',   requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled', archetypeVisibility: ['regulated', 'government'] },
  { pageCode: 'governance-reviews',        moduleCode: 'governance', route: '/governance/reviews',         layout: 'full',   requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled' },
  { pageCode: 'governance-board-packs',    moduleCode: 'governance', route: '/governance/board-packs',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['governance:read'],       navVisibility: 'entitled', archetypeVisibility: ['regulated', 'government'] },

  // ── Risk ───────────────────────────────────────────────────────────────
  { pageCode: 'risk-overview',     moduleCode: 'risk', route: '/risk/home',     layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },
  { pageCode: 'risk-register',     moduleCode: 'risk', route: '/risk/register',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },
  { pageCode: 'risk-assessments',  moduleCode: 'risk', route: '/risk/assessments',  layout: 'full',   requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },
  { pageCode: 'risk-scoring',      moduleCode: 'risk', route: '/risk/scoring',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },
  { pageCode: 'risk-treatments',   moduleCode: 'risk', route: '/risk/treatment',   layout: 'full',   requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },
  { pageCode: 'risk-kris',         moduleCode: 'risk', route: '/risk/indicators',         layout: 'full',   requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },
  { pageCode: 'risk-heatmap',      moduleCode: 'risk', route: '/risk/heatmap',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['risk:read'],      navVisibility: 'entitled' },

  // ── Compliance ─────────────────────────────────────────────────────────
  { pageCode: 'compliance-overview',    moduleCode: 'compliance', route: '/compliance/overview',    layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['compliance:read'],  navVisibility: 'entitled' },
  { pageCode: 'compliance-frameworks',  moduleCode: 'compliance', route: '/compliance/frameworks',  layout: 'full',   requiresModuleActive: true, requiresPermissions: ['compliance:read'],  navVisibility: 'entitled' },
  { pageCode: 'compliance-obligations', moduleCode: 'compliance', route: '/compliance/obligations', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['compliance:read'],  navVisibility: 'entitled' },
  { pageCode: 'compliance-assessments', moduleCode: 'compliance', route: '/compliance/assessments', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['compliance:read'],  navVisibility: 'entitled' },
  { pageCode: 'compliance-gaps',        moduleCode: 'compliance', route: '/compliance/gaps',        layout: 'full',   requiresModuleActive: true, requiresPermissions: ['compliance:read'],  navVisibility: 'entitled' },
  { pageCode: 'compliance-posture',     moduleCode: 'compliance', route: '/compliance/posture',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['compliance:read'],  navVisibility: 'entitled' },
  { pageCode: 'compliance-heatmap',    moduleCode: 'compliance', route: '/compliance/heatmap',    layout: 'full',   requiresModuleActive: true, requiresPermissions: ['framework:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-attestations',        moduleCode: 'compliance', route: '/compliance/attestations',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-exceptions',          moduleCode: 'compliance', route: '/compliance/exceptions',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-templates',           moduleCode: 'compliance', route: '/compliance/templates',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-findings',            moduleCode: 'compliance', route: '/compliance/findings',            layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-savings',             moduleCode: 'compliance', route: '/compliance/savings',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-roadmap',             moduleCode: 'compliance', route: '/compliance/roadmap',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-calendar',            moduleCode: 'compliance', route: '/compliance/calendar',            layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-regulatory-changes',  moduleCode: 'compliance', route: '/compliance/regulatory-changes',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-work-queue',          moduleCode: 'compliance', route: '/compliance/work-queue',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-evidence-ops',        moduleCode: 'compliance', route: '/compliance/evidence-ops',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-reports',             moduleCode: 'compliance', route: '/compliance/reports',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-admin',               moduleCode: 'compliance', route: '/compliance/admin',               layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:admin'], navVisibility: 'entitled' },
  { pageCode: 'compliance-lifecycle',           moduleCode: 'compliance', route: '/compliance/lifecycle',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:admin'], navVisibility: 'entitled' },
  { pageCode: 'compliance-obligation-detail',   moduleCode: 'compliance', route: '/compliance/obligations/:id',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'hidden' },
  { pageCode: 'compliance-obligation-workspace',moduleCode: 'compliance', route: '/compliance/obligation-workspace',layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-assertion-dashboard', moduleCode: 'compliance', route: '/compliance/assertion-dashboard', layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-rcsa-campaigns',      moduleCode: 'compliance', route: '/compliance/rcsa-campaigns',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['assessment:read'], navVisibility: 'entitled' },
  { pageCode: 'compliance-reasoning-studio',    moduleCode: 'compliance', route: '/compliance/regulatory-reasoning-studio', layout: 'full', requiresModuleActive: true, requiresPermissions: ['compliance:read'], navVisibility: 'entitled' },

  // ── Controls (standalone module) ────────────────────────────────────────
  { pageCode: 'controls-home',           moduleCode: 'controls', route: '/controls/home',           layout: 'hub',  requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-work-queue',     moduleCode: 'controls', route: '/controls/work-queue',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-library',        moduleCode: 'controls', route: '/controls/library',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-detail',         moduleCode: 'controls', route: '/controls/library/:id',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-mapping',        moduleCode: 'controls', route: '/controls/mapping',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-testing',        moduleCode: 'controls', route: '/controls/testing',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-certifications', moduleCode: 'controls', route: '/controls/certifications', layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-deficiencies',   moduleCode: 'controls', route: '/controls/deficiencies',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-monitoring',     moduleCode: 'controls', route: '/controls/monitoring',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-reports',        moduleCode: 'controls', route: '/controls/reports',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['control:read'], navVisibility: 'entitled' },
  { pageCode: 'controls-admin',          moduleCode: 'controls', route: '/controls/admin',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['controls:admin'], navVisibility: 'entitled' },

  // ── Evidence ───────────────────────────────────────────────────────────
  { pageCode: 'evidence-overview',   moduleCode: 'evidence', route: '/evidence/overview',             layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },
  { pageCode: 'evidence-vault',      moduleCode: 'evidence', route: '/evidence/vault',                layout: 'full',   requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },
  { pageCode: 'evidence-requests',   moduleCode: 'evidence', route: '/evidence/requests',             layout: 'full',   requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },
  { pageCode: 'evidence-reviews',    moduleCode: 'evidence', route: '/evidence/reviews',              layout: 'full',   requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },
  { pageCode: 'evidence-automated',  moduleCode: 'evidence', route: '/evidence/automated-collection', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },
  { pageCode: 'evidence-catalog',    moduleCode: 'evidence', route: '/evidence/catalog',              layout: 'full',   requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },
  { pageCode: 'evidence-tasks',      moduleCode: 'evidence', route: '/evidence/tasks',                layout: 'full',   requiresModuleActive: true, requiresPermissions: ['evidence:read'],  navVisibility: 'entitled' },

  // ── Audit ──────────────────────────────────────────────────────────────
  { pageCode: 'audit-overview',     moduleCode: 'audit', route: '/audit/overview',     layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['audit_trail.read'],  navVisibility: 'entitled' },
  { pageCode: 'audit-plan',         moduleCode: 'audit', route: '/audit/plan',         layout: 'full',   requiresModuleActive: true, requiresPermissions: ['audit_trail.read'],  navVisibility: 'entitled' },
  { pageCode: 'audit-engagements',  moduleCode: 'audit', route: '/audit/engagements',  layout: 'full',   requiresModuleActive: true, requiresPermissions: ['audit_trail.read'],  navVisibility: 'entitled' },
  { pageCode: 'audit-findings',     moduleCode: 'audit', route: '/audit/findings',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['audit_trail.read'],  navVisibility: 'entitled' },
  { pageCode: 'audit-capa',         moduleCode: 'audit', route: '/audit/capa',         layout: 'full',   requiresModuleActive: true, requiresPermissions: ['audit_trail.read'],  navVisibility: 'entitled' },
  { pageCode: 'audit-reports',      moduleCode: 'audit', route: '/audit/reports',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['audit_trail.read'],  navVisibility: 'entitled' },

  // ── Reports ────────────────────────────────────────────────────────────
  { pageCode: 'reports-overview',   moduleCode: 'reporting', route: '/reports/overview',   layout: 'hub',    requiresModuleActive: false, requiresPermissions: ['report:read'],  navVisibility: 'entitled' },
  { pageCode: 'reports-executive',  moduleCode: 'reporting', route: '/reports/executive',  layout: 'full',   requiresModuleActive: false, requiresPermissions: ['report:read'],  navVisibility: 'entitled' },
  { pageCode: 'reports-builder',    moduleCode: 'reporting', route: '/reports/builder',    layout: 'full',   requiresModuleActive: false, requiresPermissions: ['report:write'], navVisibility: 'entitled' },

  // ── Incidents ──────────────────────────────────────────────────────────
  { pageCode: 'incidents-overview',      moduleCode: 'incident', route: '/incidents/overview',      layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['incident:read'],  navVisibility: 'entitled' },
  { pageCode: 'incidents-register',      moduleCode: 'incident', route: '/incidents/register',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['incident:read'],  navVisibility: 'entitled' },
  { pageCode: 'incidents-investigation', moduleCode: 'incident', route: '/incidents/investigation', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['incident:read'],  navVisibility: 'entitled' },
  { pageCode: 'incidents-war-room',      moduleCode: 'incident', route: '/incidents/war-room',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['incident:read'],  navVisibility: 'entitled' },
  { pageCode: 'incidents-trends',        moduleCode: 'incident', route: '/incidents/trends',        layout: 'full',   requiresModuleActive: true, requiresPermissions: ['incident:read'],  navVisibility: 'entitled' },

  // ── BCP ────────────────────────────────────────────────────────────────
  { pageCode: 'bcp-overview',  moduleCode: 'bcp', route: '/bcp/overview',  layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['bcp:read'],  navVisibility: 'entitled' },
  { pageCode: 'bcp-plans',     moduleCode: 'bcp', route: '/bcp/plans',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['bcp:read'],  navVisibility: 'entitled' },
  { pageCode: 'bcp-bia',       moduleCode: 'bcp', route: '/bcp/bia',       layout: 'wizard', requiresModuleActive: true, requiresPermissions: ['bcp:read'],  navVisibility: 'entitled' },
  { pageCode: 'bcp-exercises', moduleCode: 'bcp', route: '/bcp/exercises', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['bcp:read'],  navVisibility: 'entitled' },

  // ── Vendor Risk ────────────────────────────────────────────────────────
  { pageCode: 'vendor-overview',    moduleCode: 'vendor', route: '/vendor-hub',              layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['vendor:read'],  navVisibility: 'entitled' },
  { pageCode: 'vendor-register',    moduleCode: 'vendor', route: '/vendor-risk/register',    layout: 'full',   requiresModuleActive: true, requiresPermissions: ['vendor:read'],  navVisibility: 'entitled' },
  { pageCode: 'vendor-assessments', moduleCode: 'vendor', route: '/vendor-risk/assessments', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['vendor:read'],  navVisibility: 'entitled' },
  { pageCode: 'vendor-sla',         moduleCode: 'vendor', route: '/vendor-risk/sla',         layout: 'full',   requiresModuleActive: true, requiresPermissions: ['vendor:read'],  navVisibility: 'entitled' },

  // ── Training ───────────────────────────────────────────────────────────
  { pageCode: 'training-overview',  moduleCode: 'training', route: '/training/overview',  layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['training:read'],  navVisibility: 'entitled' },
  { pageCode: 'training-campaigns', moduleCode: 'training', route: '/training/campaigns', layout: 'full',   requiresModuleActive: true, requiresPermissions: ['training:read'],  navVisibility: 'entitled' },
  { pageCode: 'training-content',   moduleCode: 'training', route: '/training/content',   layout: 'full',   requiresModuleActive: true, requiresPermissions: ['training:read'],  navVisibility: 'entitled' },

  // ── Qiyas ──────────────────────────────────────────────────────────────
  { pageCode: 'qiyas-dashboard',    moduleCode: 'qiyas', route: '/qiyas',              layout: 'hub',    requiresModuleActive: true, requiresPermissions: ['qiyas:read'],  navVisibility: 'entitled' },
  { pageCode: 'qiyas-assessments',  moduleCode: 'qiyas', route: '/qiyas/assessments',  layout: 'full',   requiresModuleActive: true, requiresPermissions: ['qiyas:read'],  navVisibility: 'entitled' },
  { pageCode: 'qiyas-models',       moduleCode: 'qiyas', route: '/qiyas/models',       layout: 'full',   requiresModuleActive: true, requiresPermissions: ['qiyas:read'],  navVisibility: 'entitled' },

  // ── Workflow & Automation ─────────────────────────────────────────────
  { pageCode: 'workflow-hub',          moduleCode: 'workflow', route: '/workflow-hub',          layout: 'hub',    requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-list',         moduleCode: 'workflow', route: '/workflows',             layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-templates',    moduleCode: 'workflow', route: '/workflow-templates',    layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-ext',          moduleCode: 'workflow', route: '/workflow-ext',          layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-executions',   moduleCode: 'workflow', route: '/workflow-executions',   layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-analytics',    moduleCode: 'workflow', route: '/workflow-analytics',    layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-designer',     moduleCode: 'workflow', route: '/workflow-designer',     layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:write'],   navVisibility: 'entitled' },
  { pageCode: 'workflow-builder',      moduleCode: 'workflow', route: '/workflow-builder',      layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:write'],   navVisibility: 'entitled' },
  { pageCode: 'autonomous-workflows',  moduleCode: 'workflow', route: '/autonomous-workflows',  layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'cooperative-workflows', moduleCode: 'workflow', route: '/cooperative-workflows', layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },
  { pageCode: 'workflow-process-tasks', moduleCode: 'workflow', route: '/process-tasks',        layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow_task:read'], navVisibility: 'entitled' },
  { pageCode: 'workflow-task-board',   moduleCode: 'workflow', route: '/task-board',            layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow_task:read'], navVisibility: 'entitled' },
  { pageCode: 'workflow-approval-center', moduleCode: 'workflow', route: '/approval-center',   layout: 'full',   requiresModuleActive: false, requiresPermissions: ['workflow:read'],    navVisibility: 'entitled' },

  // ── AI ──────────────────────────────────────────────────────────────────
  { pageCode: 'ai-hub',        moduleCode: 'ai', route: '/ai-hub',    layout: 'hub',    requiresModuleActive: false, requiresPermissions: ['ai:read'],  navVisibility: 'entitled' },
  { pageCode: 'ai-agrc-os',    moduleCode: 'ai', route: '/agrc-os',    layout: 'full',  requiresModuleActive: false, requiresPermissions: ['ai:read'],  navVisibility: 'entitled' },

  // ── Integrations ───────────────────────────────────────────────────────
  { pageCode: 'integrations-connector',   moduleCode: 'integrations', route: '/connector-hub',            layout: 'hub',  requiresModuleActive: false, requiresPermissions: ['integrations:read'],  navVisibility: 'entitled' },
  { pageCode: 'integrations-marketplace', moduleCode: 'integrations', route: '/integration-marketplace',  layout: 'full', requiresModuleActive: false, requiresPermissions: ['integrations:read'],  navVisibility: 'entitled' },

  // ── Admin ──────────────────────────────────────────────────────────────
  { pageCode: 'admin-team',    moduleCode: 'team', route: '/team',          layout: 'full', requiresModuleActive: true, entitlementModuleCodes: ['admin', 'foundation', 'team'], requiresPermissions: ['foundation.user.write'],    navVisibility: 'entitled' },
  { pageCode: 'admin-hub',     moduleCode: 'admin', route: '/admin-hub',     layout: 'hub',  requiresModuleActive: false, requiresPermissions: ['admin:read'],     navVisibility: 'entitled' },
  { pageCode: 'admin-config',  moduleCode: 'admin', route: '/tenant-config', layout: 'full', requiresModuleActive: false, requiresPermissions: ['admin:read'], navVisibility: 'entitled' },
  { pageCode: 'admin-dashboard',      moduleCode: 'admin', route: '/admin',                          layout: 'hub',  requiresModuleActive: false, requiresPermissions: ['admin:read'],     navVisibility: 'hidden' },
  { pageCode: 'admin-settings',       moduleCode: 'admin', route: '/admin/settings',                 layout: 'full', requiresModuleActive: false, requiresPermissions: ['platform:admin'], navVisibility: 'hidden' },
  { pageCode: 'admin-packs',          moduleCode: 'admin', route: '/admin/packs',                    layout: 'full', requiresModuleActive: false, requiresPermissions: ['admin:read'],     navVisibility: 'hidden' },
  { pageCode: 'admin-provisioning',   moduleCode: 'admin', route: '/admin/provisioning/orchestrator', layout: 'full', requiresModuleActive: false, requiresPermissions: ['admin:read'],    navVisibility: 'hidden' },
  { pageCode: 'admin-agrc-engine',    moduleCode: 'ai',    route: '/admin/agrc-engine',              layout: 'full', requiresModuleActive: false, requiresPermissions: ['agrc_os:read'],   navVisibility: 'hidden' },
  { pageCode: 'admin-trial-ext',      moduleCode: 'admin', route: '/admin/trial-extensions',         layout: 'full', requiresModuleActive: false, requiresPermissions: ['admin:read'],     navVisibility: 'hidden' },
  { pageCode: 'admin-subscriptions',  moduleCode: 'admin', route: '/admin/subscriptions',            layout: 'full', requiresModuleActive: false, requiresPermissions: ['admin:read'],     navVisibility: 'hidden' },

  // ── Governance (backfill) ─────────────────────────────────────────────
  { pageCode: 'governance-acknowledgements', moduleCode: 'governance', route: '/governance/acknowledgements',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-objectives',       moduleCode: 'governance', route: '/governance/objectives',         layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-delegations',      moduleCode: 'governance', route: '/governance/delegations',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-responsibilities', moduleCode: 'governance', route: '/governance/responsibilities',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-raci-templates',   moduleCode: 'governance', route: '/governance/raci-templates',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-obligations',      moduleCode: 'governance', route: '/governance/obligations',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-charters',         moduleCode: 'governance', route: '/governance/charters',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-health',           moduleCode: 'governance', route: '/governance/health',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-structure',        moduleCode: 'governance', route: '/governance/structure',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-raci',             moduleCode: 'governance', route: '/governance/raci',               layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'],  navVisibility: 'entitled' },
  { pageCode: 'governance-exec-summaries',   moduleCode: 'governance', route: '/governance/executive-summaries', layout: 'full', requiresModuleActive: true, requiresPermissions: ['governance:read'], navVisibility: 'entitled' },

  // ── Risk (backfill) ───────────────────────────────────────────────────
  { pageCode: 'risk-appetite',    moduleCode: 'risk', route: '/risk/appetite',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['risk:read'], navVisibility: 'entitled' },
  { pageCode: 'risk-metrics',     moduleCode: 'risk', route: '/risk/metrics',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['risk:read'], navVisibility: 'entitled' },
  { pageCode: 'risk-acceptance',  moduleCode: 'risk', route: '/risk/acceptance',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['risk:read'], navVisibility: 'entitled' },
  { pageCode: 'risk-scenarios',   moduleCode: 'risk', route: '/risk/scenarios',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['risk:read'], navVisibility: 'entitled' },
  { pageCode: 'risk-bowtie',      moduleCode: 'risk', route: '/risk/bowtie',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['risk:read'], navVisibility: 'entitled' },

  // ── Audit (backfill) ──────────────────────────────────────────────────
  { pageCode: 'audit-validation',        moduleCode: 'audit', route: '/audit/validation',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-universe',          moduleCode: 'audit', route: '/audit/universe',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-risk-planning',     moduleCode: 'audit', route: '/audit/risk-planning',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-schedules',         moduleCode: 'audit', route: '/audit/schedules',         layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-working-papers',    moduleCode: 'audit', route: '/audit/working-papers',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-team',             moduleCode: 'audit', route: '/audit/team',              layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-repeat-findings',   moduleCode: 'audit', route: '/audit/repeat-findings',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-qa-reviews',        moduleCode: 'audit', route: '/audit/qa-reviews',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-finding-trends',    moduleCode: 'audit', route: '/audit/finding-trends',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-ratings',           moduleCode: 'audit', route: '/audit/ratings',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-capa-effectiveness', moduleCode: 'audit', route: '/audit/capa-effectiveness', layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-committee',         moduleCode: 'audit', route: '/audit/committee',         layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-external',          moduleCode: 'audit', route: '/audit/external',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-regulatory',        moduleCode: 'audit', route: '/audit/regulatory',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },
  { pageCode: 'audit-test-plans',        moduleCode: 'audit', route: '/audit/test-plans',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['audit_trail.read'], navVisibility: 'entitled' },

  // ── Reports (backfill) ────────────────────────────────────────────────
  { pageCode: 'reports-risk',        moduleCode: 'reporting', route: '/reports/risk',       layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'], navVisibility: 'entitled' },
  { pageCode: 'reports-compliance',  moduleCode: 'reporting', route: '/reports/compliance', layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'], navVisibility: 'entitled' },
  { pageCode: 'reports-evidence',    moduleCode: 'reporting', route: '/reports/evidence',   layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'], navVisibility: 'entitled' },
  { pageCode: 'reports-audit',       moduleCode: 'reporting', route: '/reports/audit',      layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'], navVisibility: 'entitled' },
  { pageCode: 'reports-scheduled',   moduleCode: 'reporting', route: '/reports/scheduled',  layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'], navVisibility: 'entitled' },
  { pageCode: 'reports-exports',     moduleCode: 'reporting', route: '/reports/exports',    layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'], navVisibility: 'entitled' },

  // ── Incidents (backfill) ──────────────────────────────────────────────
  { pageCode: 'incidents-near-miss',  moduleCode: 'incident', route: '/incidents/near-miss',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['incident:read'], navVisibility: 'entitled' },
  { pageCode: 'incidents-pir',        moduleCode: 'incident', route: '/incidents/pir',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['incident:read'], navVisibility: 'entitled' },
  { pageCode: 'incidents-regulatory', moduleCode: 'incident', route: '/incidents/regulatory', layout: 'full', requiresModuleActive: true, requiresPermissions: ['incident:read'], navVisibility: 'entitled' },
  { pageCode: 'incidents-taxonomy',   moduleCode: 'incident', route: '/incidents/taxonomy',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['incident:read'], navVisibility: 'entitled' },
  { pageCode: 'incidents-lessons',    moduleCode: 'incident', route: '/incidents/lessons',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['incident:read'], navVisibility: 'entitled' },

  // ── BCP (backfill) ────────────────────────────────────────────────────
  { pageCode: 'bcp-crisis-comm',   moduleCode: 'bcp', route: '/bcp/crisis-comm',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['bcp:read'], navVisibility: 'entitled' },
  { pageCode: 'bcp-recovery',      moduleCode: 'bcp', route: '/bcp/recovery',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['bcp:read'], navVisibility: 'entitled' },
  { pageCode: 'bcp-activation',    moduleCode: 'bcp', route: '/bcp/activation',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['bcp:read'], navVisibility: 'entitled' },
  { pageCode: 'bcp-dependencies',  moduleCode: 'bcp', route: '/bcp/dependencies',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['bcp:read'], navVisibility: 'entitled' },
  { pageCode: 'bcp-maturity',      moduleCode: 'bcp', route: '/bcp/maturity',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['bcp:read'], navVisibility: 'entitled' },

  // ── Vendor Risk (backfill) ────────────────────────────────────────────
  { pageCode: 'vendor-due-diligence',  moduleCode: 'vendor', route: '/vendor-risk/due-diligence',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['vendor:read'], navVisibility: 'entitled' },
  { pageCode: 'vendor-fourth-party',   moduleCode: 'vendor', route: '/vendor-risk/fourth-party',   layout: 'full', requiresModuleActive: true, requiresPermissions: ['vendor:read'], navVisibility: 'entitled' },
  { pageCode: 'vendor-concentration',  moduleCode: 'vendor', route: '/vendor-risk/concentration',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['vendor:read'], navVisibility: 'entitled' },
  { pageCode: 'vendor-offboarding',    moduleCode: 'vendor', route: '/vendor-risk/offboarding',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['vendor:read'], navVisibility: 'entitled' },
  { pageCode: 'vendor-monitoring',     moduleCode: 'vendor', route: '/vendor-risk/monitoring',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['vendor:read'], navVisibility: 'entitled' },

  // ── Training (backfill) ───────────────────────────────────────────────
  { pageCode: 'training-assignments',    moduleCode: 'training', route: '/training/assignments',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['training:read'], navVisibility: 'entitled' },
  { pageCode: 'training-certifications', moduleCode: 'training', route: '/training/certifications', layout: 'full', requiresModuleActive: true, requiresPermissions: ['training:read'], navVisibility: 'entitled' },
  { pageCode: 'training-phishing',       moduleCode: 'training', route: '/training/phishing',       layout: 'full', requiresModuleActive: true, requiresPermissions: ['training:read'], navVisibility: 'entitled' },
  { pageCode: 'training-compliance',     moduleCode: 'training', route: '/training/compliance',     layout: 'full', requiresModuleActive: true, requiresPermissions: ['training:read'], navVisibility: 'entitled' },
  { pageCode: 'training-reports',        moduleCode: 'training', route: '/training/reports',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['training:read'], navVisibility: 'entitled' },

  // ── Qiyas (backfill) ─────────────────────────────────────────────────
  { pageCode: 'qiyas-recommendations',  moduleCode: 'qiyas', route: '/qiyas/recommendations',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-roadmap',          moduleCode: 'qiyas', route: '/qiyas/roadmap',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-calibration',      moduleCode: 'qiyas', route: '/qiyas/calibration',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-evidence-scoring', moduleCode: 'qiyas', route: '/qiyas/evidence-scoring', layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-maturity-heatmap', moduleCode: 'qiyas', route: '/qiyas/maturity-heatmap', layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-maturity-trends',  moduleCode: 'qiyas', route: '/qiyas/maturity-trends',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-benchmarks',       moduleCode: 'qiyas', route: '/qiyas/benchmarks',       layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-certification',    moduleCode: 'qiyas', route: '/qiyas/certification',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-respondents',      moduleCode: 'qiyas', route: '/qiyas/respondents',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-questions',        moduleCode: 'qiyas', route: '/qiyas/questions',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },
  { pageCode: 'qiyas-scoping',          moduleCode: 'qiyas', route: '/qiyas/scoping',          layout: 'full', requiresModuleActive: true, requiresPermissions: ['qiyas:read'], navVisibility: 'entitled' },

  // ── AI Governance ─────────────────────────────────────────────────────
  { pageCode: 'aig-assets',             moduleCode: 'ai-governance', route: '/ai-governance/assets',             layout: 'hub',  requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-models',             moduleCode: 'ai-governance', route: '/ai-governance/models',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-prompts',            moduleCode: 'ai-governance', route: '/ai-governance/prompts',            layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-agents',             moduleCode: 'ai-governance', route: '/ai-governance/agents',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-bindings',           moduleCode: 'ai-governance', route: '/ai-governance/bindings',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-enforcement',        moduleCode: 'ai-governance', route: '/ai-governance/enforcement',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-mismatches',         moduleCode: 'ai-governance', route: '/ai-governance/mismatches',         layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-audit',              moduleCode: 'ai-governance', route: '/ai-governance/audit',              layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-operations',         moduleCode: 'ai-governance', route: '/ai-governance/operations',         layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-fairness',           moduleCode: 'ai-governance', route: '/ai-governance/fairness',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-eu-classification',  moduleCode: 'ai-governance', route: '/ai-governance/eu-classification',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-ethics-board',       moduleCode: 'ai-governance', route: '/ai-governance/ethics-board',       layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-impact-assessment',  moduleCode: 'ai-governance', route: '/ai-governance/impact-assessment',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-regulatory-changes', moduleCode: 'ai-governance', route: '/ai-governance/regulatory-changes', layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-alerts',             moduleCode: 'ai-governance', route: '/ai-governance/alerts',             layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-board-summary',      moduleCode: 'ai-governance', route: '/ai-governance/board-summary',      layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-maturity',           moduleCode: 'ai-governance', route: '/ai-governance/maturity',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-model-drift',        moduleCode: 'ai-governance', route: '/ai-governance/model-drift',        layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-hitl',               moduleCode: 'ai-governance', route: '/ai-governance/hitl',               layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },
  { pageCode: 'aig-dashboard',           moduleCode: 'ai-governance', route: '/ai-governance/dashboard',           layout: 'full', requiresModuleActive: true, requiresPermissions: ['ai-governance:read'], navVisibility: 'entitled' },

  // ── Evidence (backfill) ───────────────────────────────────────────────
  { pageCode: 'evidence-expiry',    moduleCode: 'evidence', route: '/evidence/expiry',    layout: 'full', requiresModuleActive: true, requiresPermissions: ['evidence:read'], navVisibility: 'entitled' },
  { pageCode: 'evidence-mappings',  moduleCode: 'evidence', route: '/evidence/mappings',  layout: 'full', requiresModuleActive: true, requiresPermissions: ['evidence:read'], navVisibility: 'entitled' },

  // ── Standalone Feature Pages ──────────────────────────────────────────
  { pageCode: 'workspace-home',     moduleCode: 'admin',       route: '/workspace-home',     layout: 'hub',  requiresModuleActive: false, requiresPermissions: [],                navVisibility: 'always' },
  { pageCode: 'exceptions',         moduleCode: 'exception',   route: '/exceptions',         layout: 'full', requiresModuleActive: true,  requiresPermissions: ['exception:read'], navVisibility: 'entitled' },
  { pageCode: 'findings',           moduleCode: 'audit',       route: '/findings',           layout: 'full', requiresModuleActive: true,  requiresPermissions: ['workspace:read'], navVisibility: 'entitled' },
  { pageCode: 'assets',             moduleCode: 'asset',       route: '/assets',             layout: 'full', requiresModuleActive: true,  requiresPermissions: ['asset:read'],     navVisibility: 'entitled' },
  { pageCode: 'remediation',        moduleCode: 'remediation', route: '/remediation',        layout: 'full', requiresModuleActive: true,  requiresPermissions: ['remediation:read'], navVisibility: 'entitled' },
  { pageCode: 'action-items',       moduleCode: 'action',      route: '/action-items',       layout: 'full', requiresModuleActive: true,  requiresPermissions: ['action:read'],    navVisibility: 'entitled' },
  { pageCode: 'exception-manager',  moduleCode: 'exception',   route: '/exception-manager',  layout: 'full', requiresModuleActive: true,  requiresPermissions: ['exception:read'], navVisibility: 'entitled' },

  // ── Hubs ──────────────────────────────────────────────────────────────
  { pageCode: 'ai-suite',          moduleCode: 'ai',          route: '/ai-suite',          layout: 'hub', requiresModuleActive: false, requiresPermissions: ['copilot:read'],      navVisibility: 'entitled' },
  { pageCode: 'agent-hub',         moduleCode: 'ai',          route: '/agent-hub',         layout: 'hub', requiresModuleActive: false, requiresPermissions: ['agrc_os:read'],      navVisibility: 'entitled' },
  { pageCode: 'vendor-hub',        moduleCode: 'vendor',      route: '/vendor-hub',        layout: 'hub', requiresModuleActive: true,  requiresPermissions: ['vendor:read'],       navVisibility: 'entitled' },
  { pageCode: 'framework-hub',     moduleCode: 'compliance',  route: '/framework-hub',     layout: 'hub', requiresModuleActive: true,  requiresPermissions: ['framework:read'],    navVisibility: 'entitled' },
  { pageCode: 'knowledge-hub',     moduleCode: 'admin',       route: '/knowledge-hub',     layout: 'hub', requiresModuleActive: false, requiresPermissions: ['knowledge:read'],    navVisibility: 'entitled' },
  { pageCode: 'operations-hub',    moduleCode: 'governance',  route: '/operations-hub',    layout: 'hub', requiresModuleActive: true,  requiresPermissions: ['timeline:read'],     navVisibility: 'entitled' },
  { pageCode: 'incident-hub',      moduleCode: 'incident',    route: '/incident-hub',      layout: 'hub', requiresModuleActive: true,  requiresPermissions: ['incident:read'],     navVisibility: 'entitled' },
  { pageCode: 'privacy-hub',       moduleCode: 'policy',      route: '/privacy-hub',       layout: 'hub', requiresModuleActive: true,  requiresPermissions: ['policy:read'],       navVisibility: 'entitled' },
  { pageCode: 'intelligence-hub',  moduleCode: 'compliance',  route: '/intelligence-hub',  layout: 'hub', requiresModuleActive: true,  requiresPermissions: ['framework:read'],    navVisibility: 'entitled' },
  { pageCode: 'analytics-hub',     moduleCode: 'analytics',   route: '/analytics-hub',     layout: 'hub', requiresModuleActive: true, entitlementModuleCodes: ['admin', 'analytics'], requiresPermissions: ['analytics:read'],    navVisibility: 'entitled' },
  { pageCode: 'automation-hub',    moduleCode: 'admin',       route: '/automation-hub',    layout: 'hub', requiresModuleActive: false, requiresPermissions: ['workflow:read'],     navVisibility: 'entitled' },
  { pageCode: 'advanced-hub',      moduleCode: 'analytics',   route: '/advanced-hub',      layout: 'hub', requiresModuleActive: true, entitlementModuleCodes: ['admin', 'analytics'], requiresPermissions: ['analytics:read'],    navVisibility: 'entitled' },

  // ── AI & Autonomous ───────────────────────────────────────────────────
  { pageCode: 'copilot',            moduleCode: 'ai', route: '/copilot',            layout: 'full', requiresModuleActive: false, requiresPermissions: ['copilot:read'],  navVisibility: 'entitled' },
  { pageCode: 'copilot-chat',       moduleCode: 'ai', route: '/copilot-chat',       layout: 'full', requiresModuleActive: false, requiresPermissions: ['copilot:read'],  navVisibility: 'entitled' },
  { pageCode: 'hitl-center',        moduleCode: 'ai', route: '/hitl-center',        layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'],       navVisibility: 'entitled' },
  { pageCode: 'ai-trigger',         moduleCode: 'ai', route: '/ai-trigger',         layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'],       navVisibility: 'entitled' },
  { pageCode: 'ai-execution-plans', moduleCode: 'ai', route: '/ai-execution-plans', layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'],       navVisibility: 'entitled' },
  { pageCode: 'ai-os-dashboard',    moduleCode: 'ai', route: '/ai-os-dashboard',    layout: 'full', requiresModuleActive: true, entitlementModuleCodes: ['ai'], requiresPermissions: ['ai.agent.read'], navVisibility: 'entitled' },
  { pageCode: 'ai-os-dashboard-trace', moduleCode: 'ai', route: '/ai-os-dashboard/traces/:runId', layout: 'full', requiresModuleActive: true, entitlementModuleCodes: ['ai'], requiresPermissions: ['ai.agent.read'], navVisibility: 'hidden' },
  { pageCode: 'ai-recommendation-inbox', moduleCode: 'ai', route: '/ai-recommendation-inbox', layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-decision-history',     moduleCode: 'ai', route: '/ai-decision-history',     layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-policy-rules',         moduleCode: 'ai', route: '/ai-policy-rules',         layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-event-triggers',       moduleCode: 'ai', route: '/ai-event-triggers',       layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-route-rules',          moduleCode: 'ai', route: '/ai-route-rules',          layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-runtime-config',       moduleCode: 'ai', route: '/ai-runtime-config',       layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-cockpit',              moduleCode: 'ai', route: '/ai-cockpit',              layout: 'hub',  requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },
  { pageCode: 'ai-settings',             moduleCode: 'ai', route: '/ai-settings',             layout: 'full', requiresModuleActive: false, requiresPermissions: ['ai:read'], navVisibility: 'entitled' },

  // ── Tasks & Standalone ───────────────────────────────────────────────
  { pageCode: 'my-tasks',                moduleCode: 'workflow', route: '/my-tasks',                layout: 'full', requiresModuleActive: true, entitlementModuleCodes: ['admin', 'workflow'], requiresPermissions: ['task:read'],     navVisibility: 'entitled' },
  { pageCode: 'report-scenarios',        moduleCode: 'reporting', route: '/report-scenarios',      layout: 'full', requiresModuleActive: false, requiresPermissions: ['report:read'],  navVisibility: 'entitled' },

  // ── Standalone Compliance Features ────────────────────────────────────
  { pageCode: 'nca-assessment',       moduleCode: 'compliance', route: '/nca-assessment',       layout: 'full',   requiresModuleActive: true, requiresPermissions: ['assessment:read'],  navVisibility: 'entitled', archetypeVisibility: ['regulated', 'government'] },
  { pageCode: 'sama-assessment',      moduleCode: 'compliance', route: '/sama-assessment',      layout: 'full',   requiresModuleActive: true, requiresPermissions: ['assessment:read'],  navVisibility: 'entitled', archetypeVisibility: ['regulated'] },
  { pageCode: 'scoring-policy',       moduleCode: 'compliance', route: '/scoring-policy',       layout: 'full',   requiresModuleActive: true, requiresPermissions: ['assessment:manage'], navVisibility: 'entitled' },
  { pageCode: 'regulatory-delta',     moduleCode: 'compliance', route: '/regulatory-delta',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['framework:read'],   navVisibility: 'entitled' },
  { pageCode: 'dpia',                 moduleCode: 'compliance', route: '/dpia',                 layout: 'full',   requiresModuleActive: true, requiresPermissions: ['assessment:read'],  navVisibility: 'entitled' },
  { pageCode: 'ucf-browser',          moduleCode: 'compliance', route: '/ucf-browser',          layout: 'full',   requiresModuleActive: true, requiresPermissions: ['framework:read'],   navVisibility: 'entitled' },
  { pageCode: 'control-lifecycle',     moduleCode: 'compliance', route: '/control-lifecycle',     layout: 'full',   requiresModuleActive: true, requiresPermissions: ['control:read'],    navVisibility: 'entitled' },
  { pageCode: 'assessment-templates',  moduleCode: 'compliance', route: '/assessment-templates',  layout: 'full',   requiresModuleActive: true, requiresPermissions: ['assessment:read'], navVisibility: 'entitled' },

  // ── Config Center ──────────────────────────────────────────────────────
  { pageCode: 'config-center-resolve',   moduleCode: 'config-center', route: '/config-center/resolve',   layout: 'full', requiresModuleActive: false, requiresPermissions: ['config.setting.read'],  navVisibility: 'entitled' },
  { pageCode: 'config-center-settings',  moduleCode: 'config-center', route: '/config-center/settings',  layout: 'full', requiresModuleActive: false, requiresPermissions: ['config.setting.read'],  navVisibility: 'entitled' },
  { pageCode: 'config-center-audit',     moduleCode: 'config-center', route: '/config-center/audit',     layout: 'full', requiresModuleActive: false, requiresPermissions: ['config.audit.read'],    navVisibility: 'entitled' },
  { pageCode: 'config-center-health',    moduleCode: 'config-center', route: '/config-center/health',    layout: 'full', requiresModuleActive: false, requiresPermissions: ['config.health.read'],   navVisibility: 'entitled' },
  { pageCode: 'config-center-compare',   moduleCode: 'config-center', route: '/config-center/compare',   layout: 'full', requiresModuleActive: false, requiresPermissions: ['config.compare.read'],  navVisibility: 'entitled' },
];

/** Lookup by route */
export const PAGE_BY_ROUTE = new Map(
  PAGE_REGISTRY.map(p => [p.route, p])
);

/** Lookup by page code */
export const PAGE_BY_CODE = new Map(
  PAGE_REGISTRY.map(p => [p.pageCode, p])
);

// W9.D9.3 — Foundation pages can be resolved at runtime from
// dos.dynamic_ui_routes via /api/dynamic-ui/contract/foundation. The static
// PAGE_REGISTRY block above remains as a hard fallback. The helper below
// merges live route catalog rows over the static foundation entries so the
// SPA's blueprint resolver, page-access service, and runtime store all see
// a single authoritative page registry.

export interface DynamicFoundationRouteRow {
  module_code?: string;
  path_pattern: string;
  component_key?: string;
  permission_key?: string | null;
  sort_order?: number;
  readiness?: string | null;
}

const HIDDEN_PAGE_READINESS = new Set(['STUB', 'BLOCKED']);

/**
 * Builds the foundation slice of the page registry by overlaying dynamic-ui
 * route-catalog rows on top of the static foundation entries. Rows whose
 * readiness is STUB or BLOCKED are dropped so they cannot be resolved by the
 * blueprint resolver. Returns a fresh array; callers compose it with the
 * non-foundation static entries from PAGE_REGISTRY.
 */
export function buildFoundationPageRegistry(
  dynamic?: DynamicFoundationRouteRow[],
): PageRegistryEntry[] {
  const staticFoundation = PAGE_REGISTRY.filter(
    p => p.moduleCode === 'foundation' || p.route.startsWith('/foundation/'),
  );
  if (!dynamic || dynamic.length === 0) return staticFoundation;
  const staticByRoute = new Map(staticFoundation.map(p => [p.route, p]));
  const out: PageRegistryEntry[] = [];
  for (const row of [...dynamic].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )) {
    if (HIDDEN_PAGE_READINESS.has(String(row.readiness ?? '').toUpperCase())) continue;
    const fallback = staticByRoute.get(row.path_pattern);
    if (fallback) {
      out.push({
        ...fallback,
        requiresPermissions: row.permission_key
          ? [row.permission_key]
          : fallback.requiresPermissions,
      });
    } else {
      out.push({
        pageCode: row.path_pattern.replace(/^\//, '').replace(/\//g, '-'),
        moduleCode: row.module_code || 'foundation',
        route: row.path_pattern,
        layout: 'full',
        requiresModuleActive: false,
        requiresPermissions: row.permission_key ? [row.permission_key] : [],
        navVisibility: 'entitled',
      });
    }
  }
  return out.length ? out : staticFoundation;
}

/**
 * Build the full effective page registry by replacing the foundation slice
 * with the dynamic version. Non-foundation entries are passed through
 * untouched (they still come from the static catalog).
 */
export function buildEffectivePageRegistry(
  dynamicFoundationRoutes?: DynamicFoundationRouteRow[],
): PageRegistryEntry[] {
  const nonFoundation = PAGE_REGISTRY.filter(
    p => !(p.moduleCode === 'foundation' || p.route.startsWith('/foundation/')),
  );
  return [...buildFoundationPageRegistry(dynamicFoundationRoutes), ...nonFoundation];
}
