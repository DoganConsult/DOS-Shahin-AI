/**
 * AGRC Route Manifest — some imports reference route modules that are not yet
 * created (modules/platform/routes/…). Each missing import is marked with
 * @ts-expect-error so TypeScript reports these as tracked errors (not silently
 * suppressed). Fix each by creating the route module at the indicated path.
 */
/**
 * AGRC Product Route Manifest
 *
 * All GRC product routes consolidated into one product-owned manifest.
 * Platform routes (auth, onboarding, provisioning) are NOT included —
 * they are mounted explicitly in server.ts.
 *
 * Extracted from server.ts during Phase 1 (dynamic route registration).
 */
import type { MountableRoute } from '../../../platform/routing/route-registrar';

// ── Route handler imports ──────────────────────────────────

// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import packManagementRoutes from '@dos/platform-core/provisioning/routes/pack-management.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import inferenceRoutes from '@dos/module-sdk/platform/routes/ai/inference.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import trialExtensionRoutes from '@dos/module-sdk/platform/routes/products/trial-extension.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import dashboardRoutes from '@dos/module-sdk/dashboard/routes/dashboard.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import auditTrailRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-trail.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import registryRoutes from '@dos/module-sdk/platform/routes/user-org/registry.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import governanceRoutes from '@dos/module-sdk/governance/routes/governance/core/governance.routes';
import riskRoutes from '@dos/module-sdk/risk/routes/risk.routes';
import complianceRoutes from '@dos/module-sdk/compliance/routes/compliance/compliance.routes';
import complianceWorkspaceRoutes from '@dos/module-sdk/compliance/routes/compliance/compliance-workspace.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import auditRoutes from '@dos/module-sdk/audit/routes/audit/core/audit.routes';
import incidentRoutes from '@dos/module-sdk/incident/routes/incidents.routes';
import vendorRoutes from '@dos/module-sdk/vendor/routes/vendors.routes';
import bcpRoutes from '@dos/module-sdk/bcp/routes/bcp.routes';
import aiRoutes from '@dos/module-sdk/ai/routes/core/ai.routes';
import evidenceRoutes from '@dos/module-sdk/evidence/routes/core/evidence.routes';
import policyCodeRoutes from '@dos/module-sdk/policy/routes/policy-code.routes';
import profilesRoutes from '@dos/platform-core/http/routes/profiles.routes';
import workflowRoutes from '@dos/module-sdk/workflow/routes/misc/workflows.routes';
import digitalTwinRoutes from '@dos/module-sdk/ai-governance/routes/misc/digital-twin.routes';
import redTeamRoutes from '@dos/module-sdk/ai-governance/routes/misc/red-team.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import autonomyRoutes from '@dos/module-sdk/platform/routes/ai/autonomy.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import privacyBudgetRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/privacy-budget.routes';
import contractTestRoutes from '@dos/platform-core/http/health/contract-tests.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import regulationCompilerRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/regulation-compiler.routes';
import explainabilityRoutes from '@dos/module-sdk/ai/routes/explainability.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import assessmentRoutes from '@dos/module-sdk/platform/routes/assessment/assessment.routes';
import reportRoutes from '@dos/module-sdk/reporting/routes/report/report.routes';
import notificationRoutes from '@dos/module-sdk/notification/routes/notification.routes';
import analyticsRoutes from '@dos/module-sdk/analytics/routes/analytics.routes';
import copilotRoutes from '@dos/module-sdk/ai/routes/copilot/copilot.routes';
import integrationsRoutes from '@dos/module-sdk/integrations/routes/integrations.routes';
import adminRoutes from '@dos/module-sdk/admin/routes/admin.routes';
import platformConfigRoutes from '@dos/module-sdk/admin/routes/platform-config.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import modulesReportRoutes from '@dos/module-sdk/platform/routes/admin/modules-report.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import platformContentPacksRoutes from '@dos/module-sdk/platform/routes/content/platform-content-packs.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import jobsRoutes from '@dos/platform-core/http/health/jobs.routes';
import remediationRoutes from '@dos/module-sdk/remediation/routes/remediation.routes';
import scoringRoutes from '@dos/module-sdk/risk/routes/scoring.routes';
import riskMetricsRoutes from '@dos/module-sdk/risk/routes/risk-metrics.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import contentRoutes from '@dos/module-sdk/platform/routes/content/content.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import contentPackRoutes from '@dos/module-sdk/platform/routes/content/content-pack.routes';
import ucfRoutes from '@dos/module-sdk/compliance/routes/misc/frameworks/ucf.routes';
import controlLifecycleRoutes from '@dos/module-sdk/compliance/routes/control-lifecycle.routes';
import evidenceCatalogRoutes from '@dos/module-sdk/evidence/routes/core/evidence-catalog.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import { mappingRouter, objectsRouter } from '@dos/module-sdk/platform/routes/integration/mapping.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import { exceptionRoutes, findingRoutes, assetRoutes } from '@dos/module-sdk/platform/routes/integration/common-objects.routes';
import ncaAssessmentRoutes from '@dos/module-sdk/compliance/routes/misc/assessment/nca-assessment.routes';
import samaAssessmentRoutes from '@dos/module-sdk/compliance/routes/misc/assessment/sama-assessment.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import saudiRegulatoryScoreRoutes from '@dos/module-sdk/compliance/routes/misc/scoring/saudi-regulatory-score.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import ksaHubRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/ksa-hub.routes';
import maturityRoutes from '@dos/module-sdk/governance/routes/misc/maturity.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import automationRoutes from '@dos/module-sdk/platform/routes/admin/automation.routes';
import connectorRoutes from '@dos/module-sdk/integrations/routes/connector.routes';
import exceptionGovRoutes from '@dos/module-sdk/exception/routes/exception.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import cadenceRoutes from '@dos/module-sdk/platform/routes/reporting/cadence.routes';
import workflowExtRoutes from '@dos/module-sdk/workflow/routes/workflow/workflow-ext.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import assessmentTemplateRoutes from '@dos/module-sdk/platform/routes/assessment/assessment-template.routes';
import riskScoringRoutes from '@dos/module-sdk/risk/routes/risk-scoring.routes';
import reportExtRoutes from '@dos/module-sdk/reporting/routes/report/report-ext.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import tenantConfigRoutes from '@dos/platform-core/tenancy/routes/tenant-config.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import tenantEmailConfigRoutes from '@dos/platform-core/tenancy/routes/tenant-email-config.routes';
import privacyRoutes from '@dos/module-sdk/privacy/routes/privacy.routes';
import vendorRiskExtRoutes from '@dos/module-sdk/vendor/routes/vendor-risk-ext.routes';
import tierRoutes from '@dos/module-sdk/admin/routes/tier.routes';
import entitlementsRoutes from '@dos/module-sdk/admin/routes/entitlements.routes';
import bootstrapRoutes from '@dos/module-sdk/bootstrap/routes/bootstrap.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import commentRoutes from '@dos/module-sdk/platform/routes/activity/comment.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import activityFeedRoutes from '@dos/module-sdk/platform/routes/activity/activity-feed.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import entityLinkRoutes from '@dos/module-sdk/platform/routes/integration/entity-link.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import globalSearchRoutes from '@dos/platform-core/http/search/global-search.routes';
import roleProfileRoutes from '@dos/dauth-shared/routes/role-profile.routes';
import roleMatrixRoutes from '@dos/dauth-shared/routes/role-matrix.routes';
import roleDetailRoutes from '@dos/dauth-shared/routes/role-detail.routes';
import workflowTemplateRoutes from '@dos/module-sdk/workflow/routes/workflow/workflow-templates.routes';
import reportGeneratorRoutes from '@dos/module-sdk/reporting/routes/report/report-generator.routes';
import controlsRoutes from '@dos/module-sdk/compliance/routes/misc/controls/controls.routes';
import policiesRoutes from '@dos/module-sdk/policy/routes/policies.routes';
import policyLifecycleRoutes from '@dos/module-sdk/policy/routes/policy-lifecycle.routes';
import policyTemplateRoutes from '@dos/module-sdk/policy/routes/policy-template.routes';
import connectorHealthRoutes from '@dos/module-sdk/integrations/routes/connector-health.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import referenceDataRoutes from '@dos/module-sdk/platform/routes/content/reference-data.routes';
import workspaceHomeRoutes from '@dos/platform-core/tenancy/routes/workspace-home.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import tenantHomeRoutes from '@dos/platform-core/tenancy/routes/tenant-home.routes';
import kpiDetailRoutes from '@dos/module-sdk/analytics/routes/kpi-detail.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import dpiaRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/dpia.routes';
import shellConfigRoutes from '@dos/module-sdk/dashboard/routes/shell-config.routes';
import findingsStandaloneRoutes from '@dos/module-sdk/remediation/routes/findings.routes';
import frameworkMappingRoutes from '@dos/module-sdk/compliance/routes/misc/frameworks/framework-mapping.routes';
import regulatorHeatmapRoutes from '@dos/module-sdk/compliance/routes/regulator/regulator-heatmap.routes';
import reportCenterRoutes from '@dos/module-sdk/reporting/routes/report/report-center.routes';
import assetsStandaloneRoutes from '@dos/module-sdk/asset/routes/assets.routes';
import notificationCenterRoutes from '@dos/module-sdk/notification/routes/notification-center.routes';
import scoringPoliciesStandaloneRoutes from '@dos/module-sdk/compliance/routes/misc/scoring/scoring-policies.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import activityStreamRoutes from '@dos/module-sdk/platform/routes/activity/activity-stream.routes';
import taskBoardRoutes from '@dos/module-sdk/workflow/routes/misc/task-board.routes';
import processTasksRoutes from '@dos/module-sdk/workflow/routes/misc/process-tasks.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import messagingRoutes from '@dos/module-sdk/platform/routes/user-org/messaging.routes';
import actionItemRoutes from '@dos/module-sdk/action/routes/action-item.routes';
import trainingDataRoutes from '@dos/module-sdk/training/routes/training-data.routes';
import reportScenarioRoutes from '@dos/module-sdk/reporting/routes/report/report-scenario.routes';
import aiTriggerRoutes from '@dos/module-sdk/ai/routes/triggers/ai-trigger.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import widgetRoutes from '@dos/module-sdk/platform/routes/dashboard-ui/widgets.routes';
import controlProcessCycleRoutes from '@dos/module-sdk/compliance/routes/misc/controls/control-process-cycle.routes';
// ── Controls Module (standalone) ──
import controlHomeRoutes from '@dos/module-sdk/controls/routes/control-home.routes';
import controlDetailRoutes from '@dos/module-sdk/controls/routes/control-detail.routes';
import controlWorkQueueRoutes from '@dos/module-sdk/controls/routes/control-work-queue.routes';
import controlMappingRoutes from '@dos/module-sdk/controls/routes/control-mapping.routes';
import controlCertificationRoutes from '@dos/module-sdk/controls/routes/control-certification.routes';
import controlDeficiencyRoutes from '@dos/module-sdk/controls/routes/control-deficiency.routes';
import controlMonitoringAdminRoutes from '@dos/module-sdk/controls/routes/control-monitoring-admin.routes';
import controlReportsRoutes from '@dos/module-sdk/controls/routes/control-reports.routes';
import controlAdminRoutes from '@dos/module-sdk/controls/routes/control-admin.routes';
import controlWorkflowRoutes from '@dos/module-sdk/controls/routes/control-workflow.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import playbookRoutes from '@dos/module-sdk/platform/routes/content/playbook.routes';
import aiSquadRoutes from '@dos/module-sdk/ai/routes/squad/ai-squad.routes';
import autonomousWorkflowRoutes from '@dos/module-sdk/workflow/routes/misc/autonomous-workflow.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import commandPaletteRoutes from '@dos/module-sdk/platform/routes/dashboard-ui/command-palette.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import contextualAIRoutes from '@dos/module-sdk/platform/routes/ai/contextual-ai.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import inlineEditRoutes from '@dos/module-sdk/platform/routes/dashboard-ui/inline-edit.routes';
import journeyRoutes from '@dos/module-sdk/journey/routes/misc/journey.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import guidanceRoutes from '@dos/module-sdk/platform/routes/content/guidance.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import knowledgeRoutes from '@dos/module-sdk/platform/routes/content/knowledge.routes';
import knowledgeHubRoutes from '@dos/module-sdk/compliance/routes/misc/regulatory/knowledge-hub.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import roadmapExtRoutes from '@dos/module-sdk/platform/routes/products/roadmap.routes';
import maturityExtRoutes from '@dos/module-sdk/governance/routes/misc/maturity-ext.routes';
import reportHubRoutes from '@dos/module-sdk/reporting/routes/report/report-hub.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import autoCrudRoutes from '@dos/module-sdk/platform/routes/integration/auto-crud.routes';
import agrcOsRoutes from '@dos/module-sdk/agrc-engine/routes/agrc-os/platform/index.routes';
import aiEnhancedRoutes from '@dos/module-sdk/ai/routes/enhanced/ai-enhanced.routes';
import eventDlqRoutes from '@dos/platform-core/http/health/event-dlq.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import uiRoutes from '@dos/module-sdk/platform/routes/dashboard-ui/ui.routes';
import chartDataRoutes from '@dos/module-sdk/analytics/routes/chart-data.routes';
import regulatoryContentRoutes from '@dos/module-sdk/compliance/routes/misc/regulatory/regulatory-content.routes';
import riskQuantificationRoutes from '@dos/module-sdk/risk/routes/risk-quantification.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import rcsaRoutes from '@dos/module-sdk/compliance/routes/misc/assessment/rcsa.routes';
import policyAttestationRoutes from '@dos/module-sdk/policy/routes/policy-attestation.routes';
import policyOverviewRoutes from '@dos/module-sdk/policy/routes/policy-overview.routes';
import policyExceptionRoutes from '@dos/module-sdk/policy/routes/policy-exception.routes';
import policyPublicationRoutes from '@dos/module-sdk/policy/routes/policy-publication.routes';
import policyCoverageRoutes from '@dos/module-sdk/policy/routes/policy-coverage.routes';
import policyReportsRoutes from '@dos/module-sdk/policy/routes/policy-reports.routes';
import ccmCloudRoutes from '@dos/module-sdk/compliance/routes/misc/controls/ccm-cloud.routes';
import boardReportsRoutes from '@dos/module-sdk/reporting/routes/misc/board-reports.routes';
import csaRoutes from '@dos/module-sdk/compliance/routes/misc/controls/csa.routes';
import webhookOutboundRoutes from '@dos/module-sdk/integrations/routes/webhook-outbound.routes';
import webhooksManageRoutes from '@dos/module-sdk/integrations/routes/webhooks-manage.routes';
import predictiveAnalyticsRoutes from '@dos/module-sdk/analytics/routes/predictive-analytics.routes';
import engagementAnalyticsRoutes from '@dos/module-sdk/analytics/routes/engagement-analytics.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import autoTaskRoutes from '@dos/platform-core/http/health/auto-task.routes';
import approvalRoutingRoutes from '@dos/module-sdk/workflow/routes/misc/approval-routing.routes';
import approvalRequestsRoutes from '@dos/module-sdk/workflow/routes/misc/approval-requests.routes';
import governanceOsRoutes from '@dos/module-sdk/governance/routes/governance/intelligence/governance-os.routes';
import governanceMandatesRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-mandates.routes';
import governanceReviewsRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-reviews.routes';
import governanceAcksRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-acknowledgements.routes';
import governanceObjectivesRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-objectives.routes';
import governanceRegistersRoutes from '@dos/module-sdk/governance/routes/governance/structure/governance-registers.routes';
import governanceDelegationsRoutes from '@dos/module-sdk/governance/routes/governance/structure/governance-delegations.routes';
import governanceResponsibilitiesRoutes from '@dos/module-sdk/governance/routes/governance/structure/governance-responsibilities.routes';
import governanceRaciTemplatesRoutes from '@dos/module-sdk/governance/routes/governance/structure/governance-raci-templates.routes';
import governanceObligationsRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-obligations.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import governanceChartersRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-charters.routes';
import governanceHealthRoutes from '@dos/module-sdk/governance/routes/governance/core/governance-health.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import governanceStructureRoutes from '@dos/module-sdk/governance/routes/governance/structure/governance-structure.routes';
import ethicsGovernanceRoutes from '@dos/module-sdk/governance/routes/misc/ethics-governance.routes';
import governanceWorkloadRoutes from '@dos/module-sdk/governance/routes/governance/operations/governance-workload.routes';
import governanceAiRoutes from '@dos/module-sdk/governance/routes/governance/intelligence/governance-ai.routes';
import governanceExecutiveSummariesRoutes from '@dos/module-sdk/governance/routes/governance/intelligence/governance-executive-summaries.routes';
import governanceHooksRoutes from '@dos/module-sdk/governance/routes/governance/core/governance-hooks.routes';
import governanceRaciRoutes from '@dos/module-sdk/governance/routes/governance/structure/governance-raci.routes';
import governanceEnforcementRoutes from '@dos/module-sdk/governance/routes/governance/core/governance-enforcement.routes';
import governanceBoardPacksRoutes from '@dos/module-sdk/governance/routes/governance/intelligence/governance-board-packs.routes';
import aiAssetInventoryRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-asset-inventory.routes';
import modelRegistryRoutes from '@dos/module-sdk/ai-governance/routes/misc/model-registry.routes';
import promptRegistryRoutes from '@dos/module-sdk/ai-governance/routes/misc/prompt-registry.routes';
import agentRegistryRoutes from '@dos/module-sdk/ai/routes/agents/agent-registry.routes';
import aiBindingGovernanceRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-binding-governance.routes';
// import aiGovernanceConfigRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-governance-config.routes';
// import aiGovernanceOpsRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-governance-ops.routes';
// import aiGovernanceWave1Routes from '@dos/module-sdk/ai-governance/routes/ai/ai-governance-wave1.routes';
// import aiGovernanceWave2Routes from '@dos/module-sdk/ai-governance/routes/ai/ai-governance-wave2.routes';
import aiGovernanceRoutes from '@dos/module-sdk/ai-governance/ai-governance.controller';
import regulatorRegistryRoutes from '@dos/module-sdk/compliance/routes/regulator/regulator-registry.routes';
import consentLifecycleRoutes from '@dos/platform-core/lifecycle/routes/consent-lifecycle.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import documentManagementRoutes from '@dos/module-sdk/platform/routes/content/document-management.routes';
import frameworksRoutes from '@dos/module-sdk/compliance/routes/misc/frameworks/frameworks.routes';
import unifiedSquadRoutes from '@dos/module-sdk/ai/routes/squad/unified-squad.routes';
import cooperativeWorkflowsRoutes from '@dos/module-sdk/workflow/routes/misc/cooperative-workflows.routes';
import workflowChainRoutes from '@dos/module-sdk/workflow/routes/workflow/workflow-chain.routes';
import workflowAdvancedRoutes from '@dos/module-sdk/workflow/routes/workflow/workflow-advanced.routes';
import workflowLookupsRoutes from '@dos/module-sdk/workflow/routes/workflow/workflow-lookups.routes';
import workflowProfileRoutes from '@dos/module-sdk/workflow/routes/workflow-profile.routes';
import moduleWorkflowRoutes from '@dos/module-sdk/workflow/routes/misc/module-workflow.routes';
import bulkTasksRoutes from '@dos/module-sdk/workflow/routes/misc/bulk-tasks.routes';
import workflowImportExportRoutes from '@dos/module-sdk/workflow/routes/workflow/workflow-import-export.routes';
import agentDelegationRoutes from '@dos/module-sdk/ai/routes/agents/agent-delegation.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import bulkActionRoutes from '@dos/module-sdk/platform/routes/user-org/bulk-action.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import quickGrcAcceleratorRoutes from '@dos/module-sdk/platform/routes/products/quick-grc-accelerator.routes';
import auditPackageRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-package.routes';
import auditPackagesRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-packages.routes';
import auditUniverseRoutes from '@dos/module-sdk/audit/routes/audit/core/audit-universe.routes';
import auditRiskScoringRoutes from '@dos/module-sdk/audit/routes/audit/findings/audit-risk-scoring.routes';
import auditSchedulesRoutes from '@dos/module-sdk/audit/routes/audit/core/audit-schedules.routes';
import auditWorkingPapersRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-working-papers.routes';
import auditTeamRoutes from '@dos/module-sdk/audit/routes/audit/core/audit-team.routes';
import auditRepeatFindingsRoutes from '@dos/module-sdk/audit/routes/audit/findings/audit-repeat-findings.routes';
import auditEvidenceVersionsRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-evidence-versions.routes';
import auditQaReviewsRoutes from '@dos/module-sdk/audit/routes/audit/advanced/audit-qa-reviews.routes';
import auditFindingTrendsRoutes from '@dos/module-sdk/audit/routes/audit/findings/audit-finding-trends.routes';
import auditRatingsRoutes from '@dos/module-sdk/audit/routes/audit/findings/audit-ratings.routes';
import auditCapaEffectivenessRoutes from '@dos/module-sdk/audit/routes/audit/advanced/audit-capa-effectiveness.routes';
import auditCommitteeRoutes from '@dos/module-sdk/audit/routes/audit/advanced/audit-committee.routes';
import auditExternalRoutes from '@dos/module-sdk/audit/routes/audit/advanced/audit-external.routes';
import auditRegulatoryRoutes from '@dos/module-sdk/audit/routes/audit/advanced/audit-regulatory.routes';
import auditTestPlansRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-test-plans.routes';
import auditFindingSlasRoutes from '@dos/module-sdk/audit/routes/audit/findings/audit-finding-slas.routes';
import auditTimeTrackingRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-time-tracking.routes';
import auditRemindersRoutes from '@dos/module-sdk/audit/routes/audit/operations/audit-reminders.routes';
import auditTemplatesRoutes from '@dos/module-sdk/audit/routes/audit/core/audit-templates.routes';
import auditCrossModuleRoutes from '@dos/module-sdk/audit/routes/audit/advanced/audit-cross-module.routes';
import akbRoutes from '@dos/module-sdk/audit/routes/misc/akb.routes';
import vulnerabilitiesRoutes from '@dos/module-sdk/risk/routes/vulnerabilities.routes';
import modelRiskRoutes from '@dos/module-sdk/risk/routes/model-risk.routes';
import riskWorkspaceRoutes from '@dos/module-sdk/risk/routes/risk-workspace.routes';
import riskSmartRoutes from '@dos/module-sdk/risk/routes/risk-smart.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import featureTablesRoutes from '@dos/module-sdk/platform/routes/admin/feature-tables.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import emailInboxRoutes from '@dos/module-sdk/platform/routes/user-org/email-inbox.routes';
import securityConfigRoutes from '@dos/module-sdk/admin/routes/security-config.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import nextActionsRoutes from '@dos/module-sdk/platform/routes/user-org/next-actions.routes';
import notificationPreferencesRoutes from '@dos/module-sdk/notification/routes/notification-preferences.routes';
import fieldRbacRoutes from '@dos/module-sdk/admin/routes/field-rbac.routes';
import grcLifecycleGapsRoutes from '@dos/module-sdk/governance/routes/grc-lifecycle-gaps.routes';
import grcRaciRoutes from '@dos/module-sdk/governance/routes/misc/grc-raci.routes';
import incidentAdvancedRoutes from '@dos/module-sdk/incident/routes/incident-advanced.routes';
import bcmAdvancedRoutes from '@dos/module-sdk/bcp/routes/bcm-advanced.routes';
import vendorAdvancedRoutes from '@dos/module-sdk/vendor/routes/vendor-advanced.routes';
import trainingAdvancedRoutes from '@dos/module-sdk/training/routes/training-advanced.routes';
import trainingAdminRoutes from '@dos/module-sdk/training/routes/training-admin.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import moduleLifecycleRoutes from '@dos/module-sdk/platform/routes/module-lifecycle.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import moduleWorkflowRegistryRoutes from '@dos/module-sdk/platform/routes/admin/module-workflow-registry.routes';
import riskPeerReviewRoutes from '@dos/module-sdk/risk/routes/risk-peer-review.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import pdplConsentRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/pdpl-consent.routes';
import scoreCalibrationRoutes from '@dos/module-sdk/risk/routes/score-calibration.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import sopLibraryRoutes from '@dos/module-sdk/platform/routes/content/sop-library.routes';
import reviewCycleRoutes from '@dos/module-sdk/workflow/routes/misc/review-cycle.routes';
import vendorCyberRatingRoutes from '@dos/module-sdk/vendor/routes/vendor-cyber-rating.routes';
import vendorScoringRoutes from '@dos/module-sdk/vendor/routes/vendor-scoring.routes';
import vendorComplianceSyncRoutes from '@dos/module-sdk/vendor/routes/vendor-compliance-sync.routes';
import riskTrendsRoutes from '@dos/module-sdk/risk/routes/risk-trends.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import roadmapBuilderRoutes from '@dos/module-sdk/platform/routes/products/roadmap-builder.routes';
import scoringPolicyEngineRoutes from '@dos/module-sdk/compliance/routes/misc/scoring/scoring-policy-engine.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import programHealthRoutes from '@dos/module-sdk/platform/routes/reporting/program-health.routes';
import monteCarloRoutes from '@dos/module-sdk/risk/routes/monte-carlo.routes';
import regulatoryDeltaRoutes from '@dos/module-sdk/compliance/routes/misc/regulatory/regulatory-delta.routes';
import ncaExportRoutes from '@dos/module-sdk/compliance/routes/misc/assessment/nca-export.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import bulkImportRoutes from '@dos/module-sdk/platform/routes/user-org/bulk-import.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import modulesRoutes from '@dos/module-sdk/platform/routes/admin/modules.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import processesRoutes from '@dos/platform-core/provisioning/routes/processes.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import productsRoutes from '@dos/module-sdk/platform/routes/products/products.routes';
import evidenceTasksRoutes from '@dos/module-sdk/evidence/routes/workflow/evidence-tasks.routes';
import hitlRoutes from '@dos/module-sdk/ai/routes/hitl/hitl.routes';
import powerbiRoutes from '@dos/module-sdk/integrations/routes/powerbi.routes';
import serviceHealthRoutes from '@dos/platform-core/http/health/service-health.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import slaPerformanceRoutes from '@dos/module-sdk/platform/routes/reporting/sla-performance.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import moduleKickstartRoutes from '@dos/module-sdk/platform/routes/admin/module-kickstart.routes';
import workspaceIgniteRoutes from '@dos/platform-core/tenancy/routes/workspace-ignite.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import moduleOnboardingRoutes from '@dos/module-sdk/platform/routes/admin/module-onboarding.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import mobileRoutes from '@dos/module-sdk/platform/routes/user-org/mobile.routes';
import workItemRoutes from '@dos/module-sdk/workflow/routes/misc/work-items.routes';
import sampleReportsRoutes from '@dos/module-sdk/reporting/routes/sample/sample-reports.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import publicExplorerRoutes from '@dos/module-sdk/platform/routes/products/public-explorer.routes';
import onboardingLookupRoutes from '@dos/module-sdk/onboarding/routes/lookup.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import platformStatsRoutes from '@dos/module-sdk/platform/routes/reporting/platform-stats.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import moduleReadinessRoutes from '@dos/module-sdk/platform/routes/admin/module-readiness.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import moduleCertificationRoutes from '@dos/module-sdk/platform/routes/admin/module-certification.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import inboundEventRoutes from '@dos/module-sdk/platform/routes/integration/inbound-event.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import runtimeHealthRoutes from '@dos/platform-core/http/health/runtime-health.routes';

