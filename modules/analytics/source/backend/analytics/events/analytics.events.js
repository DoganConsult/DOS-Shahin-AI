"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_EVENT_CORRELATION = exports.ANALYTICS_EVENT_SECURITY = exports.ANALYTICS_EVENT_ORDERING = exports.ANALYTICS_EVENT_LEGACY_ALIASES = exports.ANALYTICS_CONSUMED_EVENTS = exports.ANALYTICS_PUBLISHED_EVENTS = exports.ANALYTICS_EVENT_CONTRACT = void 0;
exports.ANALYTICS_EVENT_CONTRACT = {
    moduleCode: 'analytics',
    published: {
        'analytics.kpi_snapshot_generated': { description: 'Emitted when periodic KPI snapshot is computed', version: 1, payloadType: 'AnalyticsEventPayload' },
        'analytics.benchmark_updated': { description: 'Emitted when benchmark comparison data refreshes', version: 1, payloadType: 'AnalyticsEventPayload' },
        'analytics.anomaly_detected': { description: 'Emitted when statistical anomaly is detected in metrics', version: 1, payloadType: 'AnalyticsEventPayload' },
        'analytics.report_generated': { description: 'Emitted when an analytics report is produced', version: 1, payloadType: 'AnalyticsEventPayload' },
        'analytics.engagement_score_changed': { description: 'Emitted when user engagement score changes', version: 1, payloadType: 'AnalyticsEventPayload' },
        'analytics.prediction_updated': { description: 'Emitted when predictive model outputs new forecast', version: 1, payloadType: 'AnalyticsEventPayload' },
    },
    consumed: {
        'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'risk.exceeded_appetite': { source: 'risk', handler: 'handleRiskExceededAppetite', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'compliance.posture_changed': { source: 'compliance', handler: 'handlePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'compliance.assessment_completed': { source: 'compliance', handler: 'handleComplianceAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'evidence.collected': { source: 'evidence', handler: 'handleEvidenceCollected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'incident.created': { source: 'incident', handler: 'handleIncidentCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'audit.finding_created': { source: 'audit', handler: 'handleAuditFinding', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'audit.status_changed': { source: 'audit', handler: 'handleAuditStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'workflow.instance_completed': { source: 'workflow', handler: 'handleWorkflowCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'vendor.sla_breached': { source: 'vendor', handler: 'handleVendorSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'vendor.risk_changed': { source: 'vendor', handler: 'handleVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'vendor.onboarded': { source: 'vendor', handler: 'handleVendorOnboarded', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'training.assignment_overdue': { source: 'training', handler: 'handleTrainingOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'training.compliance_gap': { source: 'training', handler: 'handleTrainingComplianceGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'control.effectiveness_low': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'bcp.rto_rpo_drift': { source: 'bcp', handler: 'handleBcpRtoRpoDrift', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'policy.status_changed': { source: 'policy', handler: 'handlePolicyStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'remediation.task_completed': { source: 'remediation', handler: 'handleRemediationTaskCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'bootstrap.session_resolved': { source: 'bootstrap', handler: 'handleBootstrapSessionResolved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'bootstrap.context_loaded': { source: 'bootstrap', handler: 'handleBootstrapContextLoaded', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'bootstrap.first_run_completed': { source: 'bootstrap', handler: 'handleBootstrapFirstRunCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'bootstrap.resolution_slow': { source: 'bootstrap', handler: 'handleBootstrapResolutionSlow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'team.created': { source: 'team', handler: 'handleTeamCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'team.member_added': { source: 'team', handler: 'handleTeamMemberAdded', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'team.archived': { source: 'team', handler: 'handleTeamArchived', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'journey.milestone_achieved': { source: 'journey', handler: 'handleJourneyMilestoneAchieved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'journey.maturity_level_changed': { source: 'journey', handler: 'handleJourneyMaturityChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'journey.roadmap_created': { source: 'journey', handler: 'handleJourneyRoadmapCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleComplianceFrameworkGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiency', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'governance.health_score_updated': { source: 'governance', handler: 'handleGovernanceHealthScore', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'bcp.maturity_regression': { source: 'bcp', handler: 'handleBcpMaturityRegression', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    },
};
exports.ANALYTICS_PUBLISHED_EVENTS = Object.keys(exports.ANALYTICS_EVENT_CONTRACT.published);
exports.ANALYTICS_CONSUMED_EVENTS = Object.keys(exports.ANALYTICS_EVENT_CONTRACT.consumed);
exports.ANALYTICS_EVENT_LEGACY_ALIASES = {};
exports.ANALYTICS_EVENT_ORDERING = {
    strictOrdering: true,
    partitionKey: 'tenantId',
    deduplicationWindow: 300,
    maxRetries: 3,
    retryBackoffMs: [1000, 5000, 15000],
};
exports.ANALYTICS_EVENT_SECURITY = {
    requireAuthentication: true,
    allowCrossTenant: false,
    sensitivePayloadFields: [],
    auditAllPublishes: true,
    auditAllConsumptions: true,
    encryptPayload: false,
    signPayload: false,
};
exports.ANALYTICS_EVENT_CORRELATION = {
    enableCorrelation: true,
    propagateCorrelationId: true,
    generateIfMissing: true,
    includeInLogs: true,
    includeInTracing: true,
};
//# sourceMappingURL=analytics.events.js.map