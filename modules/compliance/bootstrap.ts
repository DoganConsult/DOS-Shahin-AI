/**
 * @dos/module-compliance — bootstrap entrypoint.
 *
 * Mirrors Foundation's host-binding contract:
 *   - registerCompliance(options)        → bind ports + mount aggregator
 *   - bindCompliancePorts(bindings)      → bind only (no mount)
 *   - onInstall / onActivate / onMigrate / onUninstall — lifecycle hooks
 *
 * Default port impls keep the module testable standalone; production hosts
 * pass real adapters via the bindings object.
 */
import type { Express, Router } from 'express';
import {
  createComplianceAggregatorRouter,
  listRouteBases,
  type ComplianceAggregatorDeps,
} from './interface/http/aggregator.routes';
import {
  bindFoundationPort,
  type FoundationPort,
} from './ports/foundation.port';
import {
  bindDynamicUiPort,
  type DynamicUiPort,
} from './ports/dynamic-ui.port';
import { bindAuditPort, type AuditPort } from './ports/audit.port';
import {
  createRuntimeConfigRouter,
  type RuntimeConfigRouterDeps,
} from './interface/http/runtime-config.routes';
import { createUiDiscoveryRouter } from './interface/http/ui-discovery.routes';
import { createExportRouter, type ExportRouterDeps } from './interface/http/export.routes';
import { createRealtimeRouter, type RealtimeRouterDeps } from './interface/http/realtime.routes';
import { createAiRouter, type AiRouterDeps } from './interface/http/ai.routes';
import { bindAiPort, type AiPort } from './ports/ai.port';
import { createHealthRouter, type HealthRouterDeps } from './interface/http/health.routes';
import { createControlsRouter, type ControlsRouterDeps } from './interface/http/controls.routes';
import { createFrameworksRouter, type FrameworksRouterDeps } from './interface/http/frameworks.routes';
import { createObligationsRouter, type ObligationsRouterDeps } from './interface/http/obligations.routes';
import { createAssessmentsRouter, type AssessmentsRouterDeps } from './interface/http/assessments.routes';
import { createRequirementsRouter, type RequirementsRouterDeps } from './interface/http/requirements.routes';
import { createGapsRouter, type GapsRouterDeps } from './interface/http/gaps.routes';
import { createAttestationsRouter, type AttestationsRouterDeps } from './interface/http/attestations.routes';
import { createExceptionsRouter, type ExceptionsRouterDeps } from './interface/http/exceptions.routes';
import { createEvidenceLinksRouter, type EvidenceLinksRouterDeps } from './interface/http/evidence-links.routes';
import { createRegulatoryChangesRouter, type RegulatoryChangesRouterDeps } from './interface/http/regulatory-changes.routes';
import { createMonitoringRouter, type MonitoringRouterDeps } from './interface/http/monitoring.routes';
import { createPostureScoresRouter, type PostureScoresRouterDeps } from './interface/http/posture-scores.routes';
import { createRoadmapRouter, type RoadmapRouterDeps } from './interface/http/roadmap.routes';
import { createCalendarRouter, type CalendarRouterDeps } from './interface/http/calendar.routes';
import { createProgramsRouter, type ProgramsRouterDeps } from './interface/http/programs.routes';
import { createControlsMappingRouter, type ControlsMappingRouterDeps } from './interface/http/controls-mapping.routes';
import { createKpisRouter, type KpisRouterDeps } from './interface/http/kpis.routes';
import { createSettingsRouter, type SettingsRouterDeps } from './interface/http/settings.routes';
import { createAttachmentsRouter, type AttachmentsRouterDeps } from './interface/http/attachments.routes';
import { createCommentsRouter, type CommentsRouterDeps } from './interface/http/comments.routes';
import { createTagsRouter, type TagsRouterDeps } from './interface/http/tags.routes';
import { createChangeLogRouter, type ChangeLogRouterDeps } from './interface/http/change-log.routes';
import { createExternalMappingsRouter, type ExternalMappingsRouterDeps } from './interface/http/external-mappings.routes';
import { createReportSnapshotsRouter, type ReportSnapshotsRouterDeps } from './interface/http/report-snapshots.routes';
import { createAiSuggestionsRouter, type AiSuggestionsRouterDeps } from './interface/http/ai-suggestions.routes';
import { createVersionsRouter, type VersionsRouterDeps } from './interface/http/versions.routes';
import { createControlDeficienciesRouter, type ControlDeficienciesRouterDeps } from './interface/http/control-deficiencies.routes';
import { createControlEffectivenessRouter, type ControlEffectivenessRouterDeps } from './interface/http/control-effectiveness.routes';
import { createControlScopeTagsRouter, type ControlScopeTagsRouterDeps } from './interface/http/control-scope-tags.routes';
import { createControlTestSchedulesRouter, type ControlTestSchedulesRouterDeps } from './interface/http/control-test-schedules.routes';
import { createAttestationCampaignsRouter, type AttestationCampaignsRouterDeps } from './interface/http/attestation-campaigns.routes';
import { createAttestationRecordsRouter, type AttestationRecordsRouterDeps } from './interface/http/attestation-records.routes';
import { createAttestationDraftsRouter, type AttestationDraftsRouterDeps } from './interface/http/attestation-drafts.routes';
import { createCsaCampaignsRouter, type CsaCampaignsRouterDeps } from './interface/http/csa-campaigns.routes';
import { createCsaResponsesRouter, type CsaResponsesRouterDeps } from './interface/http/csa-responses.routes';
import { createUcfControlsRouter, type UcfControlsRouterDeps } from './interface/http/ucf-controls.routes';
import { createCrosswalkMappingsRouter, type CrosswalkMappingsRouterDeps } from './interface/http/crosswalk-mappings.routes';
import { createSodConflictMatrixRouter, type SodConflictMatrixRouterDeps } from './interface/http/sod-conflict-matrix.routes';
import { createEntitiesRouter, type EntitiesRouterDeps } from './interface/http/entities.routes';
import { createFindingsRouter, type FindingsRouterDeps } from './interface/http/findings.routes';
import { createEvidenceFilesRouter, type EvidenceFilesRouterDeps } from './interface/http/evidence-files.routes';
import { createWorkspacesRouter, type WorkspacesRouterDeps } from './interface/http/workspaces.routes';
import { createInstrumentStructureRouter, type InstrumentStructureRouterDeps } from './interface/http/instrument-structure.routes';
import { createSectorsRouter, type SectorsRouterDeps } from './interface/http/sectors.routes';
import { createFrameworkSectorApplicabilityRouter, type FrameworkSectorApplicabilityRouterDeps } from './interface/http/framework-sector-applicability.routes';
import { createRegulatorBulletinsRouter, type RegulatorBulletinsRouterDeps } from './interface/http/regulator-bulletins.routes';
import { createSubmissionPacketsRouter, type SubmissionPacketsRouterDeps } from './interface/http/submission-packets.routes';
import { createBilingualContentRouter, type BilingualContentRouterDeps } from './interface/http/bilingual-content.routes';
import { createComplianceUniverseRouter, type ComplianceUniverseRouterDeps } from './interface/http/compliance-universe.routes';
import { createComplianceCalculatorRouter, type ComplianceCalculatorRouterDeps } from './interface/http/compliance-calculator.routes';
import { createContentPackLoaderRouter, type ContentPackLoaderRouterDeps } from './interface/http/content-pack-loader.routes';
import { createDriftDetectorRouter, type DriftDetectorRouterDeps } from './interface/http/drift-detector.routes';
import { createEventPublisherRouter, type EventPublisherRouterDeps } from './interface/http/event-publisher.routes';
import { createSodRuntimeRouter, type SodRuntimeRouterDeps } from './interface/http/sod-runtime.routes';
import { createFindingsRemediationBridgeRouter, type FindingsRemediationBridgeRouterDeps } from './interface/http/findings-remediation-bridge.routes';
import { requestIdMiddleware, rateLimitMiddleware, type RequestIdOptions, type RateLimitOptions } from './application/hardening/hardening.middleware';
import { createApprovalMatrixRuntimeRouter, type ApprovalMatrixRuntimeRouterDeps } from './interface/http/approval-matrix-runtime.routes';
import { createOutboxDispatcherJobRouter, type OutboxDispatcherJobRouterDeps } from './interface/http/outbox-dispatcher-job.routes';
import { createRetryBackoffPolicyRouter, type RetryBackoffPolicyRouterDeps } from './interface/http/retry-backoff-policy.routes';
import { createDeadLetterQueueRouter, type DeadLetterQueueRouterDeps } from './interface/http/dead-letter-queue.routes';
import { createRetentionPolicyRouter, type RetentionPolicyRouterDeps } from './interface/http/retention-policy.routes';
import { createNotificationDispatcherRouter, type NotificationDispatcherRouterDeps } from './interface/http/notification-dispatcher.routes';
import { createWorkflowRuntimeRouter, type WorkflowRuntimeRouterDeps } from './interface/http/workflow-runtime.routes';
import { createOutboxArchiveRouter, type OutboxArchiveRouterDeps } from './interface/http/outbox-archive.routes';
import { createSchemaMigrationTrackerRouter, type SchemaMigrationTrackerRouterDeps } from './interface/http/schema-migration-tracker.routes';
import { createAuditLogStreamRouter, type AuditLogStreamRouterDeps } from './interface/http/audit-log-stream.routes';
import { createScheduledJobsRunnerRouter, type ScheduledJobsRunnerRouterDeps } from './interface/http/scheduled-jobs-runner.routes';
import { createWebhookSubscriptionsRouter, type WebhookSubscriptionsRouterDeps } from './interface/http/webhook-subscriptions.routes';
import { createIdempotencyKeysRouter, type IdempotencyKeysRouterDeps } from './interface/http/idempotency-keys.routes';
import { createFeatureFlagsRouter, type FeatureFlagsRouterDeps } from './interface/http/feature-flags.routes';
import { createApiKeysRouter, type ApiKeysRouterDeps } from './interface/http/api-keys.routes';
import { createRateLimitPoliciesRouter, type RateLimitPoliciesRouterDeps } from './interface/http/rate-limit-policies.routes';
import { incCounter } from './application/observability/metrics';
import manifest from './module.manifest.json';
import { Router as ExpressRouter } from 'express';
import ksaCrossFrameworkRouter from './interface/http/ksa/ksa-cross-framework-mapping.routes';
import ksaRegulatoryChangesRouter from './interface/http/ksa/ksa-regulatory-changes.routes';
import ksaSectorMaturityRouter from './interface/http/ksa/ksa-sector-maturity.routes';
import regulatorHeatmapRouter from './interface/http/regulator/regulator-heatmap.routes';
import regulatorPortalRouter from './interface/http/regulator/regulator-portal.routes';
import regulatorRegistryRouter from './interface/http/regulator/regulator-registry.routes';
import complianceDiagnosticsRouter from './interface/http/compliance-diagnostics.routes';
import objectsRouter from './interface/http/objects.routes';
import documentsRouter from './interface/http/documents.routes';
import { bindEvidencePort, type EvidencePort } from './ports/evidence.port';
import { bindFindingsPort, type FindingsPort } from './ports/findings.port';