// Module controllers
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import provisioningPlatformRoutes from '@dos/module-sdk/onboarding/controllers/provisioning.controller';
import provisioningSeedRoutes from '@dos/module-sdk/onboarding/provisioning-seed.controller';
import provisioningExecutorRoutes from '@dos/module-sdk/provisioning/provisioning.controller';
import provisioningStatusRoutes from '@dos/module-sdk/provisioning/provisioning-status.controller';
import provisioningOrchestratorRoutes from '@dos/module-sdk/provisioning/provisioning-orchestrator.controller';
import meBootstrapRoutes from '@dos/module-sdk/bootstrap/bootstrap.controller';
import navigationRoutes from '@dos/module-sdk/navigation/navigation.controller';
import dashboardRegistryRoutes from '@dos/module-sdk/dashboard/dashboard.controller';
import dashboardEditorRoutes from '@dos/module-sdk/dashboard/dashboard-editor.controller';
import widgetDataRoutes from '@dos/module-sdk/widgets/widgets.controller';
import qiyasRoutes from '@dos/module-sdk/qiyas/routes/qiyas.routes';
import packInstallerRoutes from '@dos/module-sdk/packs/pack-installer.controller';
import packPolicyRoutes from '@dos/module-sdk/packs/pack-policy.controller';
import agrcEngineRoutes from '@dos/module-sdk/agrc-engine/agrc-engine.controller';
import executiveWidgetsRoutes from '@dos/module-sdk/widgets/executive-widgets.controller';

