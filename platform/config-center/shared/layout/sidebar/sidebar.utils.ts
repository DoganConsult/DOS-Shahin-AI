/**
 * Sidebar utility exports: interfaces, constants, and pure functions for
 * RBAC-based navigation filtering and lifecycle-phase grouping.
 *
 * Extracted from the deprecated sidebar.component.ts so that consumers can
 * import these symbols without pulling in the full component module.
 */

import { LifecyclePhase } from '../header/lifecycle-bar.component';
import { ROLE_PERMISSIONS } from '../../constants/rbac.constants';
import { hasPermission } from '../../utils/rbac.utils';
import { getVisibleNavItems as _getVisibleNavItems } from '../../utils/navigation.utils';

export type { LifecyclePhase } from '../header/lifecycle-bar.component';
export { ROLE_PERMISSIONS, hasPermission };
export type { NavItem } from '../../types/navigation.types';
import type { NavItem } from '../../types/navigation.types';

export function getVisibleNavItems(role: string, checker?: (perm: string) => boolean): NavItem[] {
  return _getVisibleNavItems(role, ALL_NAV_ITEMS, checker);
}

export const ALL_NAV_ITEMS: NavItem[] = [
  // ── Plan ──────────────────────────────────────────────────────────────────
  { icon: 'dashboard',            labelKey: 'nav.dashboard',          route: '/workspace-home',   requiredPermission: 'analytics.report.read', section: 'main',        lifecyclePhase: 'plan' },
  { icon: 'home',                 labelKey: 'sidebar.foundationOverview', route: '/foundation',              requiredPermission: 'workspace.config.read', section: 'account',     lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'building',             labelKey: 'sidebar.foundationOrg',  route: '/foundation/organization', requiredPermission: 'workspace.config.read', section: 'account',     lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'users',                labelKey: 'sidebar.foundationUsers',route: '/foundation/users',        requiredPermission: 'workspace.config.read', section: 'account',     lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'sliders-h',            labelKey: 'sidebar.foundationRoles',route: '/foundation/roles',        requiredPermission: 'workspace.config.read', section: 'account',     lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'briefcase',            labelKey: 'sidebar.foundationBU',   route: '/foundation/business-units', requiredPermission: 'workspace.config.read', section: 'account',   lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'sitemap',              labelKey: 'sidebar.foundationDepts',route: '/foundation/departments',  requiredPermission: 'workspace.config.read', section: 'account',     lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'map-marker',           labelKey: 'sidebar.foundationLocs', route: '/foundation/locations',    requiredPermission: 'workspace.config.read', section: 'account',     lifecyclePhase: 'plan',      agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'users',                labelKey: 'sidebar.foundationTeams', route: '/foundation/teams', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'file',                 labelKey: 'sidebar.foundationPolicies', route: '/foundation/policies', requiredPermission: 'governance.record.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'server',               labelKey: 'sidebar.foundationAssets', route: '/assets', requiredPermission: 'asset.record.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'shield',               labelKey: 'sidebar.foundationDataProcessing', route: '/foundation/data-processing', requiredPermission: 'governance.record.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'verified',             labelKey: 'sidebar.foundationAccessReview', route: '/foundation/access-review', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'id-card',              labelKey: 'sidebar.foundationPositions', route: '/foundation/positions', requiredPermission: 'position.record.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'link',                 labelKey: 'sidebar.foundationOwnership', route: '/foundation/ownership-mapping', requiredPermission: 'foundation.org.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'database',             labelKey: 'sidebar.foundationRefData', route: '/foundation/reference-data', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'bell',                 labelKey: 'sidebar.foundationNotifications', route: '/foundation/notifications', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'history',              labelKey: 'sidebar.foundationAudit', route: '/foundation/audit', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'check-square',         labelKey: 'sidebar.foundationApprovals', route: '/approval-center', requiredPermission: 'workflow.instance.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  { icon: 'cog',                  labelKey: 'sidebar.foundationSettings', route: '/foundation/settings', requiredPermission: 'admin.system.read', section: 'account', lifecyclePhase: 'plan', agentId: 'A02', moduleGroup: 'foundation' },
  // Global Search removed from sidebar — lives in topbar as always-visible widget
  { icon: 'calendar',             labelKey: 'sidebar.ninetyDayPlan',  route: '/ninety-day-plan',  requiredPermission: 'analytics.report.read', section: 'intelligence',lifecyclePhase: 'plan' },
  // Governance children (new canonical routes under /governance/*) — A08
  { icon: 'home',                 labelKey: 'sidebar.governanceOverview',    route: '/governance/overview',    requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'file',                 labelKey: 'sidebar.governancePolicies',    route: '/governance/policies',    requiredPermission: 'policy.document.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'list',                 labelKey: 'sidebar.governanceProcedures',  route: '/governance/procedures',  requiredPermission: 'policy.document.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'users',                labelKey: 'sidebar.governanceCommittees',  route: '/governance/committees',  requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'check-square',         labelKey: 'sidebar.governanceDecisions',   route: '/governance/decisions',   requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'bolt',                 labelKey: 'sidebar.governanceActions',     route: '/governance/actions',     requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'exclamation-triangle', labelKey: 'sidebar.governanceExceptions',  route: '/governance/exceptions',  requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'book',                 labelKey: 'sidebar.governanceMandates',    route: '/governance/mandates',    requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'eye',                  labelKey: 'sidebar.governanceReviews',     route: '/governance/reviews',     requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'check-circle',         labelKey: 'sidebar.governanceAcks',        route: '/governance/acknowledgements', requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'bullseye',             labelKey: 'sidebar.governanceObjectives',  route: '/governance/objectives',  requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'share-alt',            labelKey: 'sidebar.governanceDelegations', route: '/governance/delegations', requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'id-card',              labelKey: 'sidebar.governanceResponsibilities', route: '/governance/responsibilities', requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'th',                   labelKey: 'sidebar.governanceRaci',        route: '/governance/raci-templates', requiredPermission: 'team.member.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'clipboard',            labelKey: 'sidebar.governanceObligations', route: '/governance/obligations', requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'file-alt',             labelKey: 'sidebar.governanceCharters',   route: '/governance/charters',    requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'heart',                labelKey: 'sidebar.governanceHealth',     route: '/governance/health',      requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'sitemap',              labelKey: 'sidebar.governanceStructure',  route: '/governance/structure',   requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'briefcase',            labelKey: 'sidebar.governanceBoardPacks', route: '/governance/board-packs', requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  { icon: 'calendar',             labelKey: 'sidebar.governanceCalendar',    route: '/governance/calendar',    requiredPermission: 'governance.record.read', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'governance' },
  // AI Governance (registries, bindings, enforcement, audit)
  { icon: 'microchip',             labelKey: 'sidebar.aiGovernance',     route: '/ai-governance',     requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'chart-bar',             labelKey: 'sidebar.aiGovDashboard',  route: '/ai-governance/dashboard', requiredPermission: 'ai.governance.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'server',                labelKey: 'sidebar.aiGovAssets',      route: '/ai-governance/assets', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'box',                   labelKey: 'sidebar.aiGovModels',      route: '/ai-governance/models', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'comment',               labelKey: 'sidebar.aiGovPrompts',     route: '/ai-governance/prompts', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'android',               labelKey: 'sidebar.aiGovAgents',      route: '/ai-governance/agents', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'link',                  labelKey: 'sidebar.aiGovBindings',    route: '/ai-governance/bindings', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'shield',                labelKey: 'sidebar.aiGovEnforcement', route: '/ai-governance/enforcement', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'exclamation-circle',    labelKey: 'sidebar.aiGovMismatches',  route: '/ai-governance/mismatches', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  { icon: 'history',               labelKey: 'sidebar.aiGovAudit',       route: '/ai-governance/audit', requiredPermission: 'ai.agent.read', section: 'grc', lifecyclePhase: 'operate', moduleGroup: 'ai-governance' },
  // Policy Module (canonical routes under /policy/*) — A08
  { icon: 'home',                 labelKey: 'sidebar.policyHome',         route: '/policy/home',         requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'inbox',                labelKey: 'sidebar.policyWorkQueue',    route: '/policy/work-queue',   requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'book',                 labelKey: 'sidebar.policyLibrary',      route: '/policy/library',      requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'pencil',               labelKey: 'sidebar.policyDrafting',     route: '/policy/drafting',     requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'send',                 labelKey: 'sidebar.policyPublications', route: '/policy/publications', requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'exclamation-triangle', labelKey: 'sidebar.policyExceptions',   route: '/policy/exceptions',   requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'sitemap',              labelKey: 'sidebar.policyCoverage',     route: '/policy/coverage',     requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'chart-bar',            labelKey: 'sidebar.policyReports',      route: '/policy/reports',      requiredPermission: 'policy.document.read',   section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  { icon: 'cog',                  labelKey: 'sidebar.policyAdmin',        route: '/policy/admin',        requiredPermission: 'policy.document.manage', section: 'grc', lifecyclePhase: 'plan', agentId: 'A08', moduleGroup: 'policy' },
  // Knowledge Hub (ontology + taxonomy + entity-links + entity-graph + knowledge-base) — A03
  { icon: 'sitemap',              labelKey: 'sidebar.knowledgeHub',   route: '/knowledge-hub',    requiredPermission: 'framework.record.read', section: 'grc',         lifecyclePhase: 'plan',      agentId: 'A03' },

  // ── Assess ────────────────────────────────────────────────────────────────
  // Risk Hub (risks + scoring + model-risk + vulnerabilities) — A07
  { icon: 'exclamation-triangle', labelKey: 'sidebar.riskHub',        route: '/risk-hub',         requiredPermission: 'risk.record.read',      section: 'grc',         lifecyclePhase: 'assess',    agentId: 'A07', moduleGroup: 'risk' },
  // Risk Workspace (full risk operating workspace: register, heatmap, treatments, KRIs, appetite)
  { icon: 'exclamation-triangle', labelKey: 'sidebar.riskWorkspace',  route: '/risk-workspace',   requiredPermission: 'risk.record.read',      section: 'grc',         lifecyclePhase: 'assess',    agentId: 'A07', moduleGroup: 'risk' },
  { icon: 'maturity',             labelKey: 'sidebar.maturity',       route: '/maturity',         requiredPermission: 'assessment.record.read',section: 'grc',         lifecyclePhase: 'assess' },
  // Vendor Hub (vendors + vendor-risk) — A09
  { icon: 'truck',                labelKey: 'sidebar.vendorHub',      route: '/vendor-hub',       requiredPermission: 'vendor.record.read',    section: 'operations',  lifecyclePhase: 'assess',    agentId: 'A09' },

  // ── Implement ─────────────────────────────────────────────────────────────
  // Compliance Hub children (canonical routes under /compliance/*) — A05+A06
  { icon: 'chart-bar',            labelKey: 'sidebar.complianceOverview',     route: '/compliance/overview',     requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'sitemap',              labelKey: 'sidebar.complianceFrameworks',   route: '/compliance/frameworks',   requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'sliders-h',            labelKey: 'sidebar.complianceControls',     route: '/compliance/controls',     requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'list',                 labelKey: 'sidebar.complianceObligations',  route: '/compliance/obligations',  requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'clipboard',            labelKey: 'sidebar.complianceAssessments',  route: '/compliance/assessments',  requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'exclamation-triangle', labelKey: 'sidebar.complianceGaps',         route: '/compliance/gaps',         requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'share-alt',            labelKey: 'sidebar.complianceMappings',     route: '/compliance/mappings',     requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'chart-line',           labelKey: 'sidebar.compliancePosture',      route: '/compliance/posture',      requiredPermission: 'control.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  { icon: 'th',                    labelKey: 'sidebar.complianceHeatmap',     route: '/compliance/heatmap',      requiredPermission: 'framework.record.read', section: 'grc', lifecyclePhase: 'implement', agentId: 'A06', moduleGroup: 'compliance' },
  // Evidence Module — A05
  { icon: 'folder-open',          labelKey: 'sidebar.evidenceOverview',  route: '/evidence/overview',   requiredPermission: 'evidence.item.read',  section: 'grc',  lifecyclePhase: 'implement', agentId: 'A05', moduleGroup: 'evidence' },
  { icon: 'lock',                 labelKey: 'sidebar.evidenceVault',     route: '/evidence/vault',      requiredPermission: 'evidence.item.read',  section: 'grc',  lifecyclePhase: 'implement', agentId: 'A05', moduleGroup: 'evidence' },
  { icon: 'inbox',                labelKey: 'sidebar.evidenceRequests',  route: '/evidence/requests',   requiredPermission: 'evidence.item.read',  section: 'grc',  lifecyclePhase: 'implement', agentId: 'A05', moduleGroup: 'evidence' },
  { icon: 'eye',                  labelKey: 'sidebar.evidenceReviews',   route: '/evidence/reviews',    requiredPermission: 'evidence.item.read',  section: 'grc',  lifecyclePhase: 'implement', agentId: 'A05', moduleGroup: 'evidence' },
  { icon: 'calendar',             labelKey: 'sidebar.evidenceExpiry',    route: '/evidence/expiry',     requiredPermission: 'evidence.item.read',  section: 'grc',  lifecyclePhase: 'implement', agentId: 'A05', moduleGroup: 'evidence' },
  { icon: 'sitemap',              labelKey: 'sidebar.evidenceMappings',  route: '/evidence/mappings',   requiredPermission: 'evidence.item.read',  section: 'grc',  lifecyclePhase: 'implement', agentId: 'A05', moduleGroup: 'evidence' },
  // Framework Hub (ucf + control-lifecycle + regulation + mappings + content-packs) — A03
  { icon: 'book',                 labelKey: 'sidebar.frameworkHub',   route: '/framework-hub',    requiredPermission: 'framework.record.read', section: 'grc',         lifecyclePhase: 'implement', agentId: 'A03' },
  // Connector Hub (connector-manager + health + marketplace) — A01
  { icon: 'link',                 labelKey: 'sidebar.connectorHub',   route: '/connector-hub',    requiredPermission: 'workspace.config.read', section: 'grc',         lifecyclePhase: 'implement', agentId: 'A01' },

  // ── Operate ───────────────────────────────────────────────────────────────
  { icon: 'inbox',                labelKey: 'sidebar.myTasks',        route: '/my-tasks',         requiredPermission: 'task.item.read',      section: 'operations',  lifecyclePhase: 'operate' },
  // Operations Hub (timeline + task-board + action-items + messaging) — A08
  { icon: 'calendar',             labelKey: 'sidebar.operationsHub',  route: '/operations-hub',   requiredPermission: 'timeline.event.read',  section: 'operations',  lifecyclePhase: 'operate',   agentId: 'A08' },
  // Incident Hub (incidents + exceptions + exception-manager + remediation + bcp) — A06
  { icon: 'bolt',                 labelKey: 'sidebar.incidentHub',    route: '/incident-hub',     requiredPermission: 'incident.record.read',  section: 'operations',  lifecyclePhase: 'operate',   agentId: 'A06' },
  // Privacy Hub (privacy-ops + privacy-budget + dpia) — A08
  { icon: 'eye-slash',            labelKey: 'sidebar.privacyHub',     route: '/privacy-hub',      requiredPermission: 'policy.document.read',    section: 'operations',  lifecyclePhase: 'operate',   agentId: 'A08' },
  { icon: 'cadence-calendar',     labelKey: 'grcOs.cadence',          route: '/cadence-calendar', requiredPermission: 'workspace.config.read', section: 'grc',         lifecyclePhase: 'operate' },
  { icon: 'history',              labelKey: 'sidebar.activityStream', route: '/activity-stream',  requiredPermission: 'analytics.report.read', section: 'operations',  lifecyclePhase: 'operate' },
  { icon: 'activity-feed',        labelKey: 'sidebar.activityFeed',   route: '/activity-feed',    requiredPermission: 'analytics.report.read', section: 'operations',  lifecyclePhase: 'operate' },

  // Training & Awareness — A08
  { icon: 'book',                 labelKey: 'sidebar.trainingAwareness', route: '/training-awareness', requiredPermission: 'training.record.read', section: 'operations', lifecyclePhase: 'operate', agentId: 'A08' },
  // Ethics & Integrity — A08
  { icon: 'heart',                labelKey: 'sidebar.ethicsIntegrity',   route: '/ethics-integrity',   requiredPermission: 'policy.document.read',   section: 'operations', lifecyclePhase: 'operate', agentId: 'A08' },

  // ── Assure ────────────────────────────────────────────────────────────────
  // Audit Hub (overview + plan + engagements + findings + capa + validation + reports) — A10
  { icon: 'verified',             labelKey: 'sidebar.auditHub',       route: '/audit',            requiredPermission: 'audit.record.read',     section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10' },
  { icon: 'globe',                labelKey: 'sidebar.auditUniverse', route: '/audit/universe',    requiredPermission: 'audit.record.read',     section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'chart-bar',            labelKey: 'sidebar.auditRiskPlanning', route: '/audit/risk-planning', requiredPermission: 'audit.record.read', section: 'operations', lifecyclePhase: 'assure', agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'clock',                labelKey: 'sidebar.auditSchedules', route: '/audit/schedules',  requiredPermission: 'audit.record.read',     section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'file-alt',             labelKey: 'sidebar.auditWorkingPapers', route: '/audit/working-papers', requiredPermission: 'audit.record.manage', section: 'operations', lifecyclePhase: 'assure', agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'users',                labelKey: 'sidebar.auditTeam',     route: '/audit/team',        requiredPermission: 'audit.record.manage',    section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'redo',                 labelKey: 'sidebar.auditRepeatFindings', route: '/audit/repeat-findings', requiredPermission: 'audit.record.read', section: 'operations', lifecyclePhase: 'assure', agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'check-square',         labelKey: 'sidebar.auditQaReviews', route: '/audit/qa-reviews', requiredPermission: 'audit.record.manage',    section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'chart-line',           labelKey: 'sidebar.auditFindingTrends', route: '/audit/finding-trends', requiredPermission: 'audit.record.read', section: 'operations', lifecyclePhase: 'assure', agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'star',                 labelKey: 'sidebar.auditRatings',  route: '/audit/ratings',     requiredPermission: 'audit.record.read',     section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'flask',                labelKey: 'sidebar.auditCapaEffectiveness', route: '/audit/capa-effectiveness', requiredPermission: 'audit.record.manage', section: 'operations', lifecyclePhase: 'assure', agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'th-large',             labelKey: 'sidebar.auditCommittee', route: '/audit/committee',  requiredPermission: 'audit.record.read',     section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'external-link-alt',    labelKey: 'sidebar.auditExternal', route: '/audit/external',    requiredPermission: 'audit.record.manage',   section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'gavel',                labelKey: 'sidebar.auditRegulatory', route: '/audit/regulatory', requiredPermission: 'audit.record.read',    section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'tasks',                labelKey: 'sidebar.auditTestPlans', route: '/audit/test-plans', requiredPermission: 'audit.record.manage',   section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10', moduleGroup: 'audit' },
  { icon: 'book',                 labelKey: 'sidebar.akb',            route: '/akb',              requiredPermission: 'audit.record.read',     section: 'operations',  lifecyclePhase: 'assure',  agentId: 'A10' },
  // Intelligence Hub (registry + regulator-heatmap + framework-mapping + ksa + public-explorer) — A03
  { icon: 'globe',                labelKey: 'sidebar.intelligenceHub',route: '/intelligence-hub', requiredPermission: 'framework.record.read', section: 'intelligence',lifecyclePhase: 'assure',  agentId: 'A03' },
  { icon: 'nca-assessment',       labelKey: 'sidebar.ncaAssessment',  route: '/nca-assessment',   requiredPermission: 'assessment.record.read',section: 'grc',         lifecyclePhase: 'assure' },
  { icon: 'building-columns',    labelKey: 'sidebar.samaAssessment', route: '/sama-assessment',  requiredPermission: 'assessment.record.read',section: 'grc',         lifecyclePhase: 'assure' },
  { icon: 'balance-scale',       labelKey: 'sidebar.scoringPolicy',  route: '/scoring-policy',   requiredPermission: 'assessment.record.manage',section: 'grc',       lifecyclePhase: 'assure' },
  { icon: 'exchange-alt',        labelKey: 'sidebar.regulatoryDelta',route: '/regulatory-delta',  requiredPermission: 'framework.record.read', section: 'intelligence',lifecyclePhase: 'assure' },
  { icon: 'assets',               labelKey: 'sidebar.assets',         route: '/assets',           requiredPermission: 'workspace.config.read', section: 'operations',  lifecyclePhase: 'assure' },

  // ── Improve ───────────────────────────────────────────────────────────────
  { icon: 'agrc-os',              labelKey: 'sidebar.agrcOs',         route: '/agrc-os',          requiredPermission: 'platform.agent.read',   section: 'intelligence',lifecyclePhase: 'improve' },
  // Power Dashboards
  { icon: 'shield',               labelKey: 'sidebar.executiveCommand', route: '/executive-command', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'microchip-ai',         labelKey: 'sidebar.autonomousMonitor', route: '/autonomous-monitor', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'sliders-h',            labelKey: 'sidebar.aiOsDashboard', route: '/ai-os-dashboard', requiredPermission: 'ai.agent.read', section: 'intelligence', lifecyclePhase: 'improve', agentId: 'A11' },
  { icon: 'th-large',             labelKey: 'sidebar.frameworkScorecard', route: '/framework-scorecard', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'table',                labelKey: 'sidebar.controlPosture', route: '/control-posture', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'star',                 labelKey: 'sidebar.maturityJourney', route: '/maturity-journey', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'improve' },
  { icon: 'dollar',               labelKey: 'sidebar.complianceSavings', route: '/compliance-savings', requiredPermission: 'analytics.report.read', section: 'intelligence', lifecyclePhase: 'improve' },
  // Reports Hub (canonical /reports) — A10
  { icon: 'file-pdf',             labelKey: 'sidebar.reportsHub',     route: '/reports',          requiredPermission: 'report.document.read',    section: 'intelligence',lifecyclePhase: 'improve', agentId: 'A10', moduleGroup: 'reporting' },
  // Workflow Hub (workflows + workflow-templates) — A08
  { icon: 'sitemap',              labelKey: 'sidebar.workflowHub',    route: '/workflow-hub',     requiredPermission: 'workflow.instance.read',  section: 'intelligence',lifecyclePhase: 'improve', agentId: 'A08' },
  // AI Suite (ai-hub + squad + queue + copilot) — A04
  { icon: 'microchip-ai',         labelKey: 'sidebar.aiSuite',        route: '/ai-suite',         requiredPermission: 'copilot.assistant.read',   section: 'intelligence',lifecyclePhase: 'improve', agentId: 'A04' },
  // Analytics Hub (analytics-dashboard + shared-dashboard + dashboard-sharing + data-explorer) — A10
  { icon: 'chart-line',           labelKey: 'sidebar.analyticsHub',   route: '/analytics-hub',    requiredPermission: 'analytics.report.read', section: 'intelligence',lifecyclePhase: 'improve', agentId: 'A10' },
  // Automation Hub (autonomous-config + workflows + autonomy-engine + automation + ai-trigger) — A06
  { icon: 'play-circle',          labelKey: 'sidebar.automationHub',  route: '/automation-hub',   requiredPermission: 'workflow.instance.read',  section: 'intelligence',lifecyclePhase: 'improve', agentId: 'A06' },
  // Advanced Hub (digital-twin + red-team + explainability + contract-tests) — A07
  { icon: 'objects-column',       labelKey: 'sidebar.advancedHub',    route: '/advanced-hub',     requiredPermission: 'analytics.report.read', section: 'advanced',    lifecyclePhase: 'improve', agentId: 'A07' },
  { icon: 'scoring-policies',     labelKey: 'sidebar.scoringPolicies',route: '/scoring-policies', requiredPermission: 'compliance.program.read',section: 'intelligence',lifecyclePhase: 'improve' },
  // Workspace Lifecycle (re-answer, checkpoints, seeding depth, misalignment)
  { icon: 'cog',                  labelKey: 'sidebar.workspaceLifecycle', route: '/workspace-lifecycle', requiredPermission: 'workspace.config.read', section: 'intelligence', lifecyclePhase: 'improve' },

  // ── Account ───────────────────────────────────────────────────────────────
  // Team Hub → canonical Foundation Teams
  { icon: 'users',                labelKey: 'sidebar.teamHub',        route: '/foundation/teams', requiredPermission: 'workspace.config.read', section: 'operate',     lifecyclePhase: 'operate', agentId: 'A02' },
  // Admin Hub (administration + field-rbac + inference-admin + provisioning + bulk-import + training-data) — A02
  { icon: 'sliders-h',            labelKey: 'sidebar.adminHub',       route: '/admin-hub',        requiredPermission: 'users.account.manage',   section: 'account',     lifecyclePhase: 'account', agentId: 'A02' },
  { icon: 'profile',              labelKey: 'nav.profile',            route: '/profile',          requiredPermission: 'profile.record.read',   section: 'account',     lifecyclePhase: 'account' },
  { icon: 'tenant-config',        labelKey: 'grcOs.tenantConfig',     route: '/tenant-config',    requiredPermission: 'admin.system.read',     section: 'account',     lifecyclePhase: 'account' },
  { icon: 'envelope',             labelKey: 'sidebar.emailApprovals', route: '/platform-email-approvals', requiredPermission: 'admin.system.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'tier-management',      labelKey: 'grcOs.tierUpgrade',      route: '/tier-management',  requiredPermission: 'admin.system.read',     section: 'account',     lifecyclePhase: 'account' },
  { icon: 'bell',                 labelKey: 'sidebar.notificationCenter', route: '/notifications', requiredPermission: 'workspace.config.read', section: 'account',  lifecyclePhase: 'account' },
  { icon: 'bell-slash',           labelKey: 'sidebar.notificationPrefs',  route: '/notification-preferences', requiredPermission: 'workspace.config.read', section: 'account', lifecyclePhase: 'account' },
  { icon: 'book',                 labelKey: 'nav.playbook',           route: '/playbook',         requiredPermission: 'workflow.instance.read', section: 'account',     lifecyclePhase: 'account' },

  // ── Qiyas Module ─────────────────────────────────────────────────────────
  // Qiyas items only visible when activeModule === 'qiyas'
  { icon: 'chart-bar',            labelKey: 'qiyas.dashboard',        route: '/qiyas',                    requiredPermission: 'analytics.report.read',  section: 'qiyas', lifecyclePhase: 'plan' },
  { icon: 'list',                 labelKey: 'qiyas.models',           route: '/qiyas/models',             requiredPermission: 'analytics.report.read',  section: 'qiyas', lifecyclePhase: 'plan' },
  { icon: 'clipboard',            labelKey: 'qiyas.assessments',      route: '/qiyas/assessments',        requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'assess' },
  { icon: 'lightbulb',            labelKey: 'qiyas.recommendations',  route: '/qiyas/recommendations',    requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'assess' },
  { icon: 'map',                  labelKey: 'qiyas.roadmap',          route: '/qiyas/roadmap',            requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'improve' },
  { icon: 'sliders-h',            labelKey: 'qiyas.calibration',      route: '/qiyas/calibration',        requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'assess' },
  { icon: 'star-half-alt',        labelKey: 'qiyas.evidenceScoring',  route: '/qiyas/evidence-scoring',   requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'assess' },
  { icon: 'th',                   labelKey: 'qiyas.maturityHeatmap',  route: '/qiyas/maturity-heatmap',   requiredPermission: 'analytics.report.read',  section: 'qiyas', lifecyclePhase: 'assess' },
  { icon: 'chart-line',           labelKey: 'qiyas.maturityTrends',   route: '/qiyas/maturity-trends',    requiredPermission: 'analytics.report.read',  section: 'qiyas', lifecyclePhase: 'improve' },
  { icon: 'balance-scale',        labelKey: 'qiyas.benchmarks',       route: '/qiyas/benchmarks',         requiredPermission: 'analytics.report.read',  section: 'qiyas', lifecyclePhase: 'improve' },
  { icon: 'certificate',          labelKey: 'qiyas.certification',    route: '/qiyas/certification',      requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'improve' },
  { icon: 'users',                labelKey: 'qiyas.respondents',      route: '/qiyas/respondents',        requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'assess' },
  { icon: 'question-circle',      labelKey: 'qiyas.questionBank',     route: '/qiyas/questions',          requiredPermission: 'analytics.report.read',  section: 'qiyas', lifecyclePhase: 'plan' },
  { icon: 'crosshairs',           labelKey: 'qiyas.scoping',          route: '/qiyas/scoping',            requiredPermission: 'assessment.record.read', section: 'qiyas', lifecyclePhase: 'plan' },
];

// ---- Role-adaptive nav ----

export interface NavSection {
  label: string;
  icon: string;
  items: NavItem[];
  expanded: boolean;
}

// SidebarMode is centralized in SidebarService — re-exported for backward compatibility
export type { SidebarMode } from '@app/shared/services/sidebar.service';

/**
 * Per-role ordered route lists. First section is expanded by default.
 *
 * TODO(Law4): These role-to-navigation mappings should be driven by the DAuth
 * access snapshot (visibleModules + permissions) rather than hardcoded per role.
 * The sidebar should render navigation based on what the backend grants, not
 * static role-name lookups. Until then, these are display-only hints — actual
 * route access is enforced by backend guards and DAuth route guards.
 * @see AGENTS.md Patch 0 §4 Law 4 — No frontend-invented truth
 */
// Shared route arrays to avoid duplication across roles
const FOUNDATION_ROUTES = ['/foundation', '/foundation/organization', '/foundation/business-units', '/foundation/users', '/foundation/roles', '/foundation/departments', '/foundation/locations', '/foundation/positions', '/foundation/committees', '/foundation/delegations', '/foundation/ownership-mapping', '/foundation/reference-data', '/foundation/notifications', '/approval-center', '/foundation/audit'];
// Admin-only routes extracted from mixed sections into dedicated admin/personal sections
const ADMIN_ROUTES = ['/admin-hub', '/tenant-config', '/foundation/settings', '/foundation/permissions', '/platform-email-approvals', '/tier-management', '/billing', '/connector-hub'];
const PERSONAL_ROUTES = ['/profile', '/account-settings', '/security-settings', '/notification-preferences', '/notifications'];
const GOVERNANCE_ROUTES = ['/governance/overview', '/governance/policies', '/governance/procedures', '/governance/committees', '/governance/decisions', '/governance/actions', '/governance/exceptions', '/governance/calendar', '/governance/mandates', '/governance/reviews', '/governance/acknowledgements', '/governance/objectives', '/governance/delegations', '/governance/responsibilities', '/governance/raci-templates', '/governance/obligations', '/governance/charters', '/governance/health', '/governance/structure', '/governance/board-packs'];
const COMPLIANCE_ROUTES = ['/compliance/overview', '/compliance/frameworks', '/compliance/controls', '/compliance/obligations', '/compliance/assessments', '/compliance/gaps', '/compliance/mappings', '/compliance/posture', '/compliance/heatmap'];
const EVIDENCE_ROUTES = ['/evidence/overview', '/evidence/vault', '/evidence/requests', '/evidence/reviews', '/evidence/expiry', '/evidence/mappings'];
const AUDIT_SUB_ROUTES = ['/audit', '/audit/universe', '/audit/risk-planning', '/audit/schedules', '/audit/working-papers', '/audit/team', '/audit/repeat-findings', '/audit/qa-reviews', '/audit/finding-trends', '/audit/ratings', '/audit/capa-effectiveness', '/audit/committee', '/audit/external', '/audit/regulatory', '/audit/test-plans'];
const QIYAS_ROUTES = ['/qiyas', '/qiyas/models', '/qiyas/assessments', '/qiyas/recommendations', '/qiyas/roadmap', '/qiyas/calibration', '/qiyas/evidence-scoring', '/qiyas/maturity-heatmap', '/qiyas/maturity-trends', '/qiyas/benchmarks', '/qiyas/certification', '/qiyas/respondents', '/qiyas/questions', '/qiyas/scoping'];

const POLICY_ROUTES_NAV = ['/policy/home', '/policy/work-queue', '/policy/library', '/policy/drafting', '/policy/publications', '/policy/exceptions', '/policy/coverage', '/policy/reports', '/policy/admin'];
const INCIDENT_ROUTES = ['/incident-hub', '/incidents/overview', '/incidents/register', '/incidents/investigation', '/incidents/war-room', '/incidents/near-miss', '/incidents/pir', '/incidents/trends', '/incidents/regulatory', '/incidents/taxonomy', '/incidents/lessons'];
const VENDOR_ROUTES = ['/vendor-hub', '/vendor-risk/home', '/vendor-risk/register', '/vendor-risk/assessments', '/vendor-risk/due-diligence', '/vendor-risk/sla', '/vendor-risk/fourth-party', '/vendor-risk/concentration', '/vendor-risk/offboarding', '/vendor-risk/monitoring'];
const TRAINING_ROUTES = ['/training-awareness', '/training/overview', '/training/campaigns', '/training/assignments', '/training/content', '/training/certifications', '/training/phishing', '/training/compliance', '/training/reports'];

export const ROLE_NAV_ROUTE_CONFIGS: Record<string, { labelKey: string; icon: string; routes: string[] }[]> = {
  super_admin: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/agrc-os', '/ninety-day-plan', '/my-tasks', '/operations-hub', '/activity-stream'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.governanceRisk',  icon: 'shield',     routes: ['/risk-hub', '/risk-workspace', '/framework-hub', ...VENDOR_ROUTES] },
    { labelKey: 'sidebarSections.operations',     icon: 'bolt',        routes: [...INCIDENT_ROUTES, ...EVIDENCE_ROUTES, '/cadence-calendar', '/privacy-hub', ...TRAINING_ROUTES, '/ethics-integrity'] },
    { labelKey: 'sidebarSections.assessAudit',    icon: 'check-square',routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/maturity', ...AUDIT_SUB_ROUTES, '/akb', '/intelligence-hub', '/assets'] },
    { labelKey: 'sidebarSections.reportsTools',   icon: 'chart-bar',   routes: ['/reports', '/analytics-hub', '/ai-suite', '/workflow-hub', '/activity-feed', '/executive-command', '/autonomous-monitor', '/framework-scorecard', '/control-posture', '/maturity-journey', '/compliance-savings', '/scoring-policies', '/workspace-lifecycle'] },
    { labelKey: 'sidebarSections.admin',          icon: 'cog',         routes: [...ADMIN_ROUTES] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/foundation/teams', '/automation-hub', '/knowledge-hub', '/advanced-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  compliance_manager: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/my-tasks', '/approval-center'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.coreWork',      icon: 'shield',      routes: [...EVIDENCE_ROUTES, '/framework-hub', ...TRAINING_ROUTES] },
    { labelKey: 'sidebarSections.assessAudit',    icon: 'check-square',routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/maturity', '/audit', '/audit/universe', '/audit/schedules', '/audit/qa-reviews', '/intelligence-hub'] },
    { labelKey: 'sidebarSections.reportsTools',   icon: 'chart-bar',   routes: ['/reports', '/analytics-hub', '/ai-suite', '/ninety-day-plan', '/activity-feed', '/agrc-os'] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/knowledge-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  compliance_officer: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/my-tasks', '/approval-center'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.coreWork',      icon: 'shield',      routes: [...EVIDENCE_ROUTES, '/framework-hub', ...TRAINING_ROUTES] },
    { labelKey: 'sidebarSections.assessAudit',    icon: 'check-square',routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/maturity', '/audit', '/audit/universe', '/audit/schedules', '/audit/qa-reviews', '/intelligence-hub'] },
    { labelKey: 'sidebarSections.reportsTools',   icon: 'chart-bar',   routes: ['/reports', '/analytics-hub', '/ai-suite', '/ninety-day-plan', '/activity-feed', '/agrc-os'] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/knowledge-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  risk_manager: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/my-tasks'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.riskManagement', icon: 'exclamation-triangle', routes: ['/risk-hub', '/risk-workspace', ...VENDOR_ROUTES, ...INCIDENT_ROUTES] },
    { labelKey: 'sidebarSections.intelligence',   icon: 'chart-line',  routes: ['/agrc-os', '/analytics-hub', '/ai-suite', '/intelligence-hub', '/ninety-day-plan'] },
    { labelKey: 'sidebarSections.operations',     icon: 'bolt',        routes: ['/operations-hub', '/privacy-hub', '/cadence-calendar', ...TRAINING_ROUTES, '/ethics-integrity'] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/knowledge-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  auditor: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/my-tasks'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',      routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.auditWork',      icon: 'search',      routes: [...AUDIT_SUB_ROUTES, '/akb', ...EVIDENCE_ROUTES, ...TRAINING_ROUTES] },
    { labelKey: 'sidebarSections.assessment',     icon: 'clipboard',   routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/intelligence-hub', '/assets'] },
    { labelKey: 'sidebarSections.reports',        icon: 'file-pdf',    routes: ['/reports', '/analytics-hub', '/ai-suite', '/agrc-os'] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/knowledge-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  tenant_admin: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/agrc-os', '/ninety-day-plan', '/my-tasks', '/operations-hub', '/activity-stream'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.governanceRisk',  icon: 'shield',     routes: ['/risk-hub', '/risk-workspace', '/framework-hub', ...VENDOR_ROUTES] },
    { labelKey: 'sidebarSections.operations',     icon: 'bolt',        routes: [...INCIDENT_ROUTES, ...EVIDENCE_ROUTES, '/cadence-calendar', '/privacy-hub', ...TRAINING_ROUTES, '/ethics-integrity'] },
    { labelKey: 'sidebarSections.assessAudit',    icon: 'check-square',routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/maturity', ...AUDIT_SUB_ROUTES, '/akb', '/intelligence-hub', '/assets'] },
    { labelKey: 'sidebarSections.reportsTools',   icon: 'chart-bar',   routes: ['/reports', '/analytics-hub', '/ai-suite', '/workflow-hub', '/activity-feed', '/executive-command', '/autonomous-monitor', '/framework-scorecard', '/control-posture', '/maturity-journey', '/compliance-savings', '/scoring-policies', '/workspace-lifecycle'] },
    { labelKey: 'sidebarSections.admin',          icon: 'cog',         routes: [...ADMIN_ROUTES] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/foundation/teams', '/automation-hub', '/knowledge-hub', '/advanced-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  admin: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/agrc-os', '/ninety-day-plan', '/my-tasks', '/operations-hub', '/activity-stream'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.governanceRisk',  icon: 'shield',     routes: ['/risk-hub', '/risk-workspace', '/framework-hub', ...VENDOR_ROUTES] },
    { labelKey: 'sidebarSections.operations',     icon: 'bolt',        routes: [...INCIDENT_ROUTES, ...EVIDENCE_ROUTES, '/cadence-calendar', '/privacy-hub', ...TRAINING_ROUTES, '/ethics-integrity'] },
    { labelKey: 'sidebarSections.assessAudit',    icon: 'check-square',routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/maturity', ...AUDIT_SUB_ROUTES, '/akb', '/intelligence-hub', '/assets'] },
    { labelKey: 'sidebarSections.reportsTools',   icon: 'chart-bar',   routes: ['/reports', '/analytics-hub', '/ai-suite', '/workflow-hub', '/activity-feed', '/executive-command', '/autonomous-monitor', '/framework-scorecard', '/control-posture', '/maturity-journey', '/compliance-savings', '/scoring-policies', '/workspace-lifecycle'] },
    { labelKey: 'sidebarSections.admin',          icon: 'cog',         routes: [...ADMIN_ROUTES] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/foundation/teams', '/automation-hub', '/knowledge-hub', '/advanced-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  owner: [
    { labelKey: 'sidebarSections.work',           icon: 'home',        routes: ['/workspace-home', '/agrc-os', '/ninety-day-plan', '/my-tasks', '/operations-hub', '/activity-stream'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',      icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.governanceRisk',  icon: 'shield',     routes: ['/risk-hub', '/risk-workspace', '/framework-hub', ...VENDOR_ROUTES] },
    { labelKey: 'sidebarSections.operations',     icon: 'bolt',        routes: [...INCIDENT_ROUTES, ...EVIDENCE_ROUTES, '/cadence-calendar', '/privacy-hub', ...TRAINING_ROUTES, '/ethics-integrity'] },
    { labelKey: 'sidebarSections.assessAudit',    icon: 'check-square',routes: ['/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', '/maturity', ...AUDIT_SUB_ROUTES, '/akb', '/intelligence-hub', '/assets'] },
    { labelKey: 'sidebarSections.reportsTools',   icon: 'chart-bar',   routes: ['/reports', '/analytics-hub', '/ai-suite', '/workflow-hub', '/activity-feed', '/executive-command', '/autonomous-monitor', '/framework-scorecard', '/control-posture', '/maturity-journey', '/compliance-savings', '/scoring-policies', '/workspace-lifecycle'] },
    { labelKey: 'sidebarSections.admin',          icon: 'cog',         routes: [...ADMIN_ROUTES] },
    { labelKey: 'sidebarSections.personal',       icon: 'user',        routes: [...PERSONAL_ROUTES, '/foundation/teams', '/automation-hub', '/knowledge-hub', '/advanced-hub', '/playbook'] },
    { labelKey: 'sidebarSections.qiyas',          icon: 'chart-bar',   routes: [...QIYAS_ROUTES] },
  ],
  viewer: [
    { labelKey: 'sidebarSections.readOnlyAccess', icon: 'eye', routes: ['/workspace-home', '/analytics-hub', '/reports', '/knowledge-hub', '/activity-feed', '/intelligence-hub', ...TRAINING_ROUTES, '/ai-suite'] },
    { labelKey: 'sidebarSections.personal',       icon: 'user', routes: [...PERSONAL_ROUTES] },
    { labelKey: 'sidebarSections.qiyas',         icon: 'chart-bar', routes: [...QIYAS_ROUTES] },
  ],
  ceo: [
    { labelKey: 'sidebarSections.executiveOverview', icon: 'chart-bar', routes: ['/workspace-home', '/agrc-os', '/analytics-hub', '/reports', '/executive-command', '/autonomous-monitor', '/ai-suite'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',          icon: 'shield',    routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.governanceRisk',    icon: 'shield',    routes: ['/risk-hub', '/risk-workspace', '/intelligence-hub'] },
    { labelKey: 'sidebarSections.operations',        icon: 'bolt',      routes: ['/operations-hub', '/audit', '/ninety-day-plan', ...TRAINING_ROUTES, ...INCIDENT_ROUTES] },
    { labelKey: 'sidebarSections.personal',          icon: 'user',      routes: [...PERSONAL_ROUTES] },
    { labelKey: 'sidebarSections.qiyas',             icon: 'chart-bar', routes: [...QIYAS_ROUTES] },
  ],
  ciso: [
    { labelKey: 'sidebarSections.securityPosture',   icon: 'shield',              routes: ['/workspace-home', '/risk-hub', '/risk-workspace', ...INCIDENT_ROUTES] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',        icon: 'shield',              routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.frameworksAudit',   icon: 'check-square',        routes: ['/framework-hub', ...EVIDENCE_ROUTES, ...AUDIT_SUB_ROUTES, '/nca-assessment', '/sama-assessment', '/scoring-policy', '/regulatory-delta', ...TRAINING_ROUTES] },
    { labelKey: 'sidebarSections.intelligenceAi',    icon: 'microchip-ai',        routes: ['/intelligence-hub', '/analytics-hub', '/ai-suite', '/reports', '/agrc-os'] },
    { labelKey: 'sidebarSections.personal',          icon: 'user',               routes: [...PERSONAL_ROUTES] },
    { labelKey: 'sidebarSections.qiyas',             icon: 'chart-bar',           routes: [...QIYAS_ROUTES] },
  ],
  cto: [
    { labelKey: 'sidebarSections.techGovernance',    icon: 'cog',        routes: ['/workspace-home', '/connector-hub', '/automation-hub', ...TRAINING_ROUTES] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',          icon: 'shield',     routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.riskCompliance',    icon: 'shield',     routes: ['/risk-hub', ...VENDOR_ROUTES] },
    { labelKey: 'sidebarSections.analyticsAi',       icon: 'chart-line', routes: ['/analytics-hub', '/ai-suite', '/advanced-hub', '/reports', '/agrc-os'] },
    { labelKey: 'sidebarSections.personal',          icon: 'user',       routes: [...PERSONAL_ROUTES] },
    { labelKey: 'sidebarSections.qiyas',             icon: 'chart-bar',  routes: [...QIYAS_ROUTES] },
  ],
  cfo: [
    { labelKey: 'sidebarSections.financialOversight', icon: 'chart-bar', routes: ['/workspace-home', '/analytics-hub', '/reports', '/ai-suite', '/ninety-day-plan'] },
    { labelKey: 'sidebarSections.foundation',     icon: 'building',    routes: [...FOUNDATION_ROUTES] },
    { labelKey: 'sidebarSections.governance',      icon: 'shield',     routes: [...GOVERNANCE_ROUTES, ...POLICY_ROUTES_NAV] },
    { labelKey: 'sidebarSections.compliance',         icon: 'shield',    routes: [...COMPLIANCE_ROUTES] },
    { labelKey: 'sidebarSections.riskCompliance',     icon: 'shield',    routes: ['/risk-hub', ...VENDOR_ROUTES, '/audit'] },
    { labelKey: 'sidebarSections.operationsIntel',    icon: 'bolt',      routes: ['/operations-hub', '/intelligence-hub', ...TRAINING_ROUTES] },
    { labelKey: 'sidebarSections.personal',           icon: 'user',      routes: [...PERSONAL_ROUTES] },
    { labelKey: 'sidebarSections.qiyas',              icon: 'chart-bar', routes: [...QIYAS_ROUTES] },
  ],
};

export function buildRoleSections(
  role: string,
  expandedMap: Record<string, boolean>,
  activeModule: 'agrc' | 'qiyas' = 'agrc',
  checker?: (perm: string) => boolean,
  routeAllowed?: (route: string) => boolean
): NavSection[] {
  const check = checker || ((p: string) => hasPermission(role, p));
  const configs = ROLE_NAV_ROUTE_CONFIGS[role] || ROLE_NAV_ROUTE_CONFIGS['viewer'];
  return configs
    .map((cfg, i) => ({
      label: cfg.labelKey,
      icon: cfg.icon,
      expanded: expandedMap[cfg.labelKey] !== undefined ? expandedMap[cfg.labelKey] : (i === 0),
      items: cfg.routes
        .map(route => ALL_NAV_ITEMS.find(n => n.route === route))
        .filter((n): n is NavItem => n !== undefined)
        .filter(n => check(n.requiredPermission))
        .filter(n => !routeAllowed || routeAllowed(n.route)),
    }));
}

export const SECTION_LABELS: Record<string, string> = {
  main: 'sidebar.main',
  grc: 'sidebar.grc',
  operations: 'sidebar.operations',
  intelligence: 'sidebar.intelligence',
  advanced: 'sidebar.advanced',
  account: 'sidebar.account',
};

/** Lifecycle phase labels used when grouping by phase. */
export const PHASE_LABELS: Record<string, string> = {
  plan: 'lifecycle.plan',
  assess: 'lifecycle.assess',
  design: 'lifecycle.design',
  implement: 'lifecycle.implement',
  operate: 'lifecycle.operate',
  assure: 'lifecycle.assure',
  improve: 'lifecycle.improve',
  account: 'sidebar.account',
};

/**
 * Filter nav items by lifecycle phase. When activePhase is set, return only
 * items mapped to that phase (plus account items). When null, return all items.
 */
export function getPhaseFilteredNavItems(items: NavItem[], activePhase: string | null): NavItem[] {
  if (!activePhase) return items;
  return items.filter(item => item.lifecyclePhase === activePhase || item.lifecyclePhase === 'account');
}

export interface ModuleSubGroup {
  moduleGroup: string | null;
  labelKey: string | null;
  icon: string | null;
  items: NavItem[];
}

function buildModuleSubGroups(items: NavItem[]): ModuleSubGroup[] {
  const result: ModuleSubGroup[] = [];
  let currentGroup: string | null | undefined = undefined;
  for (const item of items) {
    const mg = item.moduleGroup || null;
    if (mg !== currentGroup) {
      currentGroup = mg;
      const labelKey = mg ? `sidebar.${mg}` : null;
      const icon = mg && items.find(i => i.moduleGroup === mg)?.icon || null;
      result.push({ moduleGroup: mg, labelKey, icon, items: [item] });
    } else {
      result[result.length - 1].items.push(item);
    }
  }
  return result;
}

/**
 * Group nav items by their lifecyclePhase, preserving order.
 * Each phase group also contains module sub-groups for lifecycle-mode rendering.
 */
export function groupByPhase(items: NavItem[]): { phase: string; items: NavItem[]; moduleSubGroups: ModuleSubGroup[] }[] {
  const groups: { phase: string; items: NavItem[]; moduleSubGroups: ModuleSubGroup[] }[] = [];
  let currentPhase: string | null = null;
  for (const item of items) {
    if (item.lifecyclePhase !== currentPhase) {
      currentPhase = item.lifecyclePhase;
      groups.push({ phase: currentPhase, items: [item], moduleSubGroups: [] });
    } else {
      groups[groups.length - 1].items.push(item);
    }
  }
  for (const g of groups) {
    g.moduleSubGroups = buildModuleSubGroups(g.items);
  }
  return groups;
}