export interface ComplianceHostBindings {
  database?: Record<string, unknown>;
  logger?: Record<string, unknown>;
  middleware?: Record<string, unknown>;
  response?: Record<string, unknown>;
  resilience?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  events?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  schemas?: Record<string, unknown>;
  /** Foundation client port (W2). Host-supplied implementation. */
  foundation?: Partial<FoundationPort>;
  /** Dynamic UI client port (W2). Host-supplied implementation. */
  dynamicUi?: Partial<DynamicUiPort>;
  /** Audit writer port (W2). Defaults to Foundation port if omitted. */
  audit?: Partial<AuditPort>;
  /** AI port (W7). Required for `/ai/*` endpoints; otherwise endpoints respond 503. */
  aiPort?: Partial<AiPort>;
  /** Evidence cross-module port (Patch 06 §2.5). Host adapter proxies to the Evidence module. */
  evidence?: Partial<EvidencePort>;
  /** Findings cross-module port (Patch 06 §2.5). Host adapter proxies to the Audit module. */
  findings?: Partial<FindingsPort>;
}

export interface RegisterComplianceOptions extends ComplianceHostBindings {
  app?: Express;
  /** Per-routeBase router map. Unwired routeBases get a 501 placeholder. */
  routers?: Record<string, Router>;
  aggregatorDeps?: ComplianceAggregatorDeps;
  /** When provided, runtime-config + view-preset endpoints are auto-mounted on `/api/compliance`. */
  runtimeConfig?: RuntimeConfigRouterDeps;
  /** When provided, export endpoints (sync + async) are mounted on `/api/compliance`. */
  exportDeps?: ExportRouterDeps;
  /** When provided, SSE realtime endpoints are mounted on `/api/compliance`. */
  realtimeDeps?: RealtimeRouterDeps;
  /** When provided, AI endpoints are mounted on `/api/compliance`. */
  aiDeps?: AiRouterDeps;
  /** When provided, /healthz, /readyz, /metrics are mounted on `/api/compliance`. */
  healthDeps?: HealthRouterDeps;
  /** When provided, the real /api/controls vertical (W9) is wired. */
  controlsDeps?: ControlsRouterDeps;
  /** When provided, the real /api/frameworks vertical (W10) is wired. */
  frameworksDeps?: FrameworksRouterDeps;
  /** When provided, /api/compliance/obligations sub-router (W11) is mounted on the composite. */
  obligationsDeps?: ObligationsRouterDeps;
  /** When provided, /api/compliance/assessments sub-router (W12) is mounted on the composite. */
  assessmentsDeps?: AssessmentsRouterDeps;
  /** When provided, /api/compliance/requirements sub-router (W13) is mounted on the composite. */
  requirementsDeps?: RequirementsRouterDeps;
  /** When provided, /api/compliance/gaps sub-router (W14) is mounted on the composite. */
  gapsDeps?: GapsRouterDeps;
  /** When provided, the real /api/compliance-attestation vertical (W15) is wired. */
  attestationsDeps?: AttestationsRouterDeps;
  /** When provided, /api/compliance/exceptions sub-router (W16) is mounted on the composite. */
  exceptionsDeps?: ExceptionsRouterDeps;
  /** When provided, /api/compliance/evidence-links sub-router (W17) is mounted on the composite. */
  evidenceLinksDeps?: EvidenceLinksRouterDeps;
  /** When provided, /api/compliance/regulatory-changes sub-router (W18) is mounted on the composite. */
  regulatoryChangesDeps?: RegulatoryChangesRouterDeps;
  /** When provided, /api/compliance/monitoring sub-router (W19) is mounted on the composite. */
  monitoringDeps?: MonitoringRouterDeps;
  /** When provided, /api/compliance/posture-scores sub-router (W20) is mounted on the composite. */
  postureScoresDeps?: PostureScoresRouterDeps;
  /** When provided, /api/compliance/roadmap sub-router (W21) is mounted on the composite. */
  roadmapDeps?: RoadmapRouterDeps;
  /** When provided, /api/compliance/calendar sub-router (W22) is mounted on the composite. */
  calendarDeps?: CalendarRouterDeps;
  /** When provided, /api/compliance/programs sub-router (W23) is mounted on the composite. */
  programsDeps?: ProgramsRouterDeps;
  /** When provided, /api/compliance/controls-mapping sub-router (W24) is mounted on the composite. */
  controlsMappingDeps?: ControlsMappingRouterDeps;
  /** When provided, /api/compliance/kpis sub-router (W25) is mounted on the composite. */
  kpisDeps?: KpisRouterDeps;
  /** When provided, /api/compliance/settings sub-router (W26) is mounted on the composite. */
  settingsDeps?: SettingsRouterDeps;
  /** When provided, /api/compliance/attachments sub-router (W27) is mounted on the composite. */
  attachmentsDeps?: AttachmentsRouterDeps;
  /** When provided, /api/compliance/comments sub-router (W28) is mounted on the composite. */
  commentsDeps?: CommentsRouterDeps;
  /** When provided, /api/compliance/tags sub-router (W29) is mounted on the composite. */
  tagsDeps?: TagsRouterDeps;
  /** When provided, /api/compliance/change-log sub-router (W30) is mounted on the composite. */
  changeLogDeps?: ChangeLogRouterDeps;
  /** When provided, /api/compliance/external-mappings sub-router (W31) is mounted on the composite. */
  externalMappingsDeps?: ExternalMappingsRouterDeps;
  /** When provided, /api/compliance/report-snapshots sub-router (W32) is mounted on the composite. */
  reportSnapshotsDeps?: ReportSnapshotsRouterDeps;
  /** When provided, /api/compliance/ai-suggestions sub-router (W33) is mounted on the composite. */
  aiSuggestionsDeps?: AiSuggestionsRouterDeps;
  /** When provided, /api/compliance/versions sub-router (W34) is mounted on the composite. */
  versionsDeps?: VersionsRouterDeps;
  /** When provided, /api/compliance/control-deficiencies sub-router (W35) is mounted on the composite. */
  controlDeficienciesDeps?: ControlDeficienciesRouterDeps;
  /** When provided, /api/compliance/control-effectiveness sub-router (W36) is mounted on the composite. */
  controlEffectivenessDeps?: ControlEffectivenessRouterDeps;
  /** When provided, /api/compliance/control-scope-tags sub-router (W37) is mounted on the composite. */
  controlScopeTagsDeps?: ControlScopeTagsRouterDeps;
  /** When provided, /api/compliance/control-test-schedules sub-router (W38) is mounted on the composite. */
  controlTestSchedulesDeps?: ControlTestSchedulesRouterDeps;
  /** When provided, /api/compliance/attestation-campaigns sub-router (W39) is mounted on the composite. */
  attestationCampaignsDeps?: AttestationCampaignsRouterDeps;
  /** When provided, /api/compliance/attestation-records sub-router (W40) is mounted on the composite. */
  attestationRecordsDeps?: AttestationRecordsRouterDeps;
  /** When provided, /api/compliance/attestation-drafts sub-router (W41) is mounted on the composite. */
  attestationDraftsDeps?: AttestationDraftsRouterDeps;
  /** When provided, /api/compliance/csa-campaigns sub-router (W42) is mounted on the composite. */
  csaCampaignsDeps?: CsaCampaignsRouterDeps;
  /** When provided, /api/compliance/csa-responses sub-router (W43) is mounted on the composite. */
  csaResponsesDeps?: CsaResponsesRouterDeps;
  /** When provided, /api/compliance/ucf-controls sub-router (W44) is mounted on the composite. */
  ucfControlsDeps?: UcfControlsRouterDeps;
  /** When provided, /api/compliance/crosswalk-mappings sub-router (W45) is mounted on the composite. */
  crosswalkMappingsDeps?: CrosswalkMappingsRouterDeps;
  /** When provided, /api/compliance/sod-conflict-matrix sub-router (W46) is mounted on the composite. */
  sodConflictMatrixDeps?: SodConflictMatrixRouterDeps;
  /** When provided, /api/compliance/entities sub-router (W47) is mounted on the composite. */
  entitiesDeps?: EntitiesRouterDeps;
  /** When provided, /api/compliance/findings sub-router (W48) is mounted on the composite. */
  findingsDeps?: FindingsRouterDeps;
  /** When provided, /api/compliance/evidence-files sub-router (W49) is mounted on the composite. */
  evidenceFilesDeps?: EvidenceFilesRouterDeps;
  /** When provided, /api/compliance/workspaces sub-router (W50) is mounted on the composite. */
  workspacesDeps?: WorkspacesRouterDeps;
  /** When provided, /api/compliance/instrument-structure sub-router (W51) is mounted on the composite. */
  instrumentStructureDeps?: InstrumentStructureRouterDeps;
  /** When provided, /api/compliance/sectors sub-router (W52a) is mounted on the composite. */
  sectorsDeps?: SectorsRouterDeps;
  /** When provided, /api/compliance/framework-sector-applicability sub-router (W52b) is mounted on the composite. */
  frameworkSectorApplicabilityDeps?: FrameworkSectorApplicabilityRouterDeps;
  /** When provided, /api/compliance/regulator-bulletins sub-router (W53) is mounted on the composite. */
  regulatorBulletinsDeps?: RegulatorBulletinsRouterDeps;
  /** When provided, /api/compliance/submission-packets sub-router (W54) is mounted on the composite. */
  submissionPacketsDeps?: SubmissionPacketsRouterDeps;
  /** When provided, /api/compliance/bilingual-content sub-router (W55) is mounted on the composite. */
  bilingualContentDeps?: BilingualContentRouterDeps;
  /** When provided, /api/compliance/compliance-universe sub-router (W56) is mounted on the composite. */
  complianceUniverseDeps?: ComplianceUniverseRouterDeps;
  /** When provided, /api/compliance/compliance-calculator sub-router (W57) is mounted on the composite. */
  complianceCalculatorDeps?: ComplianceCalculatorRouterDeps;
  /** When provided, /api/compliance/content-pack-loader sub-router (W58) is mounted on the composite. */
  contentPackLoaderDeps?: ContentPackLoaderRouterDeps;
  /** When provided, /api/compliance/drift-detector sub-router (W59) is mounted on the composite. */
  driftDetectorDeps?: DriftDetectorRouterDeps;
  /** When provided, /api/compliance/event-publisher sub-router (W60) is mounted on the composite. */
  eventPublisherDeps?: EventPublisherRouterDeps;
  /** When provided, /api/compliance/sod-runtime sub-router (W61) is mounted on the composite. */
  sodRuntimeDeps?: SodRuntimeRouterDeps;
  /** When provided, /api/compliance/findings-remediation-bridge sub-router (W62) is mounted on the composite. */
  findingsRemediationBridgeDeps?: FindingsRemediationBridgeRouterDeps;
  /** Hardening middlewares (W63). When provided (or `enabled:true`), request-id + rate-limit are mounted at the top of the composite. */
  hardening?: {
    enabled?: boolean;
    requestId?: RequestIdOptions;
    rateLimit?: RateLimitOptions;
  };
  /** When provided, /api/compliance/approval-matrix-runtime sub-router (W64) is mounted on the composite. */
  approvalMatrixRuntimeDeps?: ApprovalMatrixRuntimeRouterDeps;
  /** When provided, /api/compliance/outbox-dispatcher-job sub-router (W65) is mounted on the composite. */
  outboxDispatcherJobDeps?: OutboxDispatcherJobRouterDeps;
  /** When provided, /api/compliance/retry-backoff-policy sub-router (W66) is mounted on the composite. */
  retryBackoffPolicyDeps?: RetryBackoffPolicyRouterDeps;
  /** When provided, /api/compliance/dead-letter-queue sub-router (W67) is mounted on the composite. */
  deadLetterQueueDeps?: DeadLetterQueueRouterDeps;
  /** When provided, /api/compliance/retention-policy sub-router (W68) is mounted on the composite. */
  retentionPolicyDeps?: RetentionPolicyRouterDeps;
  /** When provided, /api/compliance/notification-dispatcher sub-router (W69) is mounted on the composite. */
  notificationDispatcherDeps?: NotificationDispatcherRouterDeps;
  /** When provided, /api/compliance/workflow-runtime sub-router (W70) is mounted on the composite. */
  workflowRuntimeDeps?: WorkflowRuntimeRouterDeps;
  /** When provided, /api/compliance/outbox-archive sub-router (W71) is mounted on the composite. */
  outboxArchiveDeps?: OutboxArchiveRouterDeps;
  /** When provided, /api/compliance/schema-migration-tracker sub-router (W72) is mounted on the composite. */
  schemaMigrationTrackerDeps?: SchemaMigrationTrackerRouterDeps;
  /** When provided, /api/compliance/audit-log-stream sub-router (W73) is mounted on the composite. */
  auditLogStreamDeps?: AuditLogStreamRouterDeps;
  /** When provided, /api/compliance/scheduled-jobs* sub-router (W74) is mounted on the composite. */
  scheduledJobsRunnerDeps?: ScheduledJobsRunnerRouterDeps;
  /** When provided, /api/compliance/webhook-subscriptions* sub-router (W75) is mounted on the composite. */
  webhookSubscriptionsDeps?: WebhookSubscriptionsRouterDeps;
  /** When provided, /api/compliance/idempotency-keys* sub-router (W76) is mounted on the composite. */
  idempotencyKeysDeps?: IdempotencyKeysRouterDeps;
  /** When provided, /api/compliance/feature-flags* sub-router (W77) is mounted on the composite. */
  featureFlagsDeps?: FeatureFlagsRouterDeps;
  /** When provided, /api/compliance/api-keys* sub-router (W78) is mounted on the composite. */
  apiKeysDeps?: ApiKeysRouterDeps;
  /** When provided, /api/compliance/rate-limit-policies* sub-router (W79) is mounted on the composite. */
  rateLimitPoliciesDeps?: RateLimitPoliciesRouterDeps;
}

