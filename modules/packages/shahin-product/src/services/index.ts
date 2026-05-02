// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Shahin -- AGRC Product Service Barrel (Law 2)
// All AGRC product services re-exported from their
// owning modules. Platform services (cache, email,
// LLM infra, etc.) remain in backend/src/services/.
//
// This barrel provides a single product-scoped
// entry point for governance audits and future
// multi-product service isolation.
//
// NOTE: Where two modules export the same name,
// the FIRST export wins.  Later modules use
// explicit named re-exports to avoid TS2308.
// ============================================

// ── Risk ──
export * from '@dos/module-sdk/risk/services/core/risk.service';
// risk-scoring: exclude getKRITrends (already in risk.service)
export {
  type RiskZone, type DimensionScore, type ThresholdCrossingResult,
  type KRIDataPoint, type RiskPostureReport,
  computeCompositeScore, determineZone, checkThresholdCrossing,
  getRiskModels, createRiskModel, updateRiskModel, scoreRisk,
  getRiskPosture, getAIRecommendations, predictRiskTrajectory
} from '@dos/module-sdk/risk/services/scoring/risk-scoring.service';
export * from '@dos/module-sdk/risk/services/analytics/risk-metrics.service';
export * from '@dos/module-sdk/risk/services/core/risk-workspace.service';
export * from '@dos/module-sdk/risk/services/analytics/risk-heatmap.service';
export * from '@dos/module-sdk/risk/services/analytics/risk-trend-analyzer.service';
export * from '@dos/module-sdk/risk/services/workflow/risk-pair-review.service';
export * from '@dos/module-sdk/risk/services/quantification/risk-quantification.service';

// ── Compliance ──
export * from '@dos/module-sdk/compliance/services/compliance/compliance.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-workspace.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-cache.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-settings.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-drift-engine.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-observability.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-benchmark.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-as-code.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-attestation.service';
export * from '@dos/module-sdk/compliance/services/compliance/compliance-heatmap.service';
export * from '@dos/module-sdk/compliance/services/misc/control-dependency-graph.service';
export * from '@dos/module-sdk/compliance/services/ccm/ccm-cloud-monitor.service';
export * from '@dos/module-sdk/compliance/services/ccm/ccm-worker.service';

// ── Audit ──
// audit.service: exclude createFinding, updateFinding (in compliance-workspace),
//   generateReport renamed to generateAuditReport to avoid clash with report-generator
export {
  getAuditOverview, getEngagements, getEngagementById, createEngagement,
  updateEngagement, updateEngagementStatus, deleteEngagement,
  getAuditPlans, getAuditPlanById, createAuditPlan, updateAuditPlanStatus,
  updateAuditPlan, deleteAuditPlan,
  getFindings, getFindingById, deleteFinding,
  getRootCauses, addRootCause, getImpacts, addImpact,
  getCapaPlans, getCapaPlanById, createCapaPlan, updateCapaPlan,
  linkCapaToRiskTreatment, getAvailableRiskTreatments,
  getClosureReviews, createClosureReview, collectEvidence,
  generateReport as generateAuditReport
} from '@dos/module-sdk/audit/services/audit/core/audit.service';
export * from '@dos/module-sdk/audit/services/misc/akb.service';
export * from '@dos/module-sdk/audit/services/audit/findings/audit-anomaly-detector.service';
export * from '@dos/module-sdk/audit/services/audit/reporting/audit-capa-effectiveness.service';
export * from '@dos/module-sdk/audit/services/audit/reporting/audit-committee-reporting.service';
export * from '@dos/module-sdk/audit/services/audit/operations/audit-cross-module.service';
export * from '@dos/module-sdk/audit/services/audit/execution/audit-evidence-versions.service';
export * from '@dos/module-sdk/audit/services/audit/operations/audit-external-coordination.service';
export * from '@dos/module-sdk/audit/services/audit/findings/audit-finding-slas.service';
export * from '@dos/module-sdk/audit/services/audit/findings/audit-finding-trends.service';
export * from '@dos/module-sdk/audit/services/audit/reporting/audit-package.service';
// audit-package-exporter: exclude generateAuditPackage, AuditPackageOptions (in audit-package / compliance-workspace)
export {
  buildManifest, type AuditManifestEntry, type AuditManifest
} from '@dos/module-sdk/audit/services/audit/reporting/audit-package-exporter.service';
export * from '@dos/module-sdk/audit/services/audit/planning/audit-prep.service';
// audit-qa-reviews: exclude listReviews (in risk-pair-review), createReview renamed
export {
  createReview as createAuditQaReview, approveReview, rejectReview, getPendingReviews
} from '@dos/module-sdk/audit/services/audit/reporting/audit-qa-reviews.service';
export * from '@dos/module-sdk/audit/services/audit/reporting/audit-ratings.service';
export * from '@dos/module-sdk/audit/services/audit/operations/audit-regulatory-tracking.service';
export * from '@dos/module-sdk/audit/services/audit/operations/audit-reminders.service';
export * from '@dos/module-sdk/audit/services/audit/findings/audit-repeat-findings.service';
export * from '@dos/module-sdk/audit/services/audit/operations/audit-risk-scoring.service';
export * from '@dos/module-sdk/audit/services/audit/planning/audit-schedules.service';
export {
  getTeam as getAuditTeam,
  assignMember as assignAuditTeamMember,
  removeMember as removeAuditTeamMember,
  updateHours as updateAuditTeamHours,
  getWorkloadSummary as getAuditWorkloadSummary,
} from '@dos/module-sdk/audit/services/audit/planning/audit-team.service';
export {
  listTemplates as listAuditTemplates,
  createTemplate as createAuditTemplate,
  updateTemplate as updateAuditTemplate,
  deleteTemplate as deleteAuditTemplate,
  getTemplateById as getAuditTemplateById,
  applyTemplate as applyAuditTemplate,
} from '@dos/module-sdk/audit/services/audit/planning/audit-templates.service';
export * from '@dos/module-sdk/audit/services/audit/execution/audit-test-plans.service';
export * from '@dos/module-sdk/audit/services/audit/execution/audit-time-tracking.service';
export * from '@dos/module-sdk/audit/services/audit/core/audit-trail.service';
export * from '@dos/module-sdk/audit/services/audit/operations/audit-trail-retention.service';
export * from '@dos/module-sdk/audit/services/audit/planning/audit-universe.service';
// audit-working-papers: exclude submitForReview (in compliance-workspace)
export {
  listPapers, createPaper, updatePaper, approvePaper
} from '@dos/module-sdk/audit/services/audit/execution/audit-working-papers.service';
export * from '@dos/module-sdk/audit/services/misc/workpaper-generator.service';

// ── Evidence ──
export * from '@dos/module-sdk/evidence/services/core/evidence.service';
// evidence-catalog: exclude getExpiringEvidence, verifyHashChain (in evidence.service)
export {
  getCatalog, createCatalogEntry, validateEvidence, checkCompleteness,
  canDeleteEvidence
} from '@dos/module-sdk/evidence/services/analysis/evidence-catalog.service';
export * from '@dos/module-sdk/evidence/services/core/evidence-lifecycle.service';
export * from '@dos/module-sdk/evidence/services/core/evidence-relay.service';
export * from '@dos/module-sdk/evidence/services/workflow/evidence-request-generator.service';
export * from '@dos/module-sdk/evidence/services/analysis/evidence-scoring.service';
// evidence-quality-scoring: exclude scoreControlEvidence (in evidence-scoring)
export {
  type EvidenceQualityScore, scoreEvidenceQuality, batchScoreEvidenceQuality,
  getControlEvidenceQualityAverage
} from '@dos/module-sdk/evidence/services/analysis/evidence-quality-scoring.service';
export * from '@dos/module-sdk/evidence/services/reporting/evidence-reuse.service';
export * from '@dos/module-sdk/evidence/services/collection/evidence-auto-collection.service';
export * from '@dos/module-sdk/evidence/services/reporting/evidence-bundle-generator.service';
export * from '@dos/module-sdk/evidence/services/analysis/evidence-multimodal-analysis.service';

// ── Policy ──
export * from '@dos/module-sdk/policy/services/policy/policy-attestation.service';
export * from '@dos/module-sdk/policy/services/policy/policy-code.service';
export * from '@dos/module-sdk/policy/services/policy/policy-impact-simulator.service';
export * from '@dos/module-sdk/policy/services/policy/policy-template.service';

// ── Incident & BCP ──
export * from '@dos/module-sdk/incident/services/incident/incident.service';
export * from '@dos/module-sdk/incident/services/incident/incident-advanced.service';
export * from '@dos/module-sdk/incident/services/incident/incident-followup.service';
export * from '@dos/module-sdk/incident/services/incident/incident-playbook-templates.service';
export * from '@dos/module-sdk/incident/services/incident/incident-sla-config.service';
export * from '@dos/module-sdk/incident/services/incident/incident-war-room.service';
export * from '@dos/module-sdk/bcp/services/bcp.service';
export * from '@dos/module-sdk/bcp/services/bcm-advanced.service';

// ── Vendor ──
export * from '@dos/module-sdk/vendor/services/vendor/vendor.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-advanced.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-enhancements.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-compliance-sync.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-cross-agent.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-cyber-rating.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-portal.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-risk-ext.service';
export * from '@dos/module-sdk/vendor/services/vendor/vendor-scoring.service';

// ── Training ──
export * from '@dos/module-sdk/training/services/training-advanced.service';
export * from '@dos/module-sdk/training/services/training-data.service';
export * from '@dos/module-sdk/training/services/training-hooks.service';

// ── Reporting & Analytics ──
export * from '@dos/module-sdk/reporting/services/report/report.service';
// report-generator: exclude ReportMetadata, serializeReportMetadata, deserializeReportMetadata (in report.service),
//   generateReport renamed, getReportTemplates renamed
export {
  type ReportParameterDef, type ReportTemplateInfo,
  generateReport as generateTemplatedReport,
  getReportTemplates as getReportTemplateList,
  createReportSchedule
} from '@dos/module-sdk/reporting/services/report/report-generator.service';
// report-ext: exclude generateReport (in report.service/report-generator), getReportTemplates (in report-generator),
//   scheduleReport (in report.service), computeFreshness kept under alias
export {
  type ReportFilters, type ReportMetadataExt, type MaturityDomainScore,
  type MaturityScorecard, type EvidencePackItem, type EvidencePackExport,
  type BoardView, type ReportTemplate, type ScheduledReportConfig, type GeneratedReport,
  REPORT_TEMPLATES,
  generateReportMetadata, computeReportHash,
  computeMaturityScorecard, validateReportFilters,
  computeFreshness as computeReportFreshness,
  getMaturityScorecard, exportEvidencePack, getBoardView
} from '@dos/module-sdk/reporting/services/report/report-ext.service';
// report-hub: exclude computeFreshness (in report-ext)
export {
  type GRCModule, type ReportHubEntry, type ReportHubFilters,
  type ReportHubPage, type ExecutiveSummary, type FrameworkCardDto,
  type EmailReportRequest,
  computeModuleFromTemplateId, validateReportTemplateAgainstRegistry,
  clampPageSize, serializeReportHubEntry, deserializeReportHubEntry,
  validateReportHubFilters, applyFiltersToQuery,
  getReportCatalog, getExecutiveSummary, getFrameworkCards,
  getReportDetail, exportReportPDF, exportReportExcel,
  emailReportToAddresses
} from '@dos/module-sdk/reporting/services/report/report-hub.service';
// report-renderer: exclude ReportData (in report.service)
export {
  type ReportSection,
  renderReportAsPDF, renderReportAsExcel
} from '@dos/module-sdk/reporting/services/report/report-renderer.service';
export * from '@dos/module-sdk/reporting/services/report/report-drilldown.service';
export * from '@dos/module-sdk/reporting/services/report/report-sharing.service';
export * from '@dos/module-sdk/reporting/services/report/report-stream.service';
// analytics: exclude BenchmarkResult (in compliance-benchmark)
export {
  type TenantKPIs, type KPISnapshot, type DashboardWidget, type DashboardConfig,
  computeKPIs,
  saveDashboardConfig, getDashboardConfig,
  serializeDashboardConfig, deserializeDashboardConfig,
  runAggregationJob, getKPITrends,
  getBenchmarkData, linearRegression, projectKPI,
  recalculateCompliancePostureIncremental, computeTenantHealthScore
} from '@dos/module-sdk/analytics/services/analytics/analytics.service';

// ── Integration ──
// connector: exclude getStatusHistory (in evidence-lifecycle)
export {
  resolveAdapter, testConnection, getConnectors, createConnector,
  getConnectorHealth, getHealthDashboard, runConnector,
  getExecutions, getValidNextStatuses, transitionConnectorStatus,
  getConnectorDetail, updateConnectorOwnership
} from '@dos/module-sdk/integrations/services/connector.service';
export * from '@dos/module-sdk/integrations/services/connector-sync.service';
export * from '@dos/module-sdk/integrations/services/connector-evidence-mapper.service';

// ── Team & Foundation ──
// Foundation services live in @dos/module-foundation (single physical home:
// modules/foundation/source/backend/foundation/services/legacy). They are not
// re-exported here because no current product consumer imports them via the
// shahin-product service barrel — services are mounted by user-service through
// services/user-service/src/domain/foundation/index.ts (Phase-5 host adapter).

// ── Remediation ──
export * from '@dos/module-sdk/remediation/services/remediation.service';

// ── Action ──
export * from '@dos/module-sdk/action/services/action-item.service';
export * from '@dos/module-sdk/action/services/action-executor.service';

// ── Exception ──
export * from '@dos/module-sdk/exception/services/exception.service';

// ── Notification ──
export * from '@dos/module-sdk/notification/services/notification.service';

// ── Workflow ──
export * from '@dos/module-sdk/workflow/services/core/workflow.service';
export * from '@dos/platform-core/workflows/engine/workflow-crud.service';

