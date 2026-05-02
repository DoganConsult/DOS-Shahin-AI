import { Router } from 'express';
import * as path from 'path';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import incidentRouter from './incident.routes';
import {
  riskRoutes,
  riskWorkspaceRoutes,
  riskSmartRoutes,
  riskMetricsRoutes,
  riskScoringRoutes,
  riskTrendsRoutes,
  riskQuantificationRoutes,
  riskMonteCarloRoutes,
  riskPeerReviewRoutes,
  fairFinancialQuantificationRoutes,
  modelRiskRoutes,
  riskAdminRoutes,
  riskDiagnosticsRoutes,
  riskRegisterRoutes,
  riskReviewApprovalRoutes,
  scoreCalibrationRoutes,
  vulnerabilitiesRoutes,
} from '@dos/module-risk';

const risk_fair_financial_quantificationRouter = fairFinancialQuantificationRoutes;
const risk_model_riskRouter = modelRiskRoutes;
const risk_monte_carloRouter = riskMonteCarloRoutes;
const risk_risk_adminRouter = riskAdminRoutes;
const risk_risk_diagnosticsRouter = riskDiagnosticsRoutes;
const risk_risk_metricsRouter = riskMetricsRoutes;
const risk_risk_peer_reviewRouter = riskPeerReviewRoutes;
const risk_risk_quantificationRouter = riskQuantificationRoutes;
const risk_risk_registerRouter = riskRegisterRoutes;
const risk_risk_review_approvalRouter = riskReviewApprovalRoutes;
const risk_risk_scoringRouter = riskScoringRoutes;
const risk_risk_smartRouter = riskSmartRoutes;
const risk_risk_trendsRouter = riskTrendsRoutes;
const risk_risk_workspaceRouter = riskWorkspaceRoutes;
const risk_riskRouter = riskRoutes;
const risk_score_calibrationRouter = scoreCalibrationRoutes;
const risk_vulnerabilitiesRouter = vulnerabilitiesRoutes;
const risk_admin_risk_adminRouter = loadModuleRoute('risk/admin/risk-admin', path.resolve(__dirname, '../domain/risk/admin/risk-admin.routes'));
const incident_incident_adminRouter = loadModuleRoute('incident/incident-admin', '../../../modules/incident/dist/incident/routes/incident-admin.routes');
const incident_incident_advancedRouter = loadModuleRoute('incident/incident-advanced', '../../../modules/incident/dist/incident/routes/incident-advanced.routes');
const incident_incident_diagnosticsRouter = loadModuleRoute('incident/incident-diagnostics', '../../../modules/incident/dist/incident/routes/incident-diagnostics.routes');
const incident_incident_triageRouter = loadModuleRoute('incident/incident-triage', '../../../modules/incident/dist/incident/routes/incident-triage.routes');
const incident_incidentsRouter = loadModuleRoute('incident/incidents', '../../../modules/incident/dist/incident/routes/incidents.routes');
const incident_admin_incident_adminRouter = loadModuleRoute('incident/admin/incident-admin', '../../../modules/incident/dist/incident/admin/incident-admin.routes');
const bcp_bcm_advancedRouter = loadModuleRoute('bcp/bcm-advanced', '../../../modules/bcp/dist/bcp/routes/bcm-advanced.routes');
const bcp_bcm_crisisRouter = loadModuleRoute('bcp/bcm-crisis', '../../../modules/bcp/dist/bcp/routes/bcm-crisis.routes');
const bcp_bcm_findingsRouter = loadModuleRoute('bcp/bcm-findings', '../../../modules/bcp/dist/bcp/routes/bcm-findings.routes');
const bcp_bcm_metricsRouter = loadModuleRoute('bcp/bcm-metrics', '../../../modules/bcp/dist/bcp/routes/bcm-metrics.routes');
const bcp_bcp_adminRouter = loadModuleRoute('bcp/bcp-admin', '../../../modules/bcp/dist/bcp/routes/bcp-admin.routes');
const bcp_bcp_diagnosticsRouter = loadModuleRoute('bcp/bcp-diagnostics', '../../../modules/bcp/dist/bcp/routes/bcp-diagnostics.routes');
const bcp_bcpRouter = loadModuleRoute('bcp/bcp', '../../../modules/bcp/dist/bcp/routes/bcp.routes');
const bcp_business_servicesRouter = loadModuleRoute('bcp/business-services', '../../../modules/bcp/dist/bcp/routes/business-services.routes');
const bcp_admin_bcp_adminRouter = loadModuleRoute('bcp/admin/bcp-admin', '../../../modules/bcp/dist/bcp/admin/bcp-admin.routes');
const vendor_consultant_centerRouter = loadModuleRoute('vendor/consultant-center', '../../../modules/vendor/dist/vendor/routes/consultant-center.routes');
const vendor_vendor_adminRouter = loadModuleRoute('vendor/vendor-admin', '../../../modules/vendor/dist/vendor/routes/vendor-admin.routes');
const vendor_vendor_advancedRouter = loadModuleRoute('vendor/vendor-advanced', '../../../modules/vendor/dist/vendor/routes/vendor-advanced.routes');
const vendor_vendor_compliance_syncRouter = loadModuleRoute('vendor/vendor-compliance-sync', '../../../modules/vendor/dist/vendor/routes/vendor-compliance-sync.routes');
const vendor_vendor_cyber_ratingRouter = loadModuleRoute('vendor/vendor-cyber-rating', '../../../modules/vendor/dist/vendor/routes/vendor-cyber-rating.routes');
const vendor_vendor_dashboardRouter = loadModuleRoute('vendor/vendor-dashboard', '../../../modules/vendor/dist/vendor/routes/vendor-dashboard.routes');
const vendor_vendor_diagnosticsRouter = loadModuleRoute('vendor/vendor-diagnostics', '../../../modules/vendor/dist/vendor/routes/vendor-diagnostics.routes');
const vendor_vendor_engagementsRouter = loadModuleRoute('vendor/vendor-engagements', '../../../modules/vendor/dist/vendor/routes/vendor-engagements.routes');
const vendor_vendor_issuesRouter = loadModuleRoute('vendor/vendor-issues', '../../../modules/vendor/dist/vendor/routes/vendor-issues.routes');
const vendor_vendor_portalRouter = loadModuleRoute('vendor/vendor-portal', '../../../modules/vendor/dist/vendor/routes/vendor-portal.routes');
const vendor_vendor_reportsRouter = loadModuleRoute('vendor/vendor-reports', '../../../modules/vendor/dist/vendor/routes/vendor-reports.routes');
const vendor_vendor_risk_extRouter = loadModuleRoute('vendor/vendor-risk-ext', '../../../modules/vendor/dist/vendor/routes/vendor-risk-ext.routes');
const vendor_vendor_scoringRouter = loadModuleRoute('vendor/vendor-scoring', '../../../modules/vendor/dist/vendor/routes/vendor-scoring.routes');
const vendor_vendorsRouter = loadModuleRoute('vendor/vendors', '../../../modules/vendor/dist/vendor/routes/vendors.routes');
const vendor_admin_vendor_adminRouter = loadModuleRoute('vendor/admin/vendor-admin', '../../../modules/vendor/dist/vendor/admin/vendor-admin.routes');
const fitch_fitchRouter = loadModuleRoute('fitch/fitch', '../../../modules/fitch/dist/fitch/routes/fitch.routes');
const asset_asset_adminRouter = loadModuleRoute('asset/asset-admin', '../../../modules/asset/dist/asset/routes/asset-admin.routes');
const asset_asset_applicationsRouter = loadModuleRoute('asset/asset-applications', '../../../modules/asset/dist/asset/routes/asset-applications.routes');
const asset_asset_classificationRouter = loadModuleRoute('asset/asset-classification', '../../../modules/asset/dist/asset/routes/asset-classification.routes');
const asset_asset_criticalityRouter = loadModuleRoute('asset/asset-criticality', '../../../modules/asset/dist/asset/routes/asset-criticality.routes');
const asset_asset_dependenciesRouter = loadModuleRoute('asset/asset-dependencies', '../../../modules/asset/dist/asset/routes/asset-dependencies.routes');
const asset_asset_diagnosticsRouter = loadModuleRoute('asset/asset-diagnostics', '../../../modules/asset/dist/asset/routes/asset-diagnostics.routes');
const asset_asset_homeRouter = loadModuleRoute('asset/asset-home', '../../../modules/asset/dist/asset/routes/asset-home.routes');
const asset_asset_linkageRouter = loadModuleRoute('asset/asset-linkage', '../../../modules/asset/dist/asset/routes/asset-linkage.routes');
const asset_asset_ownershipRouter = loadModuleRoute('asset/asset-ownership', '../../../modules/asset/dist/asset/routes/asset-ownership.routes');
const asset_asset_reportsRouter = loadModuleRoute('asset/asset-reports', '../../../modules/asset/dist/asset/routes/asset-reports.routes');
const asset_asset_service_mapRouter = loadModuleRoute('asset/asset-service-map', '../../../modules/asset/dist/asset/routes/asset-service-map.routes');
const asset_asset_servicesRouter = loadModuleRoute('asset/asset-services', '../../../modules/asset/dist/asset/routes/asset-services.routes');
const asset_assetsRouter = loadModuleRoute('asset/assets', '../../../modules/asset/dist/asset/routes/assets.routes');
const asset_admin_asset_adminRouter = loadModuleRoute('asset/admin/asset-admin', '../../../modules/asset/dist/asset/admin/asset-admin.routes');
const remediation_autonomous_remediationRouter = loadModuleRoute('remediation/autonomous-remediation', '../../../modules/remediation/dist/remediation/routes/autonomous-remediation.routes');
const remediation_findingsRouter = loadModuleRoute('remediation/findings', '../../../modules/remediation/dist/remediation/routes/findings.routes');
const remediation_remediation_adminRouter = loadModuleRoute('remediation/remediation-admin', '../../../modules/remediation/dist/remediation/routes/remediation-admin.routes');
const remediation_remediation_diagnosticsRouter = loadModuleRoute('remediation/remediation-diagnostics', '../../../modules/remediation/dist/remediation/routes/remediation-diagnostics.routes');
const remediation_remediationRouter = loadModuleRoute('remediation/remediation', '../../../modules/remediation/dist/remediation/routes/remediation.routes');
const remediation_admin_remediation_adminRouter = loadModuleRoute('remediation/admin/remediation-admin', '../../../modules/remediation/dist/remediation/admin/remediation-admin.routes');
const action_action_adminRouter = loadModuleRoute('action/action-admin', '../../../modules/action/dist/action/routes/action-admin.routes');
const action_action_diagnosticsRouter = loadModuleRoute('action/action-diagnostics', '../../../modules/action/dist/action/routes/action-diagnostics.routes');
const action_action_itemRouter = loadModuleRoute('action/action-item', '../../../modules/action/dist/action/routes/action-item.routes');
const action_admin_action_adminRouter = loadModuleRoute('action/admin/action-admin', '../../../modules/action/dist/action/admin/action-admin.routes');
const issues_issues_adminRouter = loadModuleRoute('issues/issues-admin', '../../../modules/issues/dist/issues/routes/issues-admin.routes');
const issues_issues_diagnosticsRouter = loadModuleRoute('issues/issues-diagnostics', '../../../modules/issues/dist/issues/routes/issues-diagnostics.routes');
const issues_issuesRouter = loadModuleRoute('issues/issues', '../../../modules/issues/dist/issues/routes/issues.routes');
const issues_admin_issues_adminRouter = loadModuleRoute('issues/admin/issues-admin', '../../../modules/issues/dist/issues/admin/issues-admin.routes');
const playbooks_playbooksRouter = loadModuleRoute('playbooks/playbooks', '../../../modules/playbooks/dist/playbooks/routes/playbooks.routes');