export interface RegisterComplianceResult {
  moduleCode: string;
  routeBase: string;
  routeBases: string[];
  router: Router;
  mounts: Array<{ routeBase: string; wired: boolean }>;
  manifest: typeof manifest;
}

const _bindings: ComplianceHostBindings = {};

export function bindCompliancePorts(bindings: ComplianceHostBindings = {}): void {
  Object.assign(_bindings, bindings);
  if (bindings.foundation) bindFoundationPort(bindings.foundation);
  if (bindings.dynamicUi) bindDynamicUiPort(bindings.dynamicUi);
  if (bindings.audit) bindAuditPort(bindings.audit);
  if (bindings.aiPort) bindAiPort(bindings.aiPort);
  if (bindings.evidence) bindEvidencePort(bindings.evidence);
  if (bindings.findings) bindFindingsPort(bindings.findings);
}

export function registerCompliance(options: RegisterComplianceOptions = {}): RegisterComplianceResult {
  bindCompliancePorts(options);

  const routers: Record<string, Router> = { ...(options.routers ?? options.aggregatorDeps?.routers ?? {}) };
  if (options.controlsDeps && !routers['/api/controls']) {
    routers['/api/controls'] = createControlsRouter(options.controlsDeps);
  }
  if (!routers['/api/ksa-cross-framework']) {
    routers['/api/ksa-cross-framework'] = ksaCrossFrameworkRouter;
  }
  if (!routers['/api/ksa-regulatory-changes']) {
    routers['/api/ksa-regulatory-changes'] = ksaRegulatoryChangesRouter;
  }
  if (!routers['/api/ksa-sector-maturity']) {
    routers['/api/ksa-sector-maturity'] = ksaSectorMaturityRouter;
  }
  if (!routers['/api/regulator/heatmap']) {
    routers['/api/regulator/heatmap'] = regulatorHeatmapRouter;
  }
  if (!routers['/api/regulator/portal']) {
    routers['/api/regulator/portal'] = regulatorPortalRouter;
  }
  if (!routers['/api/regulator/registry']) {
    routers['/api/regulator/registry'] = regulatorRegistryRouter;
  }
  if (!routers['/api/objects']) {
    routers['/api/objects'] = objectsRouter;
  }
  if (!routers['/api/documents']) {
    routers['/api/documents'] = documentsRouter;
  }
  if (options.frameworksDeps && !routers['/api/frameworks']) {
    routers['/api/frameworks'] = createFrameworksRouter(options.frameworksDeps);
  }
  if (options.attestationsDeps && !routers['/api/compliance-attestation']) {
    routers['/api/compliance-attestation'] = createAttestationsRouter(options.attestationsDeps);
  }
  if (!routers['/api/compliance']) {
    const composite = ExpressRouter();
    composite.use((req, _res, next) => {
      incCounter('compliance_http_requests_total', 1, { method: req.method });
      next();
    });
    if (options.hardening && (options.hardening.enabled !== false)) {
      composite.use(requestIdMiddleware(options.hardening.requestId));
      composite.use(rateLimitMiddleware(options.hardening.rateLimit));
    }
    composite.use(createUiDiscoveryRouter());
    composite.use(complianceDiagnosticsRouter);
    if (options.runtimeConfig) composite.use(createRuntimeConfigRouter(options.runtimeConfig));
    if (options.exportDeps) composite.use(createExportRouter(options.exportDeps));
    if (options.realtimeDeps) composite.use(createRealtimeRouter(options.realtimeDeps));
    if (options.aiDeps) composite.use(createAiRouter(options.aiDeps));
    if (options.obligationsDeps) composite.use(createObligationsRouter(options.obligationsDeps));
    if (options.assessmentsDeps) composite.use(createAssessmentsRouter(options.assessmentsDeps));
    if (options.requirementsDeps) composite.use(createRequirementsRouter(options.requirementsDeps));
    if (options.gapsDeps) composite.use(createGapsRouter(options.gapsDeps));
    if (options.exceptionsDeps) composite.use(createExceptionsRouter(options.exceptionsDeps));
    if (options.evidenceLinksDeps) composite.use(createEvidenceLinksRouter(options.evidenceLinksDeps));
    if (options.regulatoryChangesDeps) composite.use(createRegulatoryChangesRouter(options.regulatoryChangesDeps));
    if (options.monitoringDeps) composite.use(createMonitoringRouter(options.monitoringDeps));
    if (options.postureScoresDeps) composite.use(createPostureScoresRouter(options.postureScoresDeps));
    if (options.roadmapDeps) composite.use(createRoadmapRouter(options.roadmapDeps));
    if (options.calendarDeps) composite.use(createCalendarRouter(options.calendarDeps));
    if (options.programsDeps) composite.use(createProgramsRouter(options.programsDeps));
    if (options.controlsMappingDeps) composite.use(createControlsMappingRouter(options.controlsMappingDeps));
    if (options.kpisDeps) composite.use(createKpisRouter(options.kpisDeps));
    if (options.settingsDeps) composite.use(createSettingsRouter(options.settingsDeps));
    if (options.attachmentsDeps) composite.use(createAttachmentsRouter(options.attachmentsDeps));
    if (options.commentsDeps) composite.use(createCommentsRouter(options.commentsDeps));
    if (options.tagsDeps) composite.use(createTagsRouter(options.tagsDeps));
    if (options.changeLogDeps) composite.use(createChangeLogRouter(options.changeLogDeps));
    if (options.externalMappingsDeps) composite.use(createExternalMappingsRouter(options.externalMappingsDeps));
    if (options.reportSnapshotsDeps) composite.use(createReportSnapshotsRouter(options.reportSnapshotsDeps));
    if (options.aiSuggestionsDeps) composite.use(createAiSuggestionsRouter(options.aiSuggestionsDeps));
    if (options.versionsDeps) composite.use(createVersionsRouter(options.versionsDeps));
    if (options.controlDeficienciesDeps) composite.use(createControlDeficienciesRouter(options.controlDeficienciesDeps));
    if (options.controlEffectivenessDeps) composite.use(createControlEffectivenessRouter(options.controlEffectivenessDeps));
    if (options.controlScopeTagsDeps) composite.use(createControlScopeTagsRouter(options.controlScopeTagsDeps));
    if (options.controlTestSchedulesDeps) composite.use(createControlTestSchedulesRouter(options.controlTestSchedulesDeps));
    if (options.attestationCampaignsDeps) composite.use(createAttestationCampaignsRouter(options.attestationCampaignsDeps));
    if (options.attestationRecordsDeps) composite.use(createAttestationRecordsRouter(options.attestationRecordsDeps));
    if (options.attestationDraftsDeps) composite.use(createAttestationDraftsRouter(options.attestationDraftsDeps));
    if (options.csaCampaignsDeps) composite.use(createCsaCampaignsRouter(options.csaCampaignsDeps));
    if (options.csaResponsesDeps) composite.use(createCsaResponsesRouter(options.csaResponsesDeps));
    if (options.ucfControlsDeps) composite.use(createUcfControlsRouter(options.ucfControlsDeps));
    if (options.crosswalkMappingsDeps) composite.use(createCrosswalkMappingsRouter(options.crosswalkMappingsDeps));
    if (options.sodConflictMatrixDeps) composite.use(createSodConflictMatrixRouter(options.sodConflictMatrixDeps));
    if (options.entitiesDeps) composite.use(createEntitiesRouter(options.entitiesDeps));
    if (options.findingsDeps) composite.use(createFindingsRouter(options.findingsDeps));
    if (options.evidenceFilesDeps) composite.use(createEvidenceFilesRouter(options.evidenceFilesDeps));
    if (options.workspacesDeps) composite.use(createWorkspacesRouter(options.workspacesDeps));
    if (options.instrumentStructureDeps) composite.use(createInstrumentStructureRouter(options.instrumentStructureDeps));
    if (options.sectorsDeps) composite.use(createSectorsRouter(options.sectorsDeps));
    if (options.frameworkSectorApplicabilityDeps) composite.use(createFrameworkSectorApplicabilityRouter(options.frameworkSectorApplicabilityDeps));
    if (options.regulatorBulletinsDeps) composite.use(createRegulatorBulletinsRouter(options.regulatorBulletinsDeps));
    if (options.submissionPacketsDeps) composite.use(createSubmissionPacketsRouter(options.submissionPacketsDeps));
    if (options.bilingualContentDeps) composite.use(createBilingualContentRouter(options.bilingualContentDeps));
    if (options.complianceUniverseDeps) composite.use(createComplianceUniverseRouter(options.complianceUniverseDeps));
    if (options.complianceCalculatorDeps) composite.use(createComplianceCalculatorRouter(options.complianceCalculatorDeps));
    if (options.contentPackLoaderDeps) composite.use(createContentPackLoaderRouter(options.contentPackLoaderDeps));
    if (options.driftDetectorDeps) composite.use(createDriftDetectorRouter(options.driftDetectorDeps));
    if (options.eventPublisherDeps) composite.use(createEventPublisherRouter(options.eventPublisherDeps));
    if (options.sodRuntimeDeps) composite.use(createSodRuntimeRouter(options.sodRuntimeDeps));
    if (options.findingsRemediationBridgeDeps) composite.use(createFindingsRemediationBridgeRouter(options.findingsRemediationBridgeDeps));
    if (options.approvalMatrixRuntimeDeps) composite.use(createApprovalMatrixRuntimeRouter(options.approvalMatrixRuntimeDeps));
    if (options.outboxDispatcherJobDeps) composite.use(createOutboxDispatcherJobRouter(options.outboxDispatcherJobDeps));
    if (options.retryBackoffPolicyDeps) composite.use(createRetryBackoffPolicyRouter(options.retryBackoffPolicyDeps));
    if (options.deadLetterQueueDeps) composite.use(createDeadLetterQueueRouter(options.deadLetterQueueDeps));
    if (options.retentionPolicyDeps) composite.use(createRetentionPolicyRouter(options.retentionPolicyDeps));
    if (options.notificationDispatcherDeps) composite.use(createNotificationDispatcherRouter(options.notificationDispatcherDeps));
    if (options.workflowRuntimeDeps) composite.use(createWorkflowRuntimeRouter(options.workflowRuntimeDeps));
    if (options.outboxArchiveDeps) composite.use(createOutboxArchiveRouter(options.outboxArchiveDeps));
    if (options.schemaMigrationTrackerDeps) composite.use(createSchemaMigrationTrackerRouter(options.schemaMigrationTrackerDeps));
    if (options.auditLogStreamDeps) composite.use(createAuditLogStreamRouter(options.auditLogStreamDeps));
    if (options.scheduledJobsRunnerDeps) composite.use(createScheduledJobsRunnerRouter(options.scheduledJobsRunnerDeps));
    if (options.webhookSubscriptionsDeps) composite.use(createWebhookSubscriptionsRouter(options.webhookSubscriptionsDeps));
    if (options.idempotencyKeysDeps) composite.use(createIdempotencyKeysRouter(options.idempotencyKeysDeps));
    if (options.featureFlagsDeps) composite.use(createFeatureFlagsRouter(options.featureFlagsDeps));
    if (options.apiKeysDeps) composite.use(createApiKeysRouter(options.apiKeysDeps));
    if (options.rateLimitPoliciesDeps) composite.use(createRateLimitPoliciesRouter(options.rateLimitPoliciesDeps));
    composite.use(createHealthRouter(options.healthDeps ?? {}));
    routers['/api/compliance'] = composite;
  }
  const aggregatorDeps: ComplianceAggregatorDeps = {
    routers,
    notImplementedHandler: options.aggregatorDeps?.notImplementedHandler,
  };

  const { router, mounts } = createComplianceAggregatorRouter(aggregatorDeps);

  if (options.app) {
    options.app.use(router);
  }

  return {
    moduleCode: manifest.moduleCode,
    routeBase: '/api/compliance',
    routeBases: listRouteBases(),
    router,
    mounts,
    manifest,
  };
}

export async function onInstall(ctx: { tenantId?: string } = {}): Promise<void> {
  console.log('[compliance] onInstall', { tenantId: ctx.tenantId });
}

export async function onActivate(ctx: { tenantId?: string } = {}): Promise<void> {
  console.log('[compliance] onActivate', { tenantId: ctx.tenantId });
}

export async function onMigrate(ctx: { tenantId?: string; toVersion?: string } = {}): Promise<void> {
  console.log('[compliance] onMigrate', { tenantId: ctx.tenantId, toVersion: ctx.toVersion });
}

export async function onUninstall(ctx: { tenantId?: string } = {}): Promise<void> {
  console.log('[compliance] onUninstall', { tenantId: ctx.tenantId });
}

export default registerCompliance;