export * from '@dos/module-sdk/workflow/services/core/workflow-execution.service';
// workflow-ext: exclude instantiateTemplate (in workflow.service)
export {
  type WorkflowConfigValidation, type WorkflowConfig,
  validateWorkflowConfig, sendStepNotification,
  sendApprovalEmail, escalateStep
} from '@dos/module-sdk/workflow/services/ops/workflow-ext.service';
// workflow-templates: exclude WorkflowDefinition, getWorkflowTemplates, instantiateTemplate (in workflow.service)
export {
  type WorkflowNode, type WorkflowEdge, type PredefinedTemplate,
  serializeTemplateDefinition, deserializeTemplateDefinition,
  validateTemplateStructure, PREDEFINED_TEMPLATES,
  getWorkflowTemplatesFromDB, seedWorkflowTemplates
} from '@dos/module-sdk/workflow/services/templates/workflow-templates.service';
export * from '@dos/module-sdk/workflow/services/templates/workflow-template-crud.service';
// dos/workflows — explicit re-export to avoid clash with workflow.service
export {
  startWorkflowExecution, advanceStep, completeStep, cancelExecution,
  getInstanceStatus, getFailurePath,
  emitWorkflowEntityEvent,
  executeNotificationStep, executeApiCallNode, executeSendEmailNode, executeWebhookNode,
  createProcessTask, completeProcessTask,
  type ProcessTaskType, type ProcessTaskInput, type ProcessTask, type RoutingResolution,
  type WorkflowEventType, type WorkflowEventPayload,
  type WorkflowEntityType, type WorkflowAction,
  EMPTY_RESOLUTION, SLA_DEFAULTS,
} from '@dos/platform-core/workflows';
export {
  createApprovalStep as createWfApprovalStep,
  resolveApproval as resolveWfApproval,
  checkPreconditions as checkWfPreconditions,
  validatePreconditions,
} from '@dos/module-sdk/workflow/services/approvals/workflow-approvals.service';
export * from '@dos/module-sdk/workflow/services/ops/workflow-acl.service';
export * from '@dos/module-sdk/workflow/services/ops/workflow-automation.service';
export * from '@dos/module-sdk/workflow/services/core/workflow-categories.service';
export * from '@dos/module-sdk/workflow/services/chains/workflow-chain-executor.service';
export * from '@dos/module-sdk/workflow/services/templates/workflow-comparison.service';
// workflow-engine types (functions already exported above from dos/workflows)
export {
  type EngineStep, type EngineTransition, type EngineCondition,
  type InstanceStepRecord, type StartResult, type AdvanceResult,
  evaluateTransitionConditions,
  createApprovalForStep, onApprovalResolved,
} from '@dos/platform-core/workflows/engine/workflow-engine.service';
export * from '@dos/module-sdk/workflow/services/templates/workflow-mermaid.service';
export * from '@dos/module-sdk/workflow/services/ops/workflow-queue.service';
export * from '@dos/module-sdk/workflow/services/ops/workflow-retention.service';
export * from '@dos/module-sdk/workflow/services/templates/workflow-serialization.service';
export * from '@dos/module-sdk/workflow/services/ops/workflow-stall-recovery.service';
export * from '@dos/module-sdk/workflow/services/templates/workflow-versioning.service';
export {
  createApprovalChain, submitForApproval, approveStep, rejectStep,
  delegateApproval, escalateApproval as escalateApprovalChain, checkAndEscalateOverdue,
  type ApprovalChainStep, type ApprovalChainConfig, type ApprovalChainRecord,
  type ApprovalRequestRecord, type ApprovalStepLog,
} from '@dos/platform-core/workflows/approvals/approval-engine.service';
export * from '@dos/module-sdk/workflow/services/approvals/approval-prescreen.service';
export * from '@dos/module-sdk/workflow/services/approvals/approval-routing.service';
export * from '@dos/module-sdk/workflow/services/ai/autonomous-workflow.service';
export * from '@dos/module-sdk/workflow/services/ai/next-best-action.service';
export * from '@dos/module-sdk/workflow/services/tasks/process-task-monitor.service';
export * from '@dos/module-sdk/workflow/services/tasks/process-template.service';
export * from '@dos/module-sdk/workflow/services/approvals/review-cycle-engine.service';
export * from '@dos/module-sdk/workflow/services/tasks/task-auto-resolution.service';
// task-board: exclude UrgencyColor (in action-item)
export {
  type TaskStatus, type TaskBoardItem, type TaskBoardState,
  VALID_TRANSITIONS, computeUrgency, isValidTransition, computeProgress,
  groupTasksByStatus, serializeTaskBoard, deserializeTaskBoard,
  getKanbanBoard, createTask, updateTaskStatus, getTaskProgress
} from '@dos/module-sdk/workflow/services/tasks/task-board.service';
export * from '@dos/module-sdk/workflow/services/tasks/task-triage.service';
// workload-balancer: exclude WorkloadMetrics (in team.service)
export {
  type WorkloadBalanceDecision,
  getAgentWorkloadMetrics, balanceWorkload,
  getTenantWorkloadSummary, rebalanceWorkload
} from '@dos/module-sdk/workflow/services/tasks/workload-balancer.service';

