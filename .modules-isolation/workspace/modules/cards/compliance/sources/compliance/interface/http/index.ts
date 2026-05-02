import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import complianceRouter from './compliance.routes';
import controlRouter from './control.routes';
import assessmentTemplatesRouter from './assessment-templates.routes';
import objectsRouter from './objects.routes';
import complianceWsRouter from './compliance-ws.routes';

const compliance_compliance_adminRouter = loadModuleRoute('compliance/compliance/compliance-admin', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-admin.routes');
const compliance_compliance_advancedRouter = loadModuleRoute('compliance/compliance/compliance-advanced', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-advanced.routes');
const compliance_compliance_as_codeRouter = loadModuleRoute('compliance/compliance/compliance-as-code', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-as-code.routes');
const compliance_compliance_assertionsRouter = loadModuleRoute('compliance/compliance/compliance-assertions', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-assertions.routes');
const compliance_compliance_attestationRouter = loadModuleRoute('compliance/compliance/compliance-attestation', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-attestation.routes');
const compliance_compliance_driftRouter = loadModuleRoute('compliance/compliance/compliance-drift', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-drift.routes');
const compliance_compliance_extendedRouter = loadModuleRoute('compliance/compliance/compliance-extended', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-extended.routes');
const compliance_compliance_gapsRouter = loadModuleRoute('compliance/compliance/compliance-gaps', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-gaps.routes');
const compliance_compliance_workspaceRouter = loadModuleRoute('compliance/compliance/compliance-workspace', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance-workspace.routes');
const compliance_complianceRouter = loadModuleRoute('compliance/compliance/compliance', '../../../modules/compliance/dist/backend/compliance/routes/compliance/compliance.routes');
const compliance_compliance_diagnosticsRouter = loadModuleRoute('compliance/compliance-diagnostics', '../../../modules/compliance/dist/backend/compliance/routes/compliance-diagnostics.routes');
const compliance_compliance_obligationsRouter = loadModuleRoute('compliance/compliance-obligations', '../../../modules/compliance/dist/backend/compliance/routes/compliance-obligations.routes');
const compliance_control_lifecycleRouter = loadModuleRoute('compliance/control-lifecycle', '../../../modules/compliance/dist/backend/compliance/routes/control-lifecycle.routes');
const compliance_cws_assessments_auditRouter = loadModuleRoute('compliance/cws/cws-assessments-audit', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-assessments-audit.routes');
const compliance_cws_controls_findingsRouter = loadModuleRoute('compliance/cws/cws-controls-findings', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-controls-findings.routes');
const compliance_cws_frameworksRouter = loadModuleRoute('compliance/cws/cws-frameworks', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-frameworks.routes');
const compliance_cws_gaps_roadmapRouter = loadModuleRoute('compliance/cws/cws-gaps-roadmap', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-gaps-roadmap.routes');
const compliance_cws_overviewRouter = loadModuleRoute('compliance/cws/cws-overview', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-overview.routes');
const compliance_cws_posture_foundationRouter = loadModuleRoute('compliance/cws/cws-posture-foundation', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-posture-foundation.routes');
const compliance_cws_regulatoryRouter = loadModuleRoute('compliance/cws/cws-regulatory', '../../../modules/compliance/dist/backend/compliance/routes/cws/cws-regulatory.routes');
const compliance_ksa_cross_framework_mappingRouter = loadModuleRoute('compliance/ksa/ksa-cross-framework-mapping', '../../../modules/compliance/dist/backend/compliance/routes/ksa/ksa-cross-framework-mapping.routes');
const compliance_ksa_regulatory_changesRouter = loadModuleRoute('compliance/ksa/ksa-regulatory-changes', '../../../modules/compliance/dist/backend/compliance/routes/ksa/ksa-regulatory-changes.routes');
const compliance_ksa_regulatory_reportsRouter = loadModuleRoute('compliance/ksa/ksa-regulatory-reports', '../../../modules/compliance/dist/backend/compliance/routes/ksa/ksa-regulatory-reports.routes');
const compliance_ksa_sector_maturityRouter = loadModuleRoute('compliance/ksa/ksa-sector-maturity', '../../../modules/compliance/dist/backend/compliance/routes/ksa/ksa-sector-maturity.routes');
const compliance_continuous_attestationRouter = loadModuleRoute('compliance/misc/assessment/continuous-attestation', '../../../modules/compliance/dist/backend/compliance/routes/misc/assessment/continuous-attestation.routes');
const compliance_nca_assessmentRouter = loadModuleRoute('compliance/misc/assessment/nca-assessment', '../../../modules/compliance/dist/backend/compliance/routes/misc/assessment/nca-assessment.routes');
const compliance_nca_exportRouter = loadModuleRoute('compliance/misc/assessment/nca-export', '../../../modules/compliance/dist/backend/compliance/routes/misc/assessment/nca-export.routes');
const compliance_rcsaRouter = loadModuleRoute('compliance/misc/assessment/rcsa', '../../../modules/compliance/dist/backend/compliance/routes/misc/assessment/rcsa.routes');
const compliance_sama_assessmentRouter = loadModuleRoute('compliance/misc/assessment/sama-assessment', '../../../modules/compliance/dist/backend/compliance/routes/misc/assessment/sama-assessment.routes');
const compliance_ccm_cloudRouter = loadModuleRoute('compliance/misc/ccm-cloud', '../../../modules/compliance/dist/backend/compliance/routes/misc/ccm-cloud.routes');
const compliance_compensating_controlsRouter = loadModuleRoute('compliance/misc/compensating-controls', '../../../modules/compliance/dist/backend/compliance/routes/misc/compensating-controls.routes');
const compliance_continuous_attestation_1Router = loadModuleRoute('compliance/misc/continuous-attestation', '../../../modules/compliance/dist/backend/compliance/routes/misc/continuous-attestation.routes');
const compliance_control_process_cycleRouter = loadModuleRoute('compliance/misc/control-process-cycle', '../../../modules/compliance/dist/backend/compliance/routes/misc/control-process-cycle.routes');
const compliance_ccm_cloud_1Router = loadModuleRoute('compliance/misc/controls/ccm-cloud', '../../../modules/compliance/dist/backend/compliance/routes/misc/controls/ccm-cloud.routes');
const compliance_compensating_controls_1Router = loadModuleRoute('compliance/misc/controls/compensating-controls', '../../../modules/compliance/dist/backend/compliance/routes/misc/controls/compensating-controls.routes');
const compliance_control_process_cycle_1Router = loadModuleRoute('compliance/misc/controls/control-process-cycle', '../../../modules/compliance/dist/backend/compliance/routes/misc/controls/control-process-cycle.routes');
const compliance_controlsRouter = loadModuleRoute('compliance/misc/controls/controls', '../../../modules/compliance/dist/backend/compliance/routes/misc/controls/controls.routes');
const compliance_csaRouter = loadModuleRoute('compliance/misc/controls/csa', '../../../modules/compliance/dist/backend/compliance/routes/misc/controls/csa.routes');
const compliance_controls_1Router = loadModuleRoute('compliance/misc/controls', '../../../modules/compliance/dist/backend/compliance/routes/misc/controls.routes');
const compliance_csa_1Router = loadModuleRoute('compliance/misc/csa', '../../../modules/compliance/dist/backend/compliance/routes/misc/csa.routes');
const compliance_framework_harmonizationRouter = loadModuleRoute('compliance/misc/framework-harmonization', '../../../modules/compliance/dist/backend/compliance/routes/misc/framework-harmonization.routes');
const compliance_framework_mappingRouter = loadModuleRoute('compliance/misc/framework-mapping', '../../../modules/compliance/dist/backend/compliance/routes/misc/framework-mapping.routes');
const compliance_framework_harmonization_1Router = loadModuleRoute('compliance/misc/frameworks/framework-harmonization', '../../../modules/compliance/dist/backend/compliance/routes/misc/frameworks/framework-harmonization.routes');
const compliance_framework_mapping_1Router = loadModuleRoute('compliance/misc/frameworks/framework-mapping', '../../../modules/compliance/dist/backend/compliance/routes/misc/frameworks/framework-mapping.routes');
const compliance_frameworksRouter = loadModuleRoute('compliance/misc/frameworks/frameworks', '../../../modules/compliance/dist/backend/compliance/routes/misc/frameworks/frameworks.routes');
const compliance_ucfRouter = loadModuleRoute('compliance/misc/frameworks/ucf', '../../../modules/compliance/dist/backend/compliance/routes/misc/frameworks/ucf.routes');
const compliance_frameworks_1Router = loadModuleRoute('compliance/misc/frameworks', '../../../modules/compliance/dist/backend/compliance/routes/misc/frameworks.routes');
const compliance_jurisdictionRouter = loadModuleRoute('compliance/misc/jurisdiction', '../../../modules/compliance/dist/backend/compliance/routes/misc/jurisdiction.routes');
const compliance_knowledge_hubRouter = loadModuleRoute('compliance/misc/knowledge-hub', '../../../modules/compliance/dist/backend/compliance/routes/misc/knowledge-hub.routes');
const compliance_nca_assessment_1Router = loadModuleRoute('compliance/misc/nca-assessment', '../../../modules/compliance/dist/backend/compliance/routes/misc/nca-assessment.routes');
const compliance_nca_export_1Router = loadModuleRoute('compliance/misc/nca-export', '../../../modules/compliance/dist/backend/compliance/routes/misc/nca-export.routes');
const compliance_rcsa_1Router = loadModuleRoute('compliance/misc/rcsa', '../../../modules/compliance/dist/backend/compliance/routes/misc/rcsa.routes');
const compliance_jurisdiction_1Router = loadModuleRoute('compliance/misc/regulatory/jurisdiction', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory/jurisdiction.routes');
const compliance_knowledge_hub_1Router = loadModuleRoute('compliance/misc/regulatory/knowledge-hub', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory/knowledge-hub.routes');
const compliance_regulatory_contentRouter = loadModuleRoute('compliance/misc/regulatory/regulatory-content', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory/regulatory-content.routes');
const compliance_regulatory_deltaRouter = loadModuleRoute('compliance/misc/regulatory/regulatory-delta', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory/regulatory-delta.routes');
const compliance_requirement_normalizationRouter = loadModuleRoute('compliance/misc/regulatory/requirement-normalization', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory/requirement-normalization.routes');
const compliance_regulatory_content_1Router = loadModuleRoute('compliance/misc/regulatory-content', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory-content.routes');
const compliance_regulatory_delta_1Router = loadModuleRoute('compliance/misc/regulatory-delta', '../../../modules/compliance/dist/backend/compliance/routes/misc/regulatory-delta.routes');
const compliance_requirement_normalization_1Router = loadModuleRoute('compliance/misc/requirement-normalization', '../../../modules/compliance/dist/backend/compliance/routes/misc/requirement-normalization.routes');
const compliance_sama_assessment_1Router = loadModuleRoute('compliance/misc/sama-assessment', '../../../modules/compliance/dist/backend/compliance/routes/misc/sama-assessment.routes');
const compliance_saudi_regulatory_scoreRouter = loadModuleRoute('compliance/misc/saudi-regulatory-score', '../../../modules/compliance/dist/backend/compliance/routes/misc/saudi-regulatory-score.routes');
const compliance_saudi_regulatory_score_1Router = loadModuleRoute('compliance/misc/scoring/saudi-regulatory-score', '../../../modules/compliance/dist/backend/compliance/routes/misc/scoring/saudi-regulatory-score.routes');
const compliance_scoring_policiesRouter = loadModuleRoute('compliance/misc/scoring/scoring-policies', '../../../modules/compliance/dist/backend/compliance/routes/misc/scoring/scoring-policies.routes');
const compliance_scoring_policy_engineRouter = loadModuleRoute('compliance/misc/scoring/scoring-policy-engine', '../../../modules/compliance/dist/backend/compliance/routes/misc/scoring/scoring-policy-engine.routes');
const compliance_scoring_policies_1Router = loadModuleRoute('compliance/misc/scoring-policies', '../../../modules/compliance/dist/backend/compliance/routes/misc/scoring-policies.routes');
const compliance_scoring_policy_engine_1Router = loadModuleRoute('compliance/misc/scoring-policy-engine', '../../../modules/compliance/dist/backend/compliance/routes/misc/scoring-policy-engine.routes');
const compliance_ucf_1Router = loadModuleRoute('compliance/misc/ucf', '../../../modules/compliance/dist/backend/compliance/routes/misc/ucf.routes');
const compliance_regulator_heatmapRouter = loadModuleRoute('compliance/regulator/regulator-heatmap', '../../../modules/compliance/dist/backend/compliance/routes/regulator/regulator-heatmap.routes');
const compliance_regulator_portalRouter = loadModuleRoute('compliance/regulator/regulator-portal', '../../../modules/compliance/dist/backend/compliance/routes/regulator/regulator-portal.routes');
const compliance_regulator_registryRouter = loadModuleRoute('compliance/regulator/regulator-registry', '../../../modules/compliance/dist/backend/compliance/routes/regulator/regulator-registry.routes');
const compliance_admin_compliance_adminRouter = loadModuleRoute('compliance/admin/compliance-admin', '../../../modules/compliance/dist/backend/compliance/admin/compliance-admin.routes');
const controls_control_adminRouter = loadModuleRoute('controls/control-admin', '../../../modules/controls/dist/backend/controls/routes/control-admin.routes');
const controls_control_certificationRouter = loadModuleRoute('controls/control-certification', '../../../modules/controls/dist/backend/controls/routes/control-certification.routes');
const controls_control_deficiencyRouter = loadModuleRoute('controls/control-deficiency', '../../../modules/controls/dist/backend/controls/routes/control-deficiency.routes');
const controls_control_detailRouter = loadModuleRoute('controls/control-detail', '../../../modules/controls/dist/backend/controls/routes/control-detail.routes');
const controls_control_homeRouter = loadModuleRoute('controls/control-home', '../../../modules/controls/dist/backend/controls/routes/control-home.routes');
const controls_control_mappingRouter = loadModuleRoute('controls/control-mapping', '../../../modules/controls/dist/backend/controls/routes/control-mapping.routes');
const controls_control_monitoring_adminRouter = loadModuleRoute('controls/control-monitoring-admin', '../../../modules/controls/dist/backend/controls/routes/control-monitoring-admin.routes');
const controls_control_reportsRouter = loadModuleRoute('controls/control-reports', '../../../modules/controls/dist/backend/controls/routes/control-reports.routes');
const controls_control_work_queueRouter = loadModuleRoute('controls/control-work-queue', '../../../modules/controls/dist/backend/controls/routes/control-work-queue.routes');
const controls_control_workflowRouter = loadModuleRoute('controls/control-workflow', '../../../modules/controls/dist/backend/controls/routes/control-workflow.routes');
const controls_controls_diagnosticsRouter = loadModuleRoute('controls/controls-diagnostics', '../../../modules/controls/dist/backend/controls/routes/controls-diagnostics.routes');
const controls_admin_controls_adminRouter = loadModuleRoute('controls/admin/controls-admin', '../../../modules/controls/dist/backend/controls/admin/controls-admin.routes');
// ── Non-M4 modules removed from the compliance-controls-service aggregator ──
// exception, training, qiyas, dora, privacy, knowledge, local-knowledge,
// ksa-regulatory, benchmarks. These are out of M4 certification scope
// (M4 = compliance + controls only) and belong in their own service
// certifications. They are not mounted here; the FE must reach them via
// their respective gateway prefixes, not via /api/compliance-controls/*.
// See docs/certifications/M4-compliance-route-inventory.md for the full
// disabled-with-reason register.

export { 
  compliance_compliance_workspaceRouter as complianceWorkspaceRouter,
  controls_control_homeRouter as controlHomeRouter,
  controls_control_work_queueRouter as controlWorkQueueRouter,
  controls_control_detailRouter as controlDetailRouter,
  controls_control_certificationRouter as controlCertificationRouter,
  controls_control_deficiencyRouter as controlDeficiencyRouter,
  controls_control_reportsRouter as controlReportsRouter,
  controls_control_workflowRouter as controlWorkflowRouter,
  compliance_cws_controls_findingsRouter as complianceControlsFindingsRouter,
  compliance_control_lifecycleRouter as controlLifecycleRouter,
  compliance_nca_assessmentRouter as ncaAssessmentRouter,
  compliance_nca_exportRouter as ncaExportRouter,
  compliance_rcsaRouter as rcsaRouter,
  compliance_sama_assessmentRouter as samaAssessmentRouter,
  compliance_ksa_sector_maturityRouter as ksaSectorMaturityRouter,
  compliance_ksa_regulatory_changesRouter as ksaRegulatoryChangesRouter,
  compliance_ksa_regulatory_reportsRouter as ksaRegulatoryReportsRouter,
  compliance_ksa_cross_framework_mappingRouter as ksaCrossFrameworkMappingRouter,
  // Wave-2 M4: controls sub-routers for /api/controls/* frontend surface
  controls_control_adminRouter as controlAdminRouter,
  controls_control_mappingRouter as controlMappingRouter,
  controls_control_monitoring_adminRouter as controlMonitoringAdminRouter,
  controls_controls_diagnosticsRouter as controlDiagnosticsRouter,
  controls_admin_controls_adminRouter as controlsAdminRouter,
};

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'compliance-controls-service', version: '0.1.0', modules: 11 });
});

routes.use('/compliance', complianceRouter);
routes.use('/control', controlRouter);

// ── Sprint 1 / Track 2A: previously-unwired manifest routeBases ────────────
// /api/compliance-ws       — WS discovery descriptor (live-event channel)
// /api/mappings            — alias for /api/framework-mapping
// /api/objects             — generic compliance-object registry
// /api/assessment-templates — assessment-template library
routes.use('/compliance-ws', complianceWsRouter);
routes.use('/mappings', compliance_framework_mappingRouter);
routes.use('/objects', objectsRouter);
routes.use('/assessment-templates', assessmentTemplatesRouter);

routes.use('/compliance/compliance-admin', compliance_compliance_adminRouter);
routes.use('/compliance/compliance-advanced', compliance_compliance_advancedRouter);
routes.use('/compliance/compliance-as-code', compliance_compliance_as_codeRouter);
routes.use('/compliance/compliance-assertions', compliance_compliance_assertionsRouter);
routes.use('/compliance/compliance-attestation', compliance_compliance_attestationRouter);
routes.use('/compliance/compliance-drift', compliance_compliance_driftRouter);
routes.use('/compliance/compliance-extended', compliance_compliance_extendedRouter);
routes.use('/compliance/compliance-gaps', compliance_compliance_gapsRouter);
routes.use('/compliance/compliance-workspace', compliance_compliance_workspaceRouter);
routes.use('/compliance', compliance_complianceRouter);
routes.use('/compliance/compliance-diagnostics', compliance_compliance_diagnosticsRouter);
routes.use('/compliance/compliance-obligations', compliance_compliance_obligationsRouter);
routes.use('/compliance/control-lifecycle', compliance_control_lifecycleRouter);
routes.use('/compliance/cws-assessments-audit', compliance_cws_assessments_auditRouter);
routes.use('/compliance/cws-controls-findings', compliance_cws_controls_findingsRouter);
routes.use('/compliance/cws-frameworks', compliance_cws_frameworksRouter);
routes.use('/compliance/cws-gaps-roadmap', compliance_cws_gaps_roadmapRouter);
routes.use('/compliance/cws-overview', compliance_cws_overviewRouter);
routes.use('/compliance/cws-posture-foundation', compliance_cws_posture_foundationRouter);
routes.use('/compliance/cws-regulatory', compliance_cws_regulatoryRouter);
routes.use('/compliance/ksa-cross-framework-mapping', compliance_ksa_cross_framework_mappingRouter);
routes.use('/compliance/ksa-regulatory-changes', compliance_ksa_regulatory_changesRouter);
routes.use('/compliance/ksa-regulatory-reports', compliance_ksa_regulatory_reportsRouter);
routes.use('/compliance/ksa-sector-maturity', compliance_ksa_sector_maturityRouter);
routes.use('/compliance/continuous-attestation', compliance_continuous_attestationRouter);
routes.use('/compliance/nca-assessment', compliance_nca_assessmentRouter);
routes.use('/compliance/nca-export', compliance_nca_exportRouter);
routes.use('/compliance/rcsa', compliance_rcsaRouter);
routes.use('/compliance/sama-assessment', compliance_sama_assessmentRouter);
// Phase 10A dedup (audit §7.1): every /compliance/<name> is mounted EXACTLY
// once below. Previously two mounts coexisted per path — one pointing to
// the canonical nested file (e.g. misc/controls/controls.routes) and one
// pointing to the flat facade (misc/controls.routes) which re-exports
// the canonical. After the Phase 10A facade repair (adding `export { default }
// from '<canonical>'`) both mounts resolved to the same Router, so keeping
// both was redundant and obscured collision analysis. The canonical nested
// router is kept; the flat `_1Router` mounts are dropped.
routes.use('/compliance/ccm-cloud', compliance_ccm_cloudRouter);
routes.use('/compliance/compensating-controls', compliance_compensating_controlsRouter);
// /compliance/continuous-attestation already mounted above (line 134) via
// the assessment/continuous-attestation canonical router; do not re-mount.
routes.use('/compliance/control-process-cycle', compliance_control_process_cycleRouter);
routes.use('/compliance/controls', compliance_controlsRouter);
routes.use('/compliance/csa', compliance_csaRouter);
routes.use('/compliance/framework-harmonization', compliance_framework_harmonization_1Router);
routes.use('/compliance/framework-mapping', compliance_framework_mapping_1Router);
routes.use('/compliance/frameworks', compliance_frameworksRouter);
routes.use('/compliance/ucf', compliance_ucfRouter);
routes.use('/compliance/jurisdiction', compliance_jurisdiction_1Router);
routes.use('/compliance/knowledge-hub', compliance_knowledge_hub_1Router);
// /compliance/nca-assessment, /compliance/nca-export, /compliance/rcsa,
// /compliance/sama-assessment already mounted above (lines 135-138) via
// their assessment/* canonical routers; do not re-mount.
routes.use('/compliance/regulatory-content', compliance_regulatory_contentRouter);
routes.use('/compliance/regulatory-delta', compliance_regulatory_deltaRouter);
routes.use('/compliance/requirement-normalization', compliance_requirement_normalizationRouter);
routes.use('/compliance/saudi-regulatory-score', compliance_saudi_regulatory_scoreRouter);
routes.use('/compliance/scoring-policies', compliance_scoring_policiesRouter);
routes.use('/compliance/scoring-policy-engine', compliance_scoring_policy_engineRouter);
routes.use('/compliance/regulator-heatmap', compliance_regulator_heatmapRouter);
routes.use('/compliance/regulator-portal', compliance_regulator_portalRouter);
routes.use('/compliance/regulator-registry', compliance_regulator_registryRouter);
routes.use('/compliance/admin', compliance_admin_compliance_adminRouter);
routes.use('/controls/control-admin', controls_control_adminRouter);
routes.use('/controls/control-certification', controls_control_certificationRouter);
routes.use('/controls/control-deficiency', controls_control_deficiencyRouter);
routes.use('/controls/control-detail', controls_control_detailRouter);
routes.use('/controls/control-home', controls_control_homeRouter);
routes.use('/controls/control-mapping', controls_control_mappingRouter);
routes.use('/controls/control-monitoring-admin', controls_control_monitoring_adminRouter);
routes.use('/controls/control-reports', controls_control_reportsRouter);
routes.use('/controls/control-work-queue', controls_control_work_queueRouter);
routes.use('/controls/control-workflow', controls_control_workflowRouter);
routes.use('/controls/controls-diagnostics', controls_controls_diagnosticsRouter);
routes.use('/controls/admin', controls_admin_controls_adminRouter);
// Non-M4 mounts (/exception, /training, /qiyas, /dora, /privacy,
// /knowledge, /local-knowledge, /ksa-regulatory, /benchmarks) are
// removed. See comment above the const-declaration block for rationale.
routes.use('/modules', modulesDiagnosticRouter());