export { risk_risk_workspaceRouter as riskWorkspaceRouter };
export { risk_risk_smartRouter as riskSmartRouter };
export { risk_risk_metricsRouter as riskMetricsRouter };
export { risk_risk_scoringRouter as riskScoringRouter };
export { risk_risk_trendsRouter as riskTrendsRouter };
export { risk_risk_quantificationRouter as riskQuantificationRouter };
export { risk_monte_carloRouter as riskMonteCarloRouter };
export { riskPeerReviewRoutes as riskPeerReviewTopLevelRouter };
// Phase 4 deeper (2026-04-30): top-level FE prefixes (/api/issues, /api/fitch)
// previously reachable only nested under /api/risk-incident. FE callers
// (issues-api.service.ts, fitch.service.ts) hit /api/issues + /api/fitch
// directly. Export the underlying routers so server.ts can mount at the
// canonical FE-expected paths.
export { issues_issuesRouter as issuesRouter };
export { fitch_fitchRouter as fitchRouter };

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'risk-incident-service', version: '0.1.0', modules: 10 });
});

routes.use('/risk', riskRoutes);
routes.use('/incident', incidentRouter);

routes.use('/risk/fair-financial-quantification', risk_fair_financial_quantificationRouter);
routes.use('/risk/model-risk', risk_model_riskRouter);
routes.use('/risk/monte-carlo', risk_monte_carloRouter);
routes.use('/risk/risk-admin', risk_risk_adminRouter);
routes.use('/risk/risk-diagnostics', risk_risk_diagnosticsRouter);
routes.use('/risk/risk-metrics', risk_risk_metricsRouter);
routes.use('/risk/risk-peer-review', risk_risk_peer_reviewRouter);
routes.use('/risk/risk-quantification', risk_risk_quantificationRouter);
routes.use('/risk/risk-register', risk_risk_registerRouter);
routes.use('/risk/risk-review-approval', risk_risk_review_approvalRouter);
routes.use('/risk/risk-scoring', risk_risk_scoringRouter);
routes.use('/risk/risk-smart', risk_risk_smartRouter);
routes.use('/risk/risk-trends', risk_risk_trendsRouter);
routes.use('/risk/risk-workspace', risk_risk_workspaceRouter);
routes.use('/risk/score-calibration', risk_score_calibrationRouter);
routes.use('/risk/vulnerabilities', risk_vulnerabilitiesRouter);
routes.use('/risk/admin', risk_admin_risk_adminRouter);
routes.use('/incident/incident-admin', incident_incident_adminRouter);
routes.use('/incident/incident-advanced', incident_incident_advancedRouter);
routes.use('/incident/incident-diagnostics', incident_incident_diagnosticsRouter);
routes.use('/incident/incident-triage', incident_incident_triageRouter);
routes.use('/incident', incident_incidentsRouter);
routes.use('/incident/admin', incident_admin_incident_adminRouter);
routes.use('/bcp/bcm-advanced', bcp_bcm_advancedRouter);
routes.use('/bcp/bcm-crisis', bcp_bcm_crisisRouter);
routes.use('/bcp/bcm-findings', bcp_bcm_findingsRouter);
routes.use('/bcp/bcm-metrics', bcp_bcm_metricsRouter);
routes.use('/bcp/bcp-admin', bcp_bcp_adminRouter);
routes.use('/bcp/bcp-diagnostics', bcp_bcp_diagnosticsRouter);
routes.use('/bcp', bcp_bcpRouter);
routes.use('/bcp/business-services', bcp_business_servicesRouter);
routes.use('/bcp/admin', bcp_admin_bcp_adminRouter);
routes.use('/vendor/consultant-center', vendor_consultant_centerRouter);
routes.use('/vendor/vendor-admin', vendor_vendor_adminRouter);
routes.use('/vendor/vendor-advanced', vendor_vendor_advancedRouter);
routes.use('/vendor/vendor-compliance-sync', vendor_vendor_compliance_syncRouter);
routes.use('/vendor/vendor-cyber-rating', vendor_vendor_cyber_ratingRouter);
routes.use('/vendor/vendor-dashboard', vendor_vendor_dashboardRouter);
routes.use('/vendor/vendor-diagnostics', vendor_vendor_diagnosticsRouter);
routes.use('/vendor/vendor-engagements', vendor_vendor_engagementsRouter);
routes.use('/vendor/vendor-issues', vendor_vendor_issuesRouter);
routes.use('/vendor/vendor-portal', vendor_vendor_portalRouter);
routes.use('/vendor/vendor-reports', vendor_vendor_reportsRouter);
routes.use('/vendor/vendor-risk-ext', vendor_vendor_risk_extRouter);
routes.use('/vendor/vendor-scoring', vendor_vendor_scoringRouter);
routes.use('/vendor', vendor_vendorsRouter);
routes.use('/vendor/admin', vendor_admin_vendor_adminRouter);
routes.use('/fitch', fitch_fitchRouter);
routes.use('/asset/asset-admin', asset_asset_adminRouter);
routes.use('/asset/asset-applications', asset_asset_applicationsRouter);
routes.use('/asset/asset-classification', asset_asset_classificationRouter);
routes.use('/asset/asset-criticality', asset_asset_criticalityRouter);
routes.use('/asset/asset-dependencies', asset_asset_dependenciesRouter);
routes.use('/asset/asset-diagnostics', asset_asset_diagnosticsRouter);
routes.use('/asset/asset-home', asset_asset_homeRouter);
routes.use('/asset/asset-linkage', asset_asset_linkageRouter);
routes.use('/asset/asset-ownership', asset_asset_ownershipRouter);
routes.use('/asset/asset-reports', asset_asset_reportsRouter);
routes.use('/asset/asset-service-map', asset_asset_service_mapRouter);
routes.use('/asset/asset-services', asset_asset_servicesRouter);
routes.use('/asset', asset_assetsRouter);
routes.use('/asset/admin', asset_admin_asset_adminRouter);
routes.use('/remediation/autonomous-remediation', remediation_autonomous_remediationRouter);
routes.use('/remediation/findings', remediation_findingsRouter);
routes.use('/remediation/remediation-admin', remediation_remediation_adminRouter);
routes.use('/remediation/remediation-diagnostics', remediation_remediation_diagnosticsRouter);
routes.use('/remediation', remediation_remediationRouter);
routes.use('/remediation/admin', remediation_admin_remediation_adminRouter);
routes.use('/action/action-admin', action_action_adminRouter);
routes.use('/action/action-diagnostics', action_action_diagnosticsRouter);
routes.use('/action/action-item', action_action_itemRouter);
routes.use('/action/admin', action_admin_action_adminRouter);
routes.use('/issues/issues-admin', issues_issues_adminRouter);
routes.use('/issues/issues-diagnostics', issues_issues_diagnosticsRouter);
routes.use('/issues', issues_issuesRouter);
routes.use('/issues/admin', issues_admin_issues_adminRouter);
routes.use('/playbooks', playbooks_playbooksRouter);
routes.use('/modules', modulesDiagnosticRouter());