// ── Governance ──
export * from '@dos/module-sdk/governance/services/governance/governance.service';
// governance-acknowledgements: exclude createCampaign (in training-advanced)
export {
  listAcknowledgements, listCampaigns as listAckCampaigns,
  recordAcknowledgement, getAckStats
} from '@dos/module-sdk/governance/services/governance/governance-acknowledgements.service';
export * from '@dos/module-sdk/governance/services/governance/governance-auto-escalation.service';
export * from '@dos/module-sdk/governance/services/governance/governance-baseline-seeders.service';
export * from '@dos/module-sdk/governance/services/governance/governance-board-packs.service';
export * from '@dos/module-sdk/governance/services/governance/governance-charters.service';
export * from '@dos/module-sdk/governance/services/governance/governance-constitution.service';
// governance-delegations: service not yet extracted (delegations handled by DAuth)
export * from '@dos/module-sdk/governance/services/governance/governance-enforcement.service';
export * from '@dos/module-sdk/governance/services/governance/governance-executive-summaries.service';
export * from '@dos/module-sdk/governance/services/governance/governance-gap-scanner.service';
export * from '@dos/module-sdk/governance/services/governance/governance-health.service';
export * from '@dos/module-sdk/governance/services/governance/governance-hooks.service';
export * from '@dos/module-sdk/governance/services/governance/governance-mandates.service';
export * from '@dos/module-sdk/governance/services/governance/governance-maturity-auto-assessment.service';
export * from '@dos/module-sdk/governance/services/governance/governance-objectives.service';
// governance-obligations: exclude updateObligation (in compliance-workspace)
export {
  listGovernanceObligations as listGovObligations,
  getObligationById as getGovObligationById,
  createObligation as createGovObligation,
  assignObligation, getObligationDueDates, completeDueDate,
  getObligationEvidenceLinks, linkEvidenceToObligation,
  getObligationControlLinks, linkControlToObligation, requestExemption
} from '@dos/module-sdk/governance/services/governance/governance-obligations.service';
// governance-raci: exclude createTemplate, getTemplateById, listTemplates, updateTemplate (in audit-templates)
export {
  getCompiledMatrix, getAccountabilityGaps, getSodConflicts as getRaciSodConflicts,
  setAssignments, activateTemplate as activateRaciTemplate,
  archiveTemplate as archiveRaciTemplate
} from '@dos/module-sdk/governance/services/governance/governance-raci.service';
// governance-raci-templates: exclude activateTemplate, archiveTemplate (in governance-raci)
export {
  listRaciTemplates, getRaciTemplateById, createRaciTemplate,
  updateRaciTemplate, setRaciAssignments
} from '@dos/module-sdk/governance/services/governance/governance-raci-templates.service';
export * from '@dos/module-sdk/governance/services/governance/governance-registers.service';
export * from '@dos/module-sdk/governance/services/governance/governance-responsibilities.service';
// governance-reviews: exclude listReviews (in risk-pair-review), createReview (in audit-qa-reviews)
export {
  getReviewQueue, getOverdueReviews, getReviewById,
  createReview as createGovernanceReview,
  updateReview, softDeleteReview
} from '@dos/module-sdk/governance/services/governance/governance-reviews.service';
export * from '@dos/module-sdk/governance/services/governance/governance-structure.service';
export * from '@dos/module-sdk/governance/services/governance/governance-workload.service';
export * from '@dos/module-sdk/governance/services/board/board-report-export.service';
export * from '@dos/module-sdk/governance/services/misc/delegation-rules.service';
export * from '@dos/module-sdk/governance/services/misc/enforcement-gate.service';
export * from '@dos/module-sdk/governance/services/misc/grc-raci.service';
// obligation.service: exclude createObligation, getObligationById, listObligations (in governance-obligations),
//   updateObligation, mapControlToObligation (in compliance-workspace)
export {
  type Obligation, type ObligationInput, type ObligationControlMapping,
  deleteObligation, seedObligationsFromFramework,
  autoMapObligationToControls, autoMapAllObligationsForFramework,
  getObligationControls, unmapControlFromObligation
} from '@dos/module-sdk/governance/services/misc/obligation.service';
export * from '@dos/module-sdk/governance/services/misc/raci-generator.service';
export * from '@dos/module-sdk/governance/services/misc/realtime-governance-enforcement.service';
// ── Onboarding ──
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-flow.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-session.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-answer.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-completion.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-event.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-recommendation.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-review.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-score.service';
export {
  type ValidationResult as OnboardingValidationResult,
  OnboardingValidationService
} from '@dos/module-sdk/onboarding/services/onboarding/onboarding-validation.service';
export * from '@dos/module-sdk/onboarding/services/misc/confidence-score.service';
export * from '@dos/module-sdk/onboarding/services/misc/governance-context.service';
export * from '@dos/module-sdk/onboarding/services/misc/impact-rule-executor.service';
export * from '@dos/module-sdk/onboarding/services/misc/inferred-facts.service';
// lookup.service: exclude MaturityLevel (in compliance-workspace)
export {
  type Country, type City, type Sector, type EmployeeRange,
  type Timezone, type Language, type Framework,
  type ApprovalModel, type EscalationModel, type Frequency,
  type SlaTier, type SsoProvider, type Connector, type ControlTesting,
  LookupService
} from '@dos/module-sdk/onboarding/services/misc/lookup.service';
export * from '@dos/module-sdk/onboarding/services/provisioning/provisioning-definition.service';
export * from '@dos/module-sdk/onboarding/services/provisioning/provisioning-orchestrator.service';
export * from '@dos/module-sdk/onboarding/services/provisioning/provisioning-step-runner.service';
export * from '@dos/module-sdk/onboarding/services/misc/question.service';
export * from '@dos/module-sdk/onboarding/services/misc/quick-start-templates.service';
export * from '@dos/module-sdk/onboarding/services/misc/regulator-explanation.service';
export * from '@dos/module-sdk/onboarding/services/misc/scene.service';
export * from '@dos/module-sdk/onboarding/services/onboarding/onboarding-session.service';
export * from '@dos/module-sdk/onboarding/services/misc/stage-definition.service';
export * from '@dos/module-sdk/onboarding/services/misc/startup-checklist.service';
export * from '@dos/module-sdk/onboarding/services/misc/translation.service';
export * from '@dos/module-sdk/onboarding/services/misc/ui-config.service';
export * from '@dos/module-sdk/onboarding/services/misc/workspace-preview.service';

// ── Foundation ──
// Foundation services consolidated in @dos/module-foundation (Phase 2 complete).
// Single physical home: modules/foundation/source/backend/foundation/services.
// Mounted at runtime by user-service via services/user-service/src/domain/foundation.