// ── Advanced AI Governance & Compliance (Phase 4) ──
import aiAgentGovernanceP4Routes from '@dos/module-sdk/ai-governance/routes/ai/ai-agent-governance-phase4.routes';
import aiPostMarketRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-post-market.routes';
import aiPrivacyGovernanceRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-privacy-governance.routes';
import aiSupplyChainRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-supply-chain.routes';
import aiSystemRegistryRoutes from '@dos/module-sdk/ai-governance/routes/ai/ai-system-registry.routes';
import aiModelExperimentsRoutes from '@dos/module-sdk/ai/routes/admin/ai-model-experiments.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import doraResilienceRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/dora-resilience.routes';
import doraRoutes from '@dos/module-sdk/dora/routes/dora.routes';
// @ts-expect-error: route module not yet created — wire in Phase B/C when service is built
import quantumReadinessRoutes from '@dos/module-sdk/platform/routes/compliance-regulatory/quantum-readiness.routes';
import runtimeOverridesRoutes from '@dos/module-sdk/admin/routes/runtime-overrides.routes';

// ── NL Query Engine ──
import nlQueryRoutes from '@dos/module-sdk/ai/routes/core/nl-query.routes';

// ── Product Route Manifest ─────────────────────────────────

export const AGRC_ROUTE_MANIFEST: MountableRoute[] = [
  // ── Core GRC domains ──
  { path: "/api/module-lifecycle", handler: moduleLifecycleRoutes },
  { path: "/api/module-registry", handler: moduleWorkflowRegistryRoutes },
  { path: "/api/risk-peer-review", handler: riskPeerReviewRoutes },
  { path: "/api/inference", handler: (inferenceRoutes as any) },
  { path: "/api/dashboard", handler: dashboardRoutes },
  { path: "/api/audit-trail", handler: auditTrailRoutes },
  { path: "/api/registry", handler: registryRoutes },

  // ── Governance ──
  { path: "/api/governance", handler: governanceRoutes, module: 'governance' },
  { path: "/api/governance/mandates", handler: governanceMandatesRoutes, module: 'governance' },
  { path: "/api/governance/delegations", handler: governanceDelegationsRoutes, module: 'governance' },
  { path: "/api/governance/obligations", handler: governanceObligationsRoutes, module: 'governance' },
  { path: "/api/governance/charters", handler: governanceChartersRoutes, module: 'governance' },
  { path: "/api/governance/health", handler: governanceHealthRoutes, module: 'governance' },
  { path: "/api/governance/structure", handler: governanceStructureRoutes, module: 'governance' },
  { path: "/api/governance/board-packs", handler: governanceBoardPacksRoutes, module: 'governance' },
  { path: "/api/governance/responsibilities", handler: governanceResponsibilitiesRoutes, module: 'governance' },
  { path: "/api/governance/raci", handler: governanceRaciRoutes, module: 'governance' },
  { path: "/api/governance/enforcement", handler: governanceEnforcementRoutes, module: 'governance' },
  { path: "/api/governance/reviews", handler: governanceReviewsRoutes, module: 'governance' },
  { path: "/api/governance/acknowledgements", handler: governanceAcksRoutes, module: 'governance' },
  { path: "/api/governance/objectives", handler: governanceObjectivesRoutes, module: 'governance' },
  { path: "/api/governance/executive-summaries", handler: governanceExecutiveSummariesRoutes, module: 'governance' },
  { path: "/api/governance/hooks", handler: governanceHooksRoutes, module: 'governance' },
  { path: "/api/governance/policy-reviews", handler: governanceReviewsRoutes, module: 'governance' },
  { path: "/api/governance/policy-acks", handler: governanceAcksRoutes, module: 'governance' },
  { path: "/api/governance/registers", handler: governanceRegistersRoutes, module: 'governance' },
  { path: "/api/governance/raci-templates", handler: governanceRaciTemplatesRoutes, module: 'governance' },
  { path: "/api/governance/ethics", handler: ethicsGovernanceRoutes, module: 'governance' },
  { path: "/api/governance/workload", handler: governanceWorkloadRoutes, module: 'governance' },
  { path: "/api/governance/ai", handler: governanceAiRoutes, module: 'governance' },
  { path: "/api/governance-os", handler: governanceOsRoutes, module: 'governance' },
  { path: "/api/grc-lifecycle", handler: grcLifecycleGapsRoutes, module: 'governance' },
  { path: "/api/grc-raci", handler: grcRaciRoutes, module: 'governance' },

  // ── Risk ──
  { path: "/api/risks", handler: riskRoutes, module: 'risk' },
  { path: "/api/risk-ws", handler: riskWorkspaceRoutes, module: 'risk' },
  { path: "/api/risk-smart", handler: riskSmartRoutes, module: 'risk' },
  { path: "/api/risk-metrics", handler: riskMetricsRoutes, module: 'risk' },
  { path: "/api/risk-scoring", handler: riskScoringRoutes, module: 'risk' },
  { path: "/api/risk-trends", handler: riskTrendsRoutes, module: 'risk' },
  { path: "/api/risk-quantification", handler: riskQuantificationRoutes, module: 'risk' },
  { path: "/api/monte-carlo", handler: monteCarloRoutes, module: 'risk' },

  // ── Compliance ──
  { path: "/api/compliance", handler: complianceRoutes, module: 'compliance' },
  { path: "/api/compliance-ws", handler: complianceWorkspaceRoutes, module: 'compliance' },
  // ── Controls (standalone module) ──
  { path: "/api/controls", handler: controlsRoutes, module: 'controls' },
  { path: "/api/controls/:id/process-cycle", handler: controlProcessCycleRoutes, module: 'controls' },
  { path: "/api/controls/home", handler: controlHomeRoutes, module: 'controls' },
  { path: "/api/controls/:id/detail", handler: controlDetailRoutes, module: 'controls' },
  { path: "/api/controls/work-queue", handler: controlWorkQueueRoutes, module: 'controls' },
  { path: "/api/controls/mapping", handler: controlMappingRoutes, module: 'controls' },
  { path: "/api/controls/certifications", handler: controlCertificationRoutes, module: 'controls' },
  { path: "/api/controls/deficiencies", handler: controlDeficiencyRoutes, module: 'controls' },
  { path: "/api/controls/monitoring", handler: controlMonitoringAdminRoutes, module: 'controls' },
  { path: "/api/controls/reports", handler: controlReportsRoutes, module: 'controls' },
  { path: "/api/controls/admin", handler: controlAdminRoutes, module: 'controls' },
  { path: "/api/controls/workflow", handler: controlWorkflowRoutes, module: 'controls' },
  { path: "/api/lifecycle", handler: controlLifecycleRoutes, module: 'controls' },
  { path: "/api/ucf", handler: ucfRoutes, module: 'compliance' },
  { path: "/api/frameworks", handler: frameworksRoutes, module: 'compliance' },
  { path: "/api/framework-mapping", handler: frameworkMappingRoutes, module: 'compliance' },
  { path: "/api/mappings", handler: mappingRouter, module: 'compliance' },
  { path: "/api/objects", handler: objectsRouter, module: 'compliance' },
  { path: "/api/exceptions", handler: exceptionRoutes, module: 'compliance' },
  { path: "/api/scoring-policies", handler: scoringRoutes, module: 'compliance' },
  { path: "/api/scoring-policies-standalone", handler: scoringPoliciesStandaloneRoutes, module: 'compliance' },
  { path: "/api/scoring-policy-engine", handler: scoringPolicyEngineRoutes, module: 'compliance' },

  // ── Audit ──
  { path: "/api/audit", handler: auditRoutes, module: 'audit' },
  { path: "/api/audit-packages", handler: auditPackagesRoutes, module: 'audit' },
  { path: "/api/audit-package", handler: auditPackageRoutes, module: 'audit' },
  { path: "/api/audit/universe", handler: auditUniverseRoutes, module: 'audit' },
  { path: "/api/audit/risk-scoring", handler: auditRiskScoringRoutes, module: 'audit' },
  { path: "/api/audit/schedules", handler: auditSchedulesRoutes, module: 'audit' },
  { path: "/api/audit/working-papers", handler: auditWorkingPapersRoutes, module: 'audit' },
  { path: "/api/audit/team", handler: auditTeamRoutes, module: 'audit' },
  { path: "/api/audit/repeat-findings", handler: auditRepeatFindingsRoutes, module: 'audit' },
  { path: "/api/audit/evidence-versions", handler: auditEvidenceVersionsRoutes, module: 'audit' },
  { path: "/api/audit/qa-reviews", handler: auditQaReviewsRoutes, module: 'audit' },
  { path: "/api/audit/finding-trends", handler: auditFindingTrendsRoutes, module: 'audit' },
  { path: "/api/audit/ratings", handler: auditRatingsRoutes, module: 'audit' },
  { path: "/api/audit/capa-effectiveness", handler: auditCapaEffectivenessRoutes, module: 'audit' },
  { path: "/api/audit/committee", handler: auditCommitteeRoutes, module: 'audit' },
  { path: "/api/audit/external", handler: auditExternalRoutes, module: 'audit' },
  { path: "/api/audit/regulatory", handler: auditRegulatoryRoutes, module: 'audit' },
  { path: "/api/audit/test-plans", handler: auditTestPlansRoutes, module: 'audit' },
  { path: "/api/audit/finding-slas", handler: auditFindingSlasRoutes, module: 'audit' },
  { path: "/api/audit/time-tracking", handler: auditTimeTrackingRoutes, module: 'audit' },
  { path: "/api/audit/reminders", handler: auditRemindersRoutes, module: 'audit' },
  { path: "/api/audit/templates", handler: auditTemplatesRoutes, module: 'audit' },
  { path: "/api/audit/cross-module", handler: auditCrossModuleRoutes, module: 'audit' },
  { path: "/api/akb", handler: akbRoutes, module: 'audit' },
  { path: "/api/findings", handler: findingRoutes, module: 'audit' },
  { path: "/api/findings-standalone", handler: findingsStandaloneRoutes, module: 'audit' },

  // ── Evidence ──
  { path: "/api/evidence", handler: evidenceRoutes, module: 'evidence' },
  { path: "/api/evidence-catalog", handler: evidenceCatalogRoutes, module: 'evidence' },
  { path: "/api/evidence-tasks", handler: evidenceTasksRoutes, module: 'evidence' },

  // ── Policy & Procedures ──
  { path: "/api/policy-code", handler: policyCodeRoutes, module: 'policy' },
  { path: "/api/policies", handler: policiesRoutes, module: 'policy' },
  { path: "/api/policy-lifecycle", handler: policyLifecycleRoutes, module: 'policy' },
  { path: "/api/policy-templates", handler: policyTemplateRoutes, module: 'policy' },
  { path: "/api/attestation", handler: policyAttestationRoutes, module: 'policy' },
  { path: "/api/policy-overview", handler: policyOverviewRoutes, module: 'policy' },
  { path: "/api/policy-exceptions", handler: policyExceptionRoutes, module: 'policy' },
  { path: "/api/policy-publications", handler: policyPublicationRoutes, module: 'policy' },
  { path: "/api/policy-coverage", handler: policyCoverageRoutes, module: 'policy' },
  { path: "/api/policy-reports", handler: policyReportsRoutes, module: 'policy' },

  // ── Incident & BCP ──
  { path: "/api/incidents", handler: incidentRoutes, module: 'incident' },
  { path: "/api/incidents-advanced", handler: incidentAdvancedRoutes, module: 'incident' },
  { path: "/api/bcp", handler: bcpRoutes, module: 'bcp' },
  { path: "/api/bcm-advanced", handler: bcmAdvancedRoutes, module: 'bcp' },

  // ── Vendor / Third-Party ──
  { path: "/api/vendors", handler: vendorRoutes, module: 'vendor' },
  { path: "/api/vendors-advanced", handler: vendorAdvancedRoutes, module: 'vendor' },
  { path: "/api/vendor-risk", handler: vendorRiskExtRoutes, tier: 'vendor_automation', module: 'vendor' },
  { path: "/api/vendor-cyber-rating", handler: vendorCyberRatingRoutes, module: 'vendor' },
  { path: "/api/vendor-compliance-sync", handler: vendorComplianceSyncRoutes, module: 'vendor' },
  { path: "/api/score-calibration", handler: scoreCalibrationRoutes, module: 'vendor' },
  { path: "/api/vendor-scoring", handler: vendorScoringRoutes, module: 'vendor' },

  // ── AI / Copilot ──
  { path: "/api/ai", handler: aiRoutes },
  { path: "/api/copilot", handler: copilotRoutes },
  { path: "/api/ai-enhanced", handler: aiEnhancedRoutes },
  { path: "/api/ai-triggers", handler: aiTriggerRoutes, module: 'workflow' },
  { path: "/api/ai-squad", handler: aiSquadRoutes },
  { path: "/api/ai-assets", handler: aiAssetInventoryRoutes },
  { path: "/api/model-registry", handler: modelRegistryRoutes },
  { path: "/api/prompt-registry", handler: promptRegistryRoutes },
  { path: "/api/agent-registry", handler: agentRegistryRoutes },
  { path: "/api/ai-bindings", handler: aiBindingGovernanceRoutes },
  { path: "/api/ai-governance", handler: aiGovernanceRoutes, module: 'ai-governance' },
  { path: "/api/ai/nl", handler: nlQueryRoutes },
  { path: "/api/contextual-ai", handler: contextualAIRoutes },

  // ── AGRC-OS Engine ──
  { path: "/api/agrc-os", handler: agrcOsRoutes },
  { path: "/api/agrc-os/events/dlq", handler: eventDlqRoutes },
  { path: "/api/autonomous", handler: autonomousWorkflowRoutes, module: 'workflow' },
  { path: "/api/autonomy", handler: autonomyRoutes },
  { path: "/api/ccm-cloud", handler: ccmCloudRoutes },

  // ── KSA / Regulatory ──
  { path: "/api/nca-assessment", handler: ncaAssessmentRoutes },
  { path: "/api/sama-assessment", handler: samaAssessmentRoutes },
  { path: "/api/compliance", handler: saudiRegulatoryScoreRoutes },
  { path: "/api/ksa", handler: ksaHubRoutes },
  { path: "/api/regulatory-content", handler: regulatoryContentRoutes },
  { path: "/api/regulatory-delta", handler: regulatoryDeltaRoutes },
  { path: "/api/nca/export", handler: ncaExportRoutes },
  { path: "/api/regulation-compiler", handler: regulationCompilerRoutes },
  { path: "/api/pdpl-consent", handler: pdplConsentRoutes, module: 'compliance' },

  // ── Assessments ──
  { path: "/api/assessments", handler: assessmentRoutes },
  { path: "/api/assessment-templates", handler: assessmentTemplateRoutes },
  { path: "/api/maturity", handler: maturityRoutes },
  { path: "/api/maturity-ext", handler: maturityExtRoutes },
  { path: "/api/rcsa", handler: rcsaRoutes },
  { path: "/api/csa", handler: csaRoutes },

  // ── Reporting & Analytics ──
  { path: "/api/reports", handler: reportRoutes },
  { path: "/api/report-ext", handler: reportExtRoutes, tier: 'reports_advanced' },
  { path: "/api/report-hub", handler: reportHubRoutes },
  { path: "/api/report-center", handler: reportCenterRoutes },
  { path: "/api/report-templates", handler: reportGeneratorRoutes },
  { path: "/api/report-scenarios", handler: reportScenarioRoutes },
  { path: "/api/board-reports", handler: boardReportsRoutes },
  { path: "/api/analytics", handler: analyticsRoutes, module: "analytics" },
  { path: "/api/predictive-analytics", handler: predictiveAnalyticsRoutes, module: "analytics" },
  { path: "/api/engagement-analytics", handler: engagementAnalyticsRoutes, module: "analytics" },
  { path: "/api/regulator-heatmap", handler: regulatorHeatmapRoutes },
  { path: "/api/chart-data", handler: chartDataRoutes, module: "analytics" },
  { path: "/api/kpi", handler: kpiDetailRoutes, module: "analytics" },
  { path: "/api/program-health", handler: programHealthRoutes },
  { path: "/api/powerbi", handler: powerbiRoutes },

  // ── Workspace & Admin ──
  { path: "/api/admin", handler: adminRoutes },
  { path: "/api/admin/platform-config", handler: platformConfigRoutes },
  { path: "/api/admin/modules-report", handler: modulesReportRoutes },
  { path: "/api/admin/content-packs", handler: platformContentPacksRoutes },
  { path: "/api/workspace-home", handler: workspaceHomeRoutes },
  { path: "/api/workspace-ignite", handler: workspaceIgniteRoutes },
  { path: "/api/workspace", handler: workspaceIgniteRoutes },  // Compat path
  { path: "/api/tenant-home", handler: tenantHomeRoutes },
  { path: "/api/tenant-config", handler: tenantConfigRoutes },
  { path: "/api/tenant-email-config", handler: tenantEmailConfigRoutes },
  { path: "/api/tenant", handler: entitlementsRoutes },
  { path: "/api/tier", handler: tierRoutes },
  { path: "/api/bootstrap", handler: bootstrapRoutes },
  { path: "/api/security-config", handler: securityConfigRoutes },
  // @death-date Phase 3 | owner: DOS | replacement: platform/dos/foundation/ user routes
  // { path: "/api/users", handler: usersRoutes },
  { path: "/api/jobs", handler: jobsRoutes },

  // ── Foundation / Org — @death-date Phase 3 | owner: DOS | replacement: platform/dos/foundation/ ──
  // { path: "/api/foundation-governance", handler: foundationGovernanceRoutes, module: 'foundation' },
  // { path: "/api/foundation/roles", handler: foundationRolesRoutes, module: 'foundation' },
  // { path: "/api/positions", handler: positionsRoutes, module: 'foundation' },
  // { path: "/api/access-review", handler: accessReviewRoutes, module: 'foundation' },
  // { path: "/api/locations", handler: locationsRoutes, module: 'foundation' },
  // { path: "/api/departments", handler: departmentsRoutes, module: 'foundation' },
  // { path: "/api/organizations", handler: organizationsRoutes, module: 'foundation' },
  // { path: "/api/business-units", handler: businessUnitsRoutes, module: 'foundation' },
  // { path: "/api/ownership-mapping", handler: ownershipMappingRoutes, module: 'foundation' },
  { path: "/api/modules", handler: modulesRoutes, module: 'foundation' },
  { path: "/api/processes", handler: processesRoutes, module: 'foundation' },
  { path: "/api/products", handler: productsRoutes, module: 'foundation' },
  { path: "/api/reference-data", handler: referenceDataRoutes, module: 'foundation' },
  // @death-date Phase 3 | owner: DOS | replacement: platform/dos/foundation/
  // { path: "/api/committees", handler: committeeManagementRoutes, module: 'foundation' },
  // { path: "/api/user-lifecycle", handler: userLifecycleRoutes, module: 'foundation' },
  { path: "/api/regulators", handler: regulatorRegistryRoutes, module: 'foundation' },
  { path: "/api/consent-lifecycle", handler: consentLifecycleRoutes, module: 'compliance' },
  { path: "/api/documents", handler: documentManagementRoutes, module: 'foundation' },

  // ── Workflow & Automation ──
  { path: "/api/workflows", handler: workflowRoutes, module: 'workflow' },
  { path: "/api/workflow-ext", handler: workflowExtRoutes, module: 'workflow' },
  { path: "/api/workflow-templates", handler: workflowTemplateRoutes, module: 'workflow' },
  { path: "/api/workflow-chains", handler: workflowChainRoutes, module: 'workflow' },
  { path: "/api/workflow-advanced", handler: workflowAdvancedRoutes, module: 'workflow' },
  { path: "/api/workflow-lookups", handler: workflowLookupsRoutes, module: 'workflow' },
  { path: "/api/workflow-profile", handler: workflowProfileRoutes, module: 'workflow' },
  { path: "/api/module-workflows", handler: moduleWorkflowRoutes, module: 'workflow' },
  { path: "/api/bulk-tasks", handler: bulkTasksRoutes, module: 'workflow' },
  { path: "/api/workflow-import-export", handler: workflowImportExportRoutes, module: 'workflow' },
  { path: "/api/automation", handler: automationRoutes, module: 'workflow' },
  { path: "/api/auto-tasks", handler: autoTaskRoutes, module: 'workflow' },
  { path: "/api/approvals", handler: approvalRoutingRoutes, module: 'workflow' },
  { path: "/api/approval-requests", handler: approvalRequestsRoutes, module: 'workflow' },
  { path: "/api/roadmap", handler: roadmapExtRoutes },
  { path: "/api/roadmap-builder", handler: roadmapBuilderRoutes },
  { path: "/api/review-cycles", handler: reviewCycleRoutes },
  { path: "/api/sop-library", handler: sopLibraryRoutes, module: 'policy' },
  // SoD check route deferred until sod-check.routes.ts is created

  // ── Teams & Collaboration — @death-date Phase 3 | owner: DOS | replacement: platform/dos/foundation/ ──
  // { path: "/api/teams", handler: teamRoutes, module: "team" },
  // { path: "/api/member-lifecycle", handler: memberLifecycleRoutes, module: 'foundation' },
  { path: "/api/unified-squad", handler: unifiedSquadRoutes, module: 'foundation' },
  { path: "/api/cooperative-workflows", handler: cooperativeWorkflowsRoutes, module: 'workflow' },
  { path: "/api/agent-delegation", handler: agentDelegationRoutes, module: 'foundation' },
  { path: "/api/profiles/roles", handler: roleProfileRoutes, module: 'foundation' },
  { path: "/api/roles", handler: roleDetailRoutes, module: 'foundation' },
  { path: "/api/profiles", handler: profilesRoutes, module: 'foundation' },
  { path: "/api/profiles", handler: roleMatrixRoutes, module: 'foundation' },

  // ── Communication & Activity ──
  { path: "/api/notifications", handler: notificationRoutes, module: "notification" },
  { path: "/api/notification-center", handler: notificationCenterRoutes, module: "notification" },
  { path: "/api/notification-preferences", handler: notificationPreferencesRoutes, module: "notification" },
  { path: "/api/comments", handler: commentRoutes },
  { path: "/api/messaging", handler: messagingRoutes },
  { path: "/api/activity-feed", handler: activityFeedRoutes },
  { path: "/api/timeline", handler: activityStreamRoutes },
  { path: "/api/next-actions", handler: nextActionsRoutes },

  // ── Task & Process ──
  { path: "/api/task-board", handler: taskBoardRoutes, module: 'workflow' },
  { path: "/api/process-tasks", handler: processTasksRoutes, module: 'workflow' },
  { path: "/api/action-items", handler: actionItemRoutes, module: 'action' },
  { path: "/api/remediation", handler: remediationRoutes, module: 'remediation' },
  { path: "/api/quick-accelerator", handler: quickGrcAcceleratorRoutes },

  // ── Content & Knowledge ──
  { path: "/api/content", handler: contentRoutes },
  { path: "/api/content-packs", handler: contentPackRoutes },
  { path: "/api/packs", handler: (packManagementRoutes as any) },
  { path: "/api/knowledge", handler: knowledgeRoutes },
  { path: "/api/knowledge-hub", handler: knowledgeHubRoutes },
  { path: "/api/training", handler: trainingDataRoutes },
  { path: "/api/training-advanced", handler: trainingAdvancedRoutes },
  { path: "/api/training-admin", handler: trainingAdminRoutes },

  // ── Integration & Connectors ──
  { path: "/api/integrations", handler: integrationsRoutes },
  { path: "/api/connectors", handler: connectorRoutes, tier: 'connectors' },
  { path: "/api/connector-health", handler: connectorHealthRoutes },
  { path: "/api/webhooks-outbound", handler: webhookOutboundRoutes },
  { path: "/api/webhooks-manage", handler: webhooksManageRoutes },
  { path: "/api/email-inbox", handler: emailInboxRoutes },

  // ── Tier-guarded features ──
  { path: "/api/digital-twin", handler: digitalTwinRoutes, tier: 'digital_twin' },
  { path: "/api/red-team", handler: redTeamRoutes, tier: 'red_team' },
  { path: "/api/exception-governance", handler: exceptionGovRoutes, tier: 'exception_governance' },
  { path: "/api/cadence", handler: cadenceRoutes, tier: 'cadence' },
  { path: "/api/qiyas", handler: qiyasRoutes, tier: 'qiyas', module: 'qiyas' },

  // ── UI & UX ──
  { path: "/api/ui", handler: uiRoutes },
  { path: "/api/widgets", handler: widgetRoutes },
  { path: "/api/playbook", handler: playbookRoutes },
  { path: "/api/playbooks", handler: playbookRoutes },
  { path: "/api/auto-crud", handler: autoCrudRoutes },
  { path: "/api/command-palette", handler: commandPaletteRoutes },
  { path: "/api/inline-edit", handler: inlineEditRoutes },
  { path: "/api/journey", handler: journeyRoutes, module: 'journey' },
  { path: "/api/guidance", handler: guidanceRoutes },
  { path: "/api/explainability", handler: explainabilityRoutes },
  { path: "/api/contract-tests", handler: contractTestRoutes },
  { path: "/api/entity-links", handler: entityLinkRoutes },
  { path: "/api/search", handler: globalSearchRoutes },
  { path: "/api/field-rbac", handler: fieldRbacRoutes },
  { path: "/api/bulk-import", handler: bulkImportRoutes },
  { path: "/api/features", handler: featureTablesRoutes },
  { path: "/api/assets", handler: assetsStandaloneRoutes, module: 'asset' },
  { path: "/api/assets-compat", handler: assetRoutes, module: 'asset' },
  { path: "/api/vulnerabilities", handler: vulnerabilitiesRoutes, module: 'asset' },
  { path: "/api/model-risk", handler: modelRiskRoutes },
  { path: "/api/dpia", handler: dpiaRoutes, module: 'compliance' },
  { path: "/api/privacy-ops", handler: privacyRoutes, module: 'compliance' },
  { path: "/api/privacy-budget", handler: privacyBudgetRoutes, module: 'compliance' },
  { path: "/api/hitl", handler: hitlRoutes },
  { path: "/api/service-health", handler: serviceHealthRoutes },
  { path: "/api/sla-performance", handler: slaPerformanceRoutes },
  { path: "/api/mobile", handler: mobileRoutes },
  { path: "/api/work-items", handler: workItemRoutes, module: 'workflow' },

  // ── Provisioning sub-routes ──
  { path: "/api/provisioning", handler: provisioningPlatformRoutes },
  { path: "/api/onboarding/seed", handler: provisioningSeedRoutes },
  { path: "/api/provisioning/executor", handler: provisioningExecutorRoutes },
  { path: "/api/provisioning", handler: provisioningStatusRoutes },

  // ── Module controllers (mounted at /api) ──
  { path: "/api", handler: provisioningOrchestratorRoutes },
  { path: "/api", handler: meBootstrapRoutes },
  { path: "/api", handler: navigationRoutes },
  { path: "/api", handler: dashboardRegistryRoutes },
  { path: "/api", handler: dashboardEditorRoutes },
  { path: "/api", handler: widgetDataRoutes },
  { path: "/api", handler: packInstallerRoutes },
  { path: "/api", handler: packPolicyRoutes },
  { path: "/api", handler: agrcEngineRoutes },
  { path: "/api", handler: executiveWidgetsRoutes },
  { path: "/api", handler: (trialExtensionRoutes as any) },
  { path: "/api", handler: bulkActionRoutes },
  { path: "/api", handler: moduleKickstartRoutes },

  // ── Public endpoints ──
  { path: "/api/public/sample-reports", handler: sampleReportsRoutes },
  { path: "/api/public/explorer", handler: publicExplorerRoutes },

  // ── Onboarding sub-routers ──
  { path: "/api/onboarding/lookups", handler: onboardingLookupRoutes },
  { path: "/api/modules", handler: moduleOnboardingRoutes },

  // ── Advanced AI Governance & Compliance (Phase 4) ──
  { path: "/api/ai-agent-governance-p4", handler: aiAgentGovernanceP4Routes, module: 'ai-governance' },
  { path: "/api/ai-post-market", handler: aiPostMarketRoutes, module: 'ai-governance' },
  { path: "/api/ai-privacy", handler: aiPrivacyGovernanceRoutes, module: 'ai-governance' },
  { path: "/api/ai-supply-chain", handler: aiSupplyChainRoutes, module: 'ai-governance' },
  { path: "/api/ai-systems", handler: aiSystemRegistryRoutes, module: 'ai-governance' },
  { path: "/api/ai-experiments", handler: aiModelExperimentsRoutes, module: 'ai-governance' },
  { path: "/api/dora", handler: doraRoutes, module: 'dora' },
  { path: "/api/dora-resilience", handler: doraResilienceRoutes, module: 'compliance' },
  { path: "/api/quantum-readiness", handler: quantumReadinessRoutes, module: 'compliance' },
  { path: "/api/runtime-overrides", handler: runtimeOverridesRoutes },

  // ── Module Readiness (MCEF) ──
  { path: "/api/module-readiness", handler: moduleReadinessRoutes },

  // ── Module Certification & Packs ──
  { path: "/api/module-certification", handler: moduleCertificationRoutes },
  { path: "/api/inbound-events", handler: inboundEventRoutes },
  { path: "/api/runtime-health", handler: runtimeHealthRoutes },

  // ── Platform Statistics & LOC ──
  { path: "/api/platform-stats", handler: platformStatsRoutes },

  // ── Shell Configuration Engine ──
  { path: "/api/v1/shell", handler: shellConfigRoutes },
];


