#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SERVICES_DIR = path.resolve('services');

const SERVICE_SPECS = [
  {
    name: 'risk-incident-service',
    entities: [
      { name: 'risk', varName: 'risk', table: 'dos.risks', idCol: 'risk_id', requiredFields: ['title', 'category'], domain: 'risk', publishPrefix: 'Risk' },
      { name: 'incident', varName: 'incident', table: 'dos.incidents', idCol: 'incident_id', requiredFields: ['title', 'severity'], domain: 'incident', publishPrefix: 'Incident' },
    ],
    consumes: [
      { event: 'compliance.control.failed', action: 'createRiskFromComplianceFailure', targetEntity: 'risk', description: 'Auto-create risk when compliance control fails' },
      { event: 'asset.vulnerability.detected', action: 'createIncidentFromVulnerability', targetEntity: 'incident', description: 'Auto-create incident when asset vulnerability detected' },
      { event: 'vendor.risk.elevated', action: 'createRiskFromVendorElevation', targetEntity: 'risk', description: 'Auto-create risk when vendor risk is elevated' },
    ],
    publisherFns: ['publishRiskCreated', 'publishRiskUpdated', 'publishRiskMitigated', 'publishIncidentCreated', 'publishIncidentResolved', 'publishIncidentEscalated'],
    routePublishMap: {
      risk: { create: 'publishRiskCreated', update: 'publishRiskUpdated', delete: null },
      incident: { create: 'publishIncidentCreated', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'compliance-controls-service',
    entities: [
      { name: 'compliance', varName: 'compliance', table: 'dos.compliance_requirements', idCol: 'requirement_id', requiredFields: ['framework_name', 'title'], domain: 'compliance', publishPrefix: 'Compliance' },
      { name: 'control', varName: 'control', table: 'dos.controls', idCol: 'control_id', requiredFields: ['control_ref', 'title'], domain: 'control', publishPrefix: 'Control' },
    ],
    consumes: [
      { event: 'audit.finding.created', action: 'reassessControlFromFinding', targetEntity: 'control', description: 'Reassess control effectiveness when audit finding created' },
      { event: 'risk.created', action: 'reassessComplianceFromRisk', targetEntity: 'compliance', description: 'Reassess compliance status when new risk identified' },
      { event: 'evidence.submitted', action: 'updateComplianceEvidence', targetEntity: 'compliance', description: 'Update compliance evidence status when evidence submitted' },
    ],
    publisherFns: ['publishComplianceAssessed', 'publishComplianceGapIdentified', 'publishControlTested', 'publishControlEffectivenessChanged'],
    routePublishMap: {
      compliance: { create: 'publishComplianceAssessed', update: 'publishComplianceAssessed', delete: null },
      control: { create: 'publishControlTested', update: 'publishControlEffectivenessChanged', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'evidence-audit-reporting-service',
    entities: [
      { name: 'evidence', varName: 'evidence', table: 'dos.evidence', idCol: 'evidence_id', requiredFields: ['title', 'type'], domain: 'evidence', publishPrefix: 'Evidence' },
      { name: 'finding', varName: 'finding', table: 'dos.audit_findings', idCol: 'finding_id', requiredFields: ['title', 'severity'], domain: 'finding', publishPrefix: 'AuditFinding' },
    ],
    consumes: [
      { event: 'compliance.assessed', action: 'createFindingFromAssessment', targetEntity: 'finding', description: 'Create audit finding when compliance gap detected in assessment' },
      { event: 'control.tested', action: 'updateEvidenceValidity', targetEntity: 'evidence', description: 'Update evidence validity when control is tested' },
      { event: 'risk.mitigated', action: 'resolveFindingsForRisk', targetEntity: 'finding', description: 'Resolve related findings when risk is mitigated' },
    ],
    publisherFns: ['publishEvidenceSubmitted', 'publishEvidenceApproved', 'publishEvidenceRejected', 'publishAuditFindingCreated', 'publishAuditFindingResolved'],
    routePublishMap: {
      evidence: { create: 'publishEvidenceSubmitted', update: null, delete: null },
      finding: { create: 'publishAuditFindingCreated', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'governance-policy-service',
    entities: [
      { name: 'policy', varName: 'policy', table: 'dos.policies', idCol: 'policy_id', requiredFields: ['title', 'category'], domain: 'policy', publishPrefix: 'Policy' },
    ],
    consumes: [
      { event: 'compliance.gap.identified', action: 'flagPolicyForReview', targetEntity: 'policy', description: 'Flag related policies for review when compliance gap identified' },
      { event: 'audit.finding.created', action: 'triggerPolicyReview', targetEntity: 'policy', description: 'Trigger policy review when audit finding created' },
    ],
    publisherFns: ['publishPolicyCreated', 'publishPolicyPublished', 'publishPolicyReviewed', 'publishPolicyRetired'],
    routePublishMap: {
      policy: { create: 'publishPolicyCreated', update: 'publishPolicyReviewed', delete: 'publishPolicyRetired' },
    },
    crossServiceCalls: [],
  },
  {
    name: 'asset-service',
    entities: [
      { name: 'asset', varName: 'asset', table: 'dos.assets', idCol: 'asset_id', requiredFields: ['name', 'type'], domain: 'asset', publishPrefix: 'Asset' },
    ],
    consumes: [
      { event: 'risk.created', action: 'updateAssetRiskProfile', targetEntity: 'asset', description: 'Update asset risk profile when new risk created' },
      { event: 'incident.created', action: 'linkIncidentToAssets', targetEntity: 'asset', description: 'Link incident to affected assets' },
      { event: 'vendor.assessment.completed', action: 'updateAssetVendorStatus', targetEntity: 'asset', description: 'Update asset vendor status after vendor assessment' },
    ],
    publisherFns: ['publishAssetCreated', 'publishAssetUpdated', 'publishAssetDecommissioned', 'publishAssetVulnerabilityDetected'],
    routePublishMap: {
      asset: { create: 'publishAssetCreated', update: 'publishAssetUpdated', delete: 'publishAssetDecommissioned' },
    },
    crossServiceCalls: [],
  },
  {
    name: 'bcp-service',
    entities: [
      { name: 'bcp-plan', varName: 'bcpPlan', table: 'dos.bcp_plans', idCol: 'plan_id', requiredFields: ['title', 'type'], domain: 'bcp', publishPrefix: 'BcpPlan' },
    ],
    consumes: [
      { event: 'incident.created', action: 'assessBcpReadiness', targetEntity: 'bcp-plan', description: 'Assess BCP readiness when incident created' },
      { event: 'incident.escalated', action: 'activateRelatedPlans', targetEntity: 'bcp-plan', description: 'Activate related BCP plans when incident escalated' },
      { event: 'risk.mitigated', action: 'reviewBcpPostMitigation', targetEntity: 'bcp-plan', description: 'Review BCP plans after risk mitigation' },
    ],
    publisherFns: ['publishBcpPlanCreated', 'publishBcpPlanActivated', 'publishBcpExerciseCompleted', 'publishBcpPlanReviewed'],
    routePublishMap: {
      'bcp-plan': { create: 'publishBcpPlanCreated', update: 'publishBcpPlanReviewed', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'dora-service',
    entities: [
      { name: 'dora-assessment', varName: 'doraAssessment', table: 'dos.dora_assessments', idCol: 'assessment_id', requiredFields: ['title', 'pillar'], domain: 'dora', publishPrefix: 'DoraAssessment' },
    ],
    consumes: [
      { event: 'incident.created', action: 'flagDoraAssessment', targetEntity: 'dora-assessment', description: 'Flag DORA assessment when ICT incident created' },
      { event: 'vendor.risk.elevated', action: 'triggerIctRiskReview', targetEntity: 'dora-assessment', description: 'Trigger ICT risk review when vendor risk elevated' },
      { event: 'compliance.assessed', action: 'updateDoraCompliance', targetEntity: 'dora-assessment', description: 'Update DORA compliance status after compliance assessment' },
    ],
    publisherFns: ['publishDoraAssessmentCreated', 'publishDoraAssessmentCompleted', 'publishDoraIctRiskIdentified'],
    routePublishMap: {
      'dora-assessment': { create: 'publishDoraAssessmentCreated', update: 'publishDoraAssessmentCompleted', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'vendor-service',
    entities: [
      { name: 'vendor', varName: 'vendor', table: 'dos.vendors', idCol: 'vendor_id', requiredFields: ['name', 'category'], domain: 'vendor', publishPrefix: 'Vendor' },
    ],
    consumes: [
      { event: 'compliance.assessed', action: 'updateVendorCompliance', targetEntity: 'vendor', description: 'Update vendor compliance status after assessment' },
      { event: 'incident.created', action: 'checkVendorInvolvement', targetEntity: 'vendor', description: 'Check vendor involvement in incidents' },
      { event: 'asset.vulnerability.detected', action: 'assessVendorImpact', targetEntity: 'vendor', description: 'Assess vendor impact from asset vulnerability' },
    ],
    publisherFns: ['publishVendorCreated', 'publishVendorAssessmentCompleted', 'publishVendorRiskElevated', 'publishVendorContractExpiring'],
    routePublishMap: {
      vendor: { create: 'publishVendorCreated', update: 'publishVendorAssessmentCompleted', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'privacy-service',
    entities: [
      { name: 'privacy-assessment', varName: 'privacyAssessment', table: 'dos.privacy_assessments', idCol: 'assessment_id', requiredFields: ['title', 'type'], domain: 'privacy', publishPrefix: 'PrivacyAssessment' },
    ],
    consumes: [
      { event: 'compliance.assessed', action: 'updatePrivacyCompliance', targetEntity: 'privacy-assessment', description: 'Update privacy compliance after assessment' },
      { event: 'incident.created', action: 'checkPrivacyBreach', targetEntity: 'privacy-assessment', description: 'Check for privacy breach when incident created' },
      { event: 'asset.created', action: 'triggerDpiaForDataAsset', targetEntity: 'privacy-assessment', description: 'Trigger DPIA when new data-processing asset created' },
    ],
    publisherFns: ['publishPrivacyAssessmentCreated', 'publishPrivacyDpiaCompleted', 'publishPrivacyBreachDetected', 'publishPrivacyConsentUpdated'],
    routePublishMap: {
      'privacy-assessment': { create: 'publishPrivacyAssessmentCreated', update: 'publishPrivacyDpiaCompleted', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'training-service',
    entities: [
      { name: 'training-program', varName: 'trainingProgram', table: 'dos.training_programs', idCol: 'program_id', requiredFields: ['title', 'category'], domain: 'training', publishPrefix: 'Training' },
    ],
    consumes: [
      { event: 'user.created', action: 'assignMandatoryTraining', targetEntity: 'training-program', description: 'Assign mandatory training to new users' },
      { event: 'compliance.gap.identified', action: 'assignRemediationTraining', targetEntity: 'training-program', description: 'Assign remediation training when compliance gap identified' },
      { event: 'policy.published', action: 'assignPolicyTraining', targetEntity: 'training-program', description: 'Assign policy training when new policy published' },
    ],
    publisherFns: ['publishTrainingAssigned', 'publishTrainingCompleted', 'publishTrainingOverdue', 'publishTrainingCertificateIssued'],
    routePublishMap: {
      'training-program': { create: 'publishTrainingAssigned', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'qiyas-journey-service',
    entities: [
      { name: 'maturity-assessment', varName: 'maturityAssessment', table: 'dos.maturity_assessments', idCol: 'assessment_id', requiredFields: ['title', 'framework'], domain: 'qiyas', publishPrefix: 'Qiyas' },
    ],
    consumes: [
      { event: 'compliance.assessed', action: 'updateMaturityFromCompliance', targetEntity: 'maturity-assessment', description: 'Update maturity score from compliance assessment' },
      { event: 'control.tested', action: 'reassessMaturityLevel', targetEntity: 'maturity-assessment', description: 'Reassess maturity level after control test' },
      { event: 'risk.mitigated', action: 'updateMaturityPostMitigation', targetEntity: 'maturity-assessment', description: 'Update maturity score after risk mitigation' },
    ],
    publisherFns: ['publishQiyasAssessmentCreated', 'publishQiyasLevelChanged', 'publishQiyasRoadmapUpdated'],
    routePublishMap: {
      'maturity-assessment': { create: 'publishQiyasAssessmentCreated', update: 'publishQiyasLevelChanged', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'records-service',
    entities: [
      { name: 'record', varName: 'record', table: 'dos.records', idCol: 'record_id', requiredFields: ['title', 'type'], domain: 'record', publishPrefix: 'Record' },
    ],
    consumes: [
      { event: 'evidence.submitted', action: 'createRecordFromEvidence', targetEntity: 'record', description: 'Auto-create record when evidence submitted' },
      { event: 'policy.published', action: 'archivePreviousPolicyVersion', targetEntity: 'record', description: 'Archive previous policy version when new one published' },
      { event: 'audit.finding.created', action: 'createRecordFromFinding', targetEntity: 'record', description: 'Create compliance record from audit finding' },
    ],
    publisherFns: ['publishRecordCreated', 'publishRecordArchived', 'publishRecordRetentionExpiring'],
    routePublishMap: {
      record: { create: 'publishRecordCreated', update: null, delete: 'publishRecordArchived' },
    },
    crossServiceCalls: [],
  },
  {
    name: 'remediation-action-service',
    entities: [
      { name: 'remediation', varName: 'remediation', table: 'dos.remediations', idCol: 'remediation_id', requiredFields: ['title', 'priority'], domain: 'remediation', publishPrefix: 'Remediation' },
      { name: 'action-item', varName: 'actionItem', table: 'dos.action_items', idCol: 'action_id', requiredFields: ['title', 'priority'], domain: 'action', publishPrefix: 'Action' },
    ],
    consumes: [
      { event: 'audit.finding.created', action: 'createRemediationFromFinding', targetEntity: 'remediation', description: 'Auto-create remediation plan from audit finding' },
      { event: 'risk.created', action: 'createActionFromRisk', targetEntity: 'action-item', description: 'Auto-create action item from new risk' },
      { event: 'compliance.gap.identified', action: 'createRemediationFromGap', targetEntity: 'remediation', description: 'Create remediation plan from compliance gap' },
      { event: 'incident.created', action: 'createRemediationFromIncident', targetEntity: 'remediation', description: 'Create remediation plan from incident' },
    ],
    publisherFns: ['publishRemediationCreated', 'publishRemediationCompleted', 'publishActionCreated', 'publishActionCompleted', 'publishActionOverdue'],
    routePublishMap: {
      remediation: { create: 'publishRemediationCreated', update: null, delete: null },
      'action-item': { create: 'publishActionCreated', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'analytics-service',
    entities: [
      { name: 'dashboard', varName: 'dashboard', table: 'dos.dashboards', idCol: 'dashboard_id', requiredFields: ['title', 'type'], domain: 'analytics', publishPrefix: 'Analytics' },
    ],
    consumes: [
      { event: 'risk.updated', action: 'refreshRiskDashboards', targetEntity: 'dashboard', description: 'Refresh risk dashboards when risk updated' },
      { event: 'compliance.assessed', action: 'refreshComplianceDashboards', targetEntity: 'dashboard', description: 'Refresh compliance dashboards after assessment' },
      { event: 'incident.created', action: 'checkKpiThresholds', targetEntity: 'dashboard', description: 'Check KPI thresholds when incident created' },
    ],
    publisherFns: ['publishAnalyticsDashboardCreated', 'publishAnalyticsKpiThresholdBreached'],
    routePublishMap: {
      dashboard: { create: 'publishAnalyticsDashboardCreated', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'analytics-reporting-service',
    entities: [
      { name: 'report-schedule', varName: 'reportSchedule', table: 'dos.report_schedules', idCol: 'schedule_id', requiredFields: ['report_type', 'title', 'frequency'], domain: 'reporting', publishPrefix: 'Reporting' },
    ],
    consumes: [
      { event: 'compliance.assessed', action: 'triggerComplianceReports', targetEntity: 'report-schedule', description: 'Trigger compliance report generation after assessment' },
      { event: 'risk.updated', action: 'triggerRiskReports', targetEntity: 'report-schedule', description: 'Trigger risk report generation on risk update' },
      { event: 'audit.finding.created', action: 'triggerAuditReports', targetEntity: 'report-schedule', description: 'Trigger audit report generation on finding' },
      { event: 'incident.resolved', action: 'triggerIncidentReports', targetEntity: 'report-schedule', description: 'Trigger incident report after resolution' },
    ],
    publisherFns: ['publishReportingReportGenerated', 'publishReportingReportDistributed', 'publishReportingScheduleTriggered'],
    routePublishMap: {
      'report-schedule': { create: 'publishReportingScheduleTriggered', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'dashboard-widgets-service',
    entities: [
      { name: 'widget', varName: 'widget', table: 'dos.widgets', idCol: 'widget_id', requiredFields: ['title', 'type', 'data_source'], domain: 'widget', publishPrefix: 'Widget' },
    ],
    consumes: [
      { event: 'analytics.dashboard.created', action: 'provisionDefaultWidgets', targetEntity: 'widget', description: 'Provision default widgets for new dashboard' },
      { event: 'risk.updated', action: 'refreshRiskWidgets', targetEntity: 'widget', description: 'Refresh risk-related widgets' },
      { event: 'compliance.assessed', action: 'refreshComplianceWidgets', targetEntity: 'widget', description: 'Refresh compliance-related widgets' },
    ],
    publisherFns: ['publishWidgetCreated', 'publishWidgetUpdated', 'publishWidgetDataRefreshed'],
    routePublishMap: {
      widget: { create: 'publishWidgetCreated', update: 'publishWidgetUpdated', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'executive-intelligence-service',
    entities: [
      { name: 'briefing', varName: 'briefing', table: 'dos.executive_briefings', idCol: 'briefing_id', requiredFields: ['title', 'type'], domain: 'executive', publishPrefix: 'Executive' },
    ],
    consumes: [
      { event: 'risk.updated', action: 'updateBriefingRiskPosture', targetEntity: 'briefing', description: 'Update briefing risk posture on risk change' },
      { event: 'compliance.assessed', action: 'updateBriefingCompliance', targetEntity: 'briefing', description: 'Update briefing compliance score after assessment' },
      { event: 'incident.created', action: 'createExecutiveAlert', targetEntity: 'briefing', description: 'Create executive alert for critical incidents' },
      { event: 'analytics.kpi.threshold.breached', action: 'createKpiAlert', targetEntity: 'briefing', description: 'Create executive alert on KPI threshold breach' },
    ],
    publisherFns: ['publishExecutiveBriefingCreated', 'publishExecutiveBriefingDistributed', 'publishExecutiveAlertTriggered'],
    routePublishMap: {
      briefing: { create: 'publishExecutiveBriefingCreated', update: 'publishExecutiveBriefingDistributed', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'integrations-service',
    entities: [
      { name: 'integration', varName: 'integration', table: 'dos.integrations', idCol: 'integration_id', requiredFields: ['name', 'type', 'provider'], domain: 'integration', publishPrefix: 'Integration' },
    ],
    consumes: [
      { event: 'tenant.created', action: 'provisionDefaultIntegrations', targetEntity: 'integration', description: 'Provision default integrations for new tenant' },
      { event: 'asset.created', action: 'triggerAssetSync', targetEntity: 'integration', description: 'Trigger asset sync to connected integrations' },
      { event: 'vendor.created', action: 'triggerVendorSync', targetEntity: 'integration', description: 'Trigger vendor sync to connected integrations' },
    ],
    publisherFns: ['publishIntegrationConnected', 'publishIntegrationSyncCompleted', 'publishIntegrationSyncFailed', 'publishIntegrationDisconnected'],
    routePublishMap: {
      integration: { create: 'publishIntegrationConnected', update: null, delete: 'publishIntegrationDisconnected' },
    },
    crossServiceCalls: [],
  },
  {
    name: 'notification-inbox-service',
    entities: [
      { name: 'inbox-item', varName: 'inboxItem', table: 'dos.notification_inbox', idCol: 'item_id', requiredFields: ['title', 'type', 'user_id'], domain: 'inbox', publishPrefix: 'InboxItem' },
    ],
    consumes: [
      { event: 'notification.sent', action: 'createInboxFromNotification', targetEntity: 'inbox-item', description: 'Create inbox item when notification sent' },
      { event: 'workflow.task.assigned', action: 'createInboxFromTask', targetEntity: 'inbox-item', description: 'Create inbox item when workflow task assigned' },
      { event: 'incident.created', action: 'createInboxFromIncident', targetEntity: 'inbox-item', description: 'Create inbox item for incident notification' },
      { event: 'action.overdue', action: 'createInboxFromOverdueAction', targetEntity: 'inbox-item', description: 'Create inbox item for overdue action notification' },
    ],
    publisherFns: ['publishInboxItemRead', 'publishInboxItemDismissed', 'publishInboxItemActioned'],
    routePublishMap: {
      'inbox-item': { create: null, update: 'publishInboxItemActioned', delete: 'publishInboxItemDismissed' },
    },
    crossServiceCalls: [],
  },
  {
    name: 'portals-service',
    entities: [
      { name: 'portal', varName: 'portal', table: 'dos.portals', idCol: 'portal_id', requiredFields: ['name', 'type'], domain: 'portal', publishPrefix: 'Portal' },
    ],
    consumes: [
      { event: 'vendor.created', action: 'provisionVendorPortalAccess', targetEntity: 'portal', description: 'Provision vendor portal access for new vendor' },
      { event: 'vendor.assessment.completed', action: 'updatePortalAssessmentStatus', targetEntity: 'portal', description: 'Update portal assessment status after vendor assessment' },
      { event: 'compliance.assessed', action: 'updatePortalComplianceStatus', targetEntity: 'portal', description: 'Update portal compliance status after assessment' },
    ],
    publisherFns: ['publishPortalCreated', 'publishPortalAccessGranted', 'publishPortalSubmissionReceived'],
    routePublishMap: {
      portal: { create: 'publishPortalCreated', update: null, delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'onboarding-service',
    entities: [
      { name: 'onboarding-journey', varName: 'onboardingJourney', table: 'dos.onboarding_journeys', idCol: 'journey_id', requiredFields: ['type', 'user_id'], domain: 'onboarding', publishPrefix: 'Onboarding' },
    ],
    consumes: [
      { event: 'tenant.created', action: 'startTenantOnboarding', targetEntity: 'onboarding-journey', description: 'Start tenant onboarding journey when tenant created' },
      { event: 'user.created', action: 'startUserOnboarding', targetEntity: 'onboarding-journey', description: 'Start user onboarding journey when user created' },
      { event: 'training.completed', action: 'advanceOnboardingStep', targetEntity: 'onboarding-journey', description: 'Advance onboarding step when training completed' },
    ],
    publisherFns: ['publishOnboardingStarted', 'publishOnboardingStepCompleted', 'publishOnboardingCompleted'],
    routePublishMap: {
      'onboarding-journey': { create: 'publishOnboardingStarted', update: 'publishOnboardingStepCompleted', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'platform-product-service',
    entities: [
      { name: 'product-license', varName: 'productLicense', table: 'dos.product_licenses', idCol: 'license_id', requiredFields: ['product_code', 'plan'], domain: 'product', publishPrefix: 'ProductLicense' },
    ],
    consumes: [
      { event: 'tenant.created', action: 'provisionDefaultLicense', targetEntity: 'product-license', description: 'Provision default license for new tenant' },
      { event: 'tenant.updated', action: 'syncLicenseWithTenant', targetEntity: 'product-license', description: 'Sync license when tenant settings updated' },
    ],
    publisherFns: ['publishProductLicenseActivated', 'publishProductLicenseUpgraded', 'publishProductLicenseExpiring'],
    routePublishMap: {
      'product-license': { create: 'publishProductLicenseActivated', update: 'publishProductLicenseUpgraded', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'agrc-os-service',
    entities: [
      { name: 'agrc-task', varName: 'agrcTask', table: 'dos.agrc_tasks', idCol: 'task_id', requiredFields: ['title', 'type'], domain: 'agrc', publishPrefix: 'AgrcTask' },
    ],
    consumes: [
      { event: 'workflow.task.assigned', action: 'createAgrcFromWorkflow', targetEntity: 'agrc-task', description: 'Create AI GRC task from workflow task assignment' },
      { event: 'incident.created', action: 'createInvestigationTask', targetEntity: 'agrc-task', description: 'Create AI investigation task for incident' },
      { event: 'compliance.gap.identified', action: 'createComplianceTask', targetEntity: 'agrc-task', description: 'Create AI compliance remediation task' },
    ],
    publisherFns: ['publishAgrcTaskCreated', 'publishAgrcTaskCompleted', 'publishAgrcAgentInvoked'],
    routePublishMap: {
      'agrc-task': { create: 'publishAgrcTaskCreated', update: 'publishAgrcTaskCompleted', delete: null },
    },
    crossServiceCalls: [],
  },
  {
    name: 'platform-core-service',
    entities: [
      { name: 'mobile-session', varName: 'mobileSession', table: 'dos.mobile_sessions', idCol: 'session_id', requiredFields: ['user_id', 'device_type'], domain: 'mobile', publishPrefix: 'MobileSession' },
    ],
    consumes: [
      { event: 'user.created', action: 'prepareUserMobileAccess', targetEntity: 'mobile-session', description: 'Prepare mobile access configuration for new user' },
      { event: 'notification.sent', action: 'pushToActiveSessions', targetEntity: 'mobile-session', description: 'Push notification to active mobile sessions' },
      { event: 'tenant.settings.changed', action: 'updateSessionConfig', targetEntity: 'mobile-session', description: 'Update mobile session config when tenant settings change' },
    ],
    publisherFns: ['publishMobileSessionStarted', 'publishMobileSessionEnded', 'publishMobilePushRegistered'],
    routePublishMap: {
      'mobile-session': { create: 'publishMobileSessionStarted', update: null, delete: 'publishMobileSessionEnded' },
    },
    crossServiceCalls: [],
  },
];

function toVarName(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toPascalCase(s) {
  return s.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join('');
}

// ─── FIX 1 + 5: Reactive Event Consumers with Cross-Service Calls ───

function generateConsumer(spec) {
  const svc = spec.name;
  const imports = [`import { RedisStreamEventBus } from '@dos/event-backbone';`,
    `import { logger } from '@dos/platform-core/observability';`,
    `import { ServiceClient } from '@dos/service-client';`,
    `import { recordAudit } from '../adapters/audit.adapter';`,
    `import { sendNotification } from '../adapters/notification.adapter';`,
  ];

  const domainImports = [];
  const publisherImports = [];

  for (const entity of spec.entities) {
    const svcFile = `${entity.name}.service`;
    const alias = `${entity.varName}Service`;
    domainImports.push(`import * as ${alias} from '../domain/${svcFile}';`);
  }

  const usedPublishers = new Set();
  for (const c of spec.consumes) {
    const targetEntity = spec.entities.find(e => e.name === c.targetEntity);
    if (targetEntity) {
      const createPub = spec.publisherFns.find(f => f.toLowerCase().includes(targetEntity.publishPrefix.toLowerCase()) && f.toLowerCase().includes('created'));
      if (createPub) usedPublishers.add(createPub);
    }
  }

  if (usedPublishers.size > 0) {
    publisherImports.push(`import { ${[...usedPublishers].join(', ')} } from './publisher';`);
  }

  imports.push(...domainImports, ...publisherImports);

  const workflowClient = `
const workflowClient = new ServiceClient({
  baseUrl: process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004',
  timeout: 5000,
  retries: 1,
});
`;

  let body = '';
  for (const c of spec.consumes) {
    const targetEntity = spec.entities.find(e => e.name === c.targetEntity);
    if (!targetEntity) continue;
    const svcAlias = `${targetEntity.varName}Service`;
    const idCol = targetEntity.idCol;
    const createPub = spec.publisherFns.find(f => f.toLowerCase().includes(targetEntity.publishPrefix.toLowerCase()) && f.toLowerCase().includes('created'));

    body += `
  eventBus.subscribe('${c.event}', async (envelope) => {
    const tenantId = envelope.tenantId;
    const payload = envelope.payload as Record<string, unknown>;
    try {
      logger.info(\`[${svc}] Processing ${c.event}: ${c.description}\`, {
        eventId: envelope.eventId,
        tenantId,
      });

      ${generateReactiveLogic(c, targetEntity, svcAlias, idCol, createPub, svc)}

      await recordAudit(
        tenantId,
        '${c.action}',
        '${c.targetEntity}',
        envelope.eventId,
        envelope.userId,
        { source: envelope.source, event: '${c.event}', payload },
      );
    } catch (err) {
      logger.error(\`[${svc}] Failed to process ${c.event}\`, { eventId: envelope.eventId, error: err });
    }
  });
`;
  }

  return `${imports.join('\n')}
${workflowClient}
export function registerConsumers(eventBus: RedisStreamEventBus): void {${body}}
`;
}

function generateReactiveLogic(consume, entity, svcAlias, idCol, createPub, serviceName) {
  const action = consume.action;

  if (action.startsWith('create') || action.startsWith('provision') || action.startsWith('start') || action.startsWith('assign')) {
    const titleField = entity.requiredFields.includes('title') ? `title: (payload.title as string) || \`Auto: ${consume.event} - \${envelope.eventId.slice(0, 8)}\`` : '';
    const otherRequired = entity.requiredFields.filter(f => f !== 'title');
    const otherFields = otherRequired.map(f => {
      if (f === 'category' || f === 'type' || f === 'pillar' || f === 'framework') return `${f}: (payload.${f} as string) || (payload.category as string) || 'auto-generated'`;
      if (f === 'severity') return `severity: (payload.severity as string) || 'medium'`;
      if (f === 'priority') return `priority: (payload.priority as string) || 'medium'`;
      if (f === 'name') return `name: (payload.name as string) || \`Auto: ${consume.event} - \${envelope.eventId.slice(0, 8)}\``;
      if (f === 'user_id') return `user_id: (payload.userId as string) || (payload.assigneeId as string) || envelope.userId || ''`;
      if (f === 'framework_name') return `framework_name: (payload.framework as string) || 'auto-detected'`;
      if (f === 'control_ref') return `control_ref: (payload.controlRef as string) || ''`;
      if (f === 'report_type') return `report_type: (payload.reportType as string) || 'ad-hoc'`;
      if (f === 'frequency') return `frequency: (payload.frequency as string) || 'once'`;
      if (f === 'data_source') return `data_source: (payload.dataSource as string) || 'auto'`;
      if (f === 'product_code') return `product_code: (payload.productCode as string) || 'default'`;
      if (f === 'plan') return `plan: (payload.plan as string) || 'starter'`;
      if (f === 'provider') return `provider: (payload.provider as string) || 'internal'`;
      if (f === 'device_type') return `device_type: (payload.deviceType as string) || 'unknown'`;
      return `${f}: (payload.${f} as string) || ''`;
    });

    const allFields = [titleField, ...otherFields].filter(Boolean).join(',\n          ');
    const sourceFields = `source_type: '${consume.event}',
          source_id: (payload.entityId as string) || envelope.eventId,`;
    const hasSource = entity.name === 'remediation' || entity.name === 'action-item';

    return `const created = await ${svcAlias}.create(tenantId, {
          ${allFields},
          status: 'open',${hasSource ? '\n          ' + sourceFields : ''}
          description: \`Auto-generated from ${consume.event} event (ID: \${envelope.eventId})\`,
        });
        logger.info(\`[${serviceName}] Auto-created ${entity.name}\`, { id: created.${idCol}, tenantId });
        ${createPub ? `await ${createPub}(tenantId, created.${idCol}, { source: '${consume.event}', autoGenerated: true }, envelope.userId);` : ''}
        if (envelope.userId) {
          sendNotification(tenantId, envelope.userId, '${toPascalCase(entity.name)} Created', \`A new ${entity.name} was auto-created from ${consume.event}\`, 'info', { entityId: created.${idCol} }).catch(() => {});
        }`;
  }

  if (action.startsWith('update') || action.startsWith('refresh') || action.startsWith('sync') || action.startsWith('reassess') || action.startsWith('flag') || action.startsWith('trigger') || action.startsWith('check') || action.startsWith('assess') || action.startsWith('link') || action.startsWith('review') || action.startsWith('push') || action.startsWith('prepare') || action.startsWith('advance') || action.startsWith('activate') || action.startsWith('resolve')) {
    return `const entityId = (payload.entityId as string) || (payload.${idCol} as string);
      if (entityId) {
        const existing = await ${svcAlias}.getById(tenantId, entityId);
        if (existing) {
          await ${svcAlias}.update(tenantId, entityId, {
            status: '${action.startsWith('activate') ? 'activated' : action.startsWith('resolve') ? 'resolved' : 'under-review'}',
          });
          logger.info(\`[${serviceName}] ${action}: updated ${entity.name}\`, { entityId, tenantId });
        }
      } else {
        const items = await ${svcAlias}.list(tenantId, { pageSize: 10, status: 'active' });
        for (const item of items.data) {
          await ${svcAlias}.update(tenantId, (item as any).${idCol}, {
            status: 'under-review',
          });
        }
        logger.info(\`[${serviceName}] ${action}: batch-reviewed ${entity.name} items\`, { count: items.data.length, tenantId });
      }`;
  }

  return `logger.info(\`[${serviceName}] ${action} triggered by ${consume.event}\`, { tenantId, payload });`;
}

// ─── FIX 2 + 6: Route files with publisher + notification wiring ───

function generateRoutes(spec, entity) {
  const svcFile = `${entity.name}.service`;
  const svcAlias = `${entity.varName}Service`;
  const routeName = toPascalCase(entity.name);
  const idCol = entity.idCol;
  const entityLabel = entity.name;
  const publishMap = spec.routePublishMap[entity.name] || {};
  const svc = spec.name;

  const publishImports = [];
  const usedPubs = new Set();
  for (const [, fn] of Object.entries(publishMap)) {
    if (fn) usedPubs.add(fn);
  }
  if (usedPubs.size > 0) {
    publishImports.push(`import { ${[...usedPubs].join(', ')} } from '../events/publisher';`);
  }

  const notifImport = `import { sendNotification } from '../adapters/notification.adapter';`;

  const validationChecks = entity.requiredFields.map(f =>
    `    if (!req.body.${f}) {
      res.status(400).json({ error: '${f} is required', code: 'VALIDATION_ERROR' });
      return;
    }`
  ).join('\n');

  const createPublish = publishMap.create
    ? `\n    await ${publishMap.create}(tenantId, item.${idCol}, { title: req.body.title || req.body.name }, actorId);`
    : '';

  const updatePublish = publishMap.update
    ? `\n    await ${publishMap.update}(tenantId, req.params.id, { changes: Object.keys(req.body) }, actorId);`
    : '';

  const deletePublish = publishMap.delete
    ? `\n    await ${publishMap.delete}(tenantId, req.params.id, {}, actorId);`
    : '';

  const createNotify = `\n    if (actorId) { sendNotification(tenantId, actorId, '${routeName} Created', \`${routeName} "\${req.body.title || req.body.name || ''}" created successfully\`, 'success', { entityId: item.${idCol} }).catch(() => {}); }`;

  return `import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as ${svcAlias} from '../domain/${svcFile}';
import { recordAudit } from '../adapters/audit.adapter';
${publishImports.join('\n')}
${notifImport}

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.pageSize as string || '25', 10);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

    const result = await ${svcAlias}.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list ${entityLabel}s', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await ${svcAlias}.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ${entityLabel} stats', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await ${svcAlias}.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: '${routeName} not found', code: '${entityLabel.toUpperCase().replace(/-/g, '_')}_NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ${entityLabel}', details: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
${validationChecks}

    const item = await ${svcAlias}.create(tenantId, req.body);
    recordAudit(tenantId, '${entityLabel}.created', '${entityLabel}', item.${idCol}, actorId, { title: req.body.title || req.body.name });${createPublish}${createNotify}
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ${entityLabel}', details: (err as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await ${svcAlias}.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: '${routeName} not found', code: '${entityLabel.toUpperCase().replace(/-/g, '_')}_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, '${entityLabel}.updated', '${entityLabel}', req.params.id, actorId, { changes: Object.keys(req.body) });${updatePublish}
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ${entityLabel}', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await ${svcAlias}.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '${routeName} not found', code: '${entityLabel.toUpperCase().replace(/-/g, '_')}_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, '${entityLabel}.deleted', '${entityLabel}', req.params.id, actorId);${deletePublish}
    res.json({ success: true, message: '${routeName} deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ${entityLabel}', details: (err as Error).message });
  }
});

export default router;
`;
}

// ─── FIX 3: Required fields in CreateInput ───

function fixCreateInput(filePath, requiredFields) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const field of requiredFields) {
    const optionalPattern = new RegExp(`(${field})\\?:`, 'g');
    content = content.replace(optionalPattern, '$1:');
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// ─── FIX 4: Multi-entity server.ts ───

function generateServer(spec) {
  const svc = spec.name;

  if (spec.entities.length === 1) {
    const entity = spec.entities[0];
    const routeApiPath = `/api/${entity.domain}`;
    return `import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { setEventBus } from '@dos/module-sdk';
import { routes } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers } from './events/consumer';

const SERVICE_CODE = '${svc}';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
  });
  setEventBus(eventBus as any);
  setServiceBus(eventBus);

  registerConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(\`[\${SERVICE_CODE}] Consumer error:\`, err);
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '${routeApiPath}', router: routes },
    ],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
  });

  await start();
}

main().catch(err => {
  console.error(\`Failed to start \${SERVICE_CODE}:\`, err);
  process.exit(1);
});
`;
  }

  // Multi-entity service
  const routerImports = spec.entities.map(e =>
    `import ${e.varName}Router from './routes/${e.name}.routes';`
  ).join('\n');

  const routeEntries = spec.entities.map(e =>
    `      { path: '/api/${e.domain}', router: ${e.varName}Router },`
  ).join('\n');

  return `import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { setEventBus } from '@dos/module-sdk';
${routerImports}
import { routes } from './routes/index';
import { setServiceBus } from './events/publisher';
import { registerConsumers } from './events/consumer';

const SERVICE_CODE = '${svc}';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
  });
  setEventBus(eventBus as any);
  setServiceBus(eventBus);

  registerConsumers(eventBus);
  eventBus.startConsuming().catch((err: Error) => {
    console.error(\`[\${SERVICE_CODE}] Consumer error:\`, err);
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
${routeEntries}
      { path: '/api/${spec.name.replace('-service', '')}', router: routes },
    ],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
  });

  await start();
}

main().catch(err => {
  console.error(\`Failed to start \${SERVICE_CODE}:\`, err);
  process.exit(1);
});
`;
}

// ─── Main Execution ───

let totalFilesWritten = 0;

for (const spec of SERVICE_SPECS) {
  const srcDir = path.join(SERVICES_DIR, spec.name, 'src');
  if (!fs.existsSync(srcDir)) {
    console.log(`SKIP ${spec.name}: no src/ directory`);
    continue;
  }

  console.log(`\n=== ${spec.name} ===`);

  // Fix 1+5: Consumer
  const consumerPath = path.join(srcDir, 'events', 'consumer.ts');
  if (fs.existsSync(consumerPath)) {
    fs.writeFileSync(consumerPath, generateConsumer(spec), 'utf8');
    console.log(`  ✓ events/consumer.ts (reactive + cross-service)`);
    totalFilesWritten++;
  }

  // Fix 2+6: Route files
  for (const entity of spec.entities) {
    const routePath = path.join(srcDir, 'routes', `${entity.name}.routes.ts`);
    if (fs.existsSync(routePath)) {
      fs.writeFileSync(routePath, generateRoutes(spec, entity), 'utf8');
      console.log(`  ✓ routes/${entity.name}.routes.ts (publisher + notification wired)`);
      totalFilesWritten++;
    }
  }

  // Fix 3: Required fields
  for (const entity of spec.entities) {
    const domainPath = path.join(srcDir, 'domain', `${entity.name}.service.ts`);
    if (fs.existsSync(domainPath)) {
      fixCreateInput(domainPath, entity.requiredFields);
      console.log(`  ✓ domain/${entity.name}.service.ts (required fields fixed)`);
      totalFilesWritten++;
    }
  }

  // Fix 4: Server.ts
  const serverPath = path.join(srcDir, 'server.ts');
  if (fs.existsSync(serverPath)) {
    fs.writeFileSync(serverPath, generateServer(spec), 'utf8');
    console.log(`  ✓ server.ts (${spec.entities.length > 1 ? 'multi-entity routing fixed' : 'single-entity routing'})`);
    totalFilesWritten++;
  }
}

console.log(`\n=== DONE: ${totalFilesWritten} files written ===`);