// ── AI ──
export * from '@dos/module-sdk/ai/services/agents/core/ai-agent.service';
export * from '@dos/module-sdk/ai/services/agents/core/ai-agent-runtime.service';
export * from '@dos/module-sdk/ai/services/observability/ai-agent-performance.service';
export * from '@dos/module-sdk/ai/services/governance/compliance/ai-alert.service';
// ai-analytics: exclude detectAnomalies (in audit-anomaly-detector)
export {
  type TrendDirection, type TrendResult, type AnomalyAlert, type AIReportSummary,
  classifyTrend, computeRollingStats, isAnomaly,
  serializeTrendResult, deserializeTrendResult,
  serializeAnomalyAlert, deserializeAnomalyAlert,
  computeEWMA, forecastLinear, computeTrends,
  buildSummaryText, generateReportSummary
} from '@dos/module-sdk/ai/services/observability/ai-analytics.service';
export * from '@dos/module-sdk/ai/services/governance/compliance/ai-asset-discovery.service';
// ai-asset-inventory: relocated from modules/ai/services/ai/ to modules/ai/services/governance/compliance/
// Exclude LifecycleStatus and ScopeType to avoid name collisions with team-member-lifecycle / team-raci
export {
  type AssetType, type AssetStatus, type SourceType,
  type AIAsset, type CreateAssetInput, type UpdateAssetInput, type AssetQuery,
  createAsset, getAssetById, getAssetByKey, updateAsset,
  listAssets, deleteAsset, upsertAsset, getLifecycleTransitions
} from '@dos/module-sdk/ai/services/governance/compliance/ai-asset-inventory.service';
export * from '@dos/module-sdk/ai/services/governance/circuit/ai-circuit-breaker.service';
export * from '@dos/module-sdk/ai/services/cockpit/ai-cockpit.service';
export * from '@dos/module-sdk/ai/services/cockpit/ai-cockpit-signal.service';
export * from '@dos/module-sdk/ai/services/governance/compliance/ai-compliance-framework.service';
export * from '@dos/module-sdk/ai/services/governance/compliance/ai-control-mapping.service';
export * from '@dos/module-sdk/ai/services/observability/ai-cost-tracker.service';
// ai-decision-engine: exclude recordDecision (in committee-management)
export {
  type DecisionInput, type DecisionRecord, type DecisionApiRow,
  listDecisions, getDecisionById, getRunTrace, getDecisionTrend,
  getDecisionStats, getExplainabilityChain,
  getDecisionsByEntity, getDecisionsByEntityForApi
} from '@dos/module-sdk/ai/services/reasoning/ai-decision-engine.service';
export * from '@dos/module-sdk/ai/services/governance/compliance/ai-dpia.service';
export * from '@dos/module-sdk/ai/services/workflow/ai-event-trigger.service';
export * from '@dos/module-sdk/ai/services/reasoning/ai-explainability.service';
export * from '@dos/module-sdk/ai/services/gateway/ai-gateway.service';
export * from '@dos/module-sdk/ai/services/governance/ai-model-risk.service';
export * from '@dos/module-sdk/ai/services/observability/ai-observation.service';
export * from '@dos/module-sdk/ai/services/orchestration/ai-os-orchestrator.service';
// ai-policy-rule: exclude PolicyRule (in policy-code)
export {
  type PolicyEvalResult,
  evaluatePolicies, listPolicyRules, createPolicyRule,
  deletePolicyRule, togglePolicyRule, updatePolicyRule,
  evaluateRateLimitPolicy, detectPolicyConflicts,
  getBlockedActionLog, getPolicyEvalStats
} from '@dos/module-sdk/ai/services/governance/ai-policy-rule.service';
export * from '@dos/module-sdk/ai/services/reasoning/ai-recommendation-engine.service';
export * from '@dos/module-sdk/ai/services/workflow/ai-remediation.service';
export * from '@dos/module-sdk/ai/services/squad/ai-squad.service';
export * from '@dos/module-sdk/ai/services/workflow/ai-task-routing.service';
export * from '@dos/module-sdk/ai/services/workflow/ai-workflow-trigger.service';
export * from '@dos/module-sdk/ai/services/agents/lifecycle/agent-ab-testing.service';
// agent-action-executor: exclude executeAction (will conflict with quick-grc-accelerator)
export {
  resolveAssignee, resolveUserPermissions, getDefaultAgentPermissions
} from '@dos/module-sdk/ai/services/orchestration/agent-action-executor.service';
export * from '@dos/module-sdk/ai/services/activity/agent-activity-feed.service';
export * from '@dos/module-sdk/ai/services/orchestration/agent-context-builders.service';
export * from '@dos/module-sdk/ai/services/orchestration/agent-coordination.service';
export * from '@dos/module-sdk/ai/services/orchestration/agent-cycle-memory.service';
export * from '@dos/module-sdk/ai/services/orchestration/agent-cycle-orchestrator.service';
export * from '@dos/module-sdk/ai/services/delegation/agent-delegation.service';
export * from '@dos/module-sdk/ai/services/agents/lifecycle/agent-eval.service';
export * from '@dos/module-sdk/ai/services/agents/core/agent-fallback-responses.service';
export * from '@dos/module-sdk/ai/services/governance/agent-governance-bridge.service';
export * from '@dos/module-sdk/ai/services/agents/lifecycle/agent-health-monitor.service';
export * from '@dos/module-sdk/ai/services/observability/agent-metrics-aggregator.service';
export * from '@dos/module-sdk/ai/services/agents/lifecycle/agent-onboarding-executor.service';
// agent-orchestration: exclude getAgentRunStats (in ai-agent-runtime)
export {
  type AutonomyLevel, type RunInput, type RunState,
  type GraphNode, type GraphEdge, type RunGraph, type HyperRoleResult,
  autonomyMeetsThreshold, mapModeToAutonomy, computeHyperRole,
  createAgentRun, updateAgentRun, getAgentRun, listAgentRuns,
  recordAgentStep, getRunGraph, createProposal, listProposals,
  approveProposal, rejectProposal, recordAgentEvent, getRunEvents,
  getShadowAgentConfig, upsertShadowAgentConfig, listShadowAgents,
  getAutonomyPolicy
} from '@dos/module-sdk/ai/services/orchestration/agent-orchestration.service';
export * from '@dos/module-sdk/ai/services/agents/core/agent-output-validator.service';
export * from '@dos/module-sdk/ai/services/agents/core/agent-registry.service';
// agent-runner: re-exports executeAction from agent-action-executor, exclude it + AgentRunResult alias
export {
  type AgentAction,
  runAgent, CONTEXT_BUILDERS, runAllAgents, _fallbackAgentResponse
} from '@dos/module-sdk/ai/services/agents/core/agent-runner.service';
export * from '@dos/module-sdk/ai/services/agents/lifecycle/agent-self-improve.service';
export * from '@dos/module-sdk/ai/services/squad/agent-squad-manager.service';
export * from '@dos/module-sdk/ai/services/activity/agent-standup.service';
// agent-to-agent-delegation: exclude getDelegationHistory (in agent-delegation), rejectDelegation (in governance-delegations)
export {
  type AgentDelegationRequest, type AgentDelegationResult,
  delegateToAgent, acceptDelegation, completeDelegation, getPendingDelegations
} from '@dos/module-sdk/ai/services/delegation/agent-to-agent-delegation.service';
// agent-tool-executor: exclude AgentRunResult (in agent-runner)
export {
  type AgentToolDefinition, type ToolStepResult,
  registerAgentTools, getToolsForAgent, runAgentWithTools
} from '@dos/module-sdk/ai/services/agents/core/agent-tool-executor.service';
export * from '@dos/module-sdk/ai/services/agents/core/agent-tools-registry.service';
export * from '@dos/module-sdk/ai/services/copilot/co-drafting.service';
export * from '@dos/module-sdk/ai/services/copilot/context-reader.service';
export * from '@dos/module-sdk/ai/services/observability/cost-attribution.service';
export * from '@dos/module-sdk/ai/services/workflow/default-event-agent-bindings.service';
// explainability.service: relocated to ai-explainability.service (already exported above on the ai-explainability line)
// llm.service: exclude getAgentProfile (in ai-squad)
export {
  AGENT_PROFILES, type LLMMessage, type LLMCompletionResult,
  chatCompletion, enhancedChatCompletion, agentChat, getAllAgentProfiles
} from '@dos/module-sdk/ai/services/gateway/llm.service';
export * from '@dos/module-sdk/ai/services/llm/llm-cache.service';
export * from '@dos/module-sdk/ai/services/gateway/llm-router.service';
export * from '@dos/module-sdk/ai/services/llm/llm-stream.service';
export * from '@dos/module-sdk/ai/services/llm/llm-trace.service';
export * from '@dos/module-sdk/ai/services/gateway/llm-usage-tracker.service';
export * from '@dos/module-sdk/ai/services/memory/memory-compaction.service';
export * from '@dos/module-sdk/ai/services/memory/memory-store.service';
export * from '@dos/module-sdk/ai/services/reasoning/nl-query-engine.service';
// per-agent-circuit-breaker: exclude getAgentCircuitState (in ai-agent-runtime)
export {
  type CircuitState, type PerAgentCircuitBreakerConfig, type AgentCircuitState,
  canCallAgent, recordSuccess, recordFailure,
  getAllCircuitStates, resetCircuitBreaker
} from '@dos/module-sdk/ai/services/governance/circuit/per-agent-circuit-breaker.service';
// personal-agent: exclude ActivationMode (in team-member-lifecycle)
export {
  riskLevelOrder,
  type PersonalAgentAssignment, type AgentActivity,
  type ProcessGovernanceRule, type SlaActivationRule, type AgentDashboardSummary,
  assignPersonalAgent, getPersonalAgentAssignment,
  updatePersonalAgentAssignment, getUserRoles, getUserPermissions, mapAssignmentRow,
  executeAgentActivity, executeActivityAction,
  getAgentActivity, approveAgentActivity, rejectAgentActivity,
  confirmAgentActivity, mapActivityRow,
  checkSlaAndActivateAgent,
  getAgentDashboardSummary, getAgentAuditTrail, getAgentActivityTimeline,
  autoAssignAgentsForTenantMode,
  getPersonalAgentDiagnostics
} from '@dos/module-sdk/ai/services/personal/personal-agent.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-activity.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-approval.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-assignment.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-auto-assign.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-cache.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-dashboard.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-diagnostics.service';
export * from '@dos/module-sdk/ai/services/personal/personal-agent-sla.service';
export * from '@dos/module-sdk/ai/services/llm/prompt-drift-detector.service';
export * from '@dos/module-sdk/ai/services/llm/prompt-injection-guard.service';
export * from '@dos/module-sdk/ai/services/workflow/proposed-action.service';
export * from '@dos/module-sdk/ai/services/gateway/provider-policy-enforcer.service';
export * from '@dos/module-sdk/ai/services/gateway/rag-pipeline.service';
export * from '@dos/module-sdk/ai/services/reasoning/reasoning-chain.service';
export * from '@dos/module-sdk/ai/services/memory/shared-agent-memory.service';
// token-efficiency-tracker: exclude getEfficiencyMetrics renamed to avoid clash with audit-time-tracking
export {
  type TokenEfficiencyRecord, type EfficiencyMetrics as TokenEfficiencyMetrics,
  trackTokenEfficiency, calculateEfficiencyScore,
  getEfficiencyMetrics as getTokenEfficiencyMetrics
} from '@dos/module-sdk/ai/services/observability/token-efficiency-tracker.service';
export * from '@dos/module-sdk/ai/services/gateway/tool-registry.service';
export * from '@dos/module-sdk/ai/services/observability/tool-usage-analytics.service';
export * from '@dos/module-sdk/ai/services/squad/unified-squad-registry.service';

// ── AI Governance ──
export * from '@dos/module-sdk/ai-governance/services/ai/compliance/ai-act-classification.service';
// ai-governance/ai-asset-inventory: same file content as ai/ai-asset-inventory — skip to avoid full duplication
// export * from '@dos/module-sdk/ai-governance/services/ai/ai-asset-inventory.service'; // removed — all names in ai-asset-inventory
export * from '@dos/module-sdk/ai-governance/services/ai/compliance/ai-binding-governance.service';
export * from '@dos/module-sdk/ai-governance/services/ai/operations/ai-governance-bootstrap.service';
export * from '@dos/module-sdk/ai-governance/services/ai/operations/ai-governance-config.service';
export * from '@dos/module-sdk/ai-governance/services/ai/operations/ai-governance-ops.service';
export * from '@dos/module-sdk/ai-governance/services/digital/digital-twin.service';
export { type ModelVersion, type CreateDraftInput as ModelDraftInput, createDraftModelVersion, updateDraftModelVersion, submitModelVersionForApproval, approveModelVersion, rejectModelVersion, activateModelVersion, suspendModelVersion, retireModelVersion, rollbackModelVersion, listModelVersions, getModelVersionById, deleteModelVersion } from '@dos/module-sdk/ai-governance/services/misc/model-registry.service';
export { type PromptVersion, createDraftPromptVersion, updateDraftPromptVersion, submitPromptVersionForApproval, approvePromptVersion, rejectPromptVersion, activatePromptVersion, suspendPromptVersion, retirePromptVersion, rollbackPromptVersion, listPromptVersions, getPromptVersionById, deletePromptVersion } from '@dos/module-sdk/ai-governance/services/misc/prompt-registry.service';
export * from '@dos/module-sdk/ai-governance/services/misc/red-team.service';
export * from '@dos/module-sdk/ai-governance/services/misc/scenario-templates.service';

// ── Dashboard ──
export * from '@dos/module-sdk/dashboard/services/dashboard-cache-invalidator.service';
export * from '@dos/module-sdk/dashboard/services/dashboard-composer.service';
export * from '@dos/module-sdk/dashboard/services/dashboard-query.service';
export * from '@dos/module-sdk/dashboard/services/dashboard-widgets.service';
export * from '@dos/module-sdk/dashboard/services/dashboard-zones.service';
export * from '@dos/module-sdk/dashboard/services/widget-data.service';
// widget-insights: exclude getRiskHeatmapData, getMaturityRadarData, getFindingsBarData,
//   getEvidenceDonutData, getVendorBubbleData (in widget-data / agrc-os-dashboard)
export {
  getGrcTimeLoop, getImprovementIllusion, getSilentControls, getAuditDejavu,
  getRiskDenial, getOrgAmnesia, getKnowledgeInPeople, getDecisionTrace,
  getCulturalDrift, getControlAging, getLifecycleBottleneck, getZombieControls,
  getEvidenceRot, getAssessmentHonesty, getRiskGravity, getUntestedAssumptions,
  getFalseComfort, getOneSentenceTruth, getFutureYou, getIfNothingChanges,
  getRegulatorLens, getBoardReality, getReputationImpact, getRootCauseVsPatch,
  getChangeLeverage, getMomentumIndicator, getYearInGrc, getMaturityGap,
  getBreakingTheCycle, getPainMirror, getChartInsight
} from '@dos/module-sdk/dashboard/services/widget-insights.service';
export * from '@dos/module-sdk/dashboard/services/widget-permission.service';

// ── Qiyas ──
export * from '@dos/module-sdk/qiyas/services/qiyas-benchmark.service';

// ── AGRC-OS Engine (product-owned, Law 2) ──
export * from '@dos/module-sdk/agrc-engine/services/agrc-metrics.service';
export * from '@dos/module-sdk/agrc-engine/services/agrc-notification-bridge.service';
// agrc-os-dashboard: exclude getRiskHeatmapData, getMaturityRadarData, getFindingsBarData,
//   getEvidenceDonutData, getVendorBubbleData (in widget-data)
export {
  type RiskHeatmapCell, type ComplianceScore, type MaturityDimension,
  type FindingCategory, type EvidenceSlice, type VendorBubble as AgrcVendorBubble,
  type TopRisk, type TrendSeries, type ControlHealth,
  type IncidentStats, type PolicyCompliance, type EvidenceCoverage,
  type SystemOverview,
  getComplianceScoreData, getTopRisksData, getTrendLineData,
  getControlHealthData, getIncidentStatsData, getPolicyComplianceData,
  getSystemOverviewStats
} from '@dos/module-sdk/agrc-engine/services/agrc-os-dashboard.service';
export * from '@dos/module-sdk/agrc-engine/services/agrc-os-orchestrator.service';
export * from '@dos/module-sdk/agrc-engine/services/agrc-os-reporting.service';
// agrc-os-ui: exclude DashboardLayout, getDashboardLayout (in dashboard-composer)
export {
  type WorkspaceProfile, type DrawerZone, type DrawerTemplate,
  type ActionItemForDrawer, type DrawerPayload, type DashboardWidgetPlacement,
  getWorkspaceProfile, getDrawerTemplate, listActionItemsForDrawer,
  getDrawerPayload, seedWorkspaceProfileFromOnboarding
} from '@dos/module-sdk/agrc-engine/services/agrc-os-ui.service';
export * from '@dos/module-sdk/agrc-engine/services/agrc-os-integration.service';
export * from '@dos/module-sdk/agrc-engine/services/agrc-runbook.service';
export * from '@dos/module-sdk/agrc-engine/services/autonomous-grc-engine.service';
export * from '@dos/platform-core/events';
export * from '@dos/module-sdk/agrc-engine/services/grc-integrity-guard.service';
export * from '@dos/module-sdk/agrc-engine/services/grc-knowledge-graph.service';
export * from '@dos/module-sdk/agrc-engine/services/grc-query-engine.service';
// quick-grc-accelerator: exclude executeAction (in agent-action-executor)
export {
  type AcceleratorAction, type AcceleratorProgress, type ActionExecutionResult,
  getAcceleratorProgress, skipAction, resetProgress
} from '@dos/module-sdk/agrc-engine/services/quick-grc-accelerator.service';
export * from '@dos/module-sdk/agrc-engine/services/chart-grc-core.service';
export * from '@dos/module-sdk/agrc-engine/services/qiyas-grc-automation.processor';
