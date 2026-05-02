/**
 * @dos/module-compliance — public barrel.
 * Re-exports the typed contract surface, lifecycle, and migration runner.
 */
export { runMigrations } from './db/runner';
export type { RunMigrationsResult, MigrationRecord } from './db/runner';
export {
  installPublic,
  installTenant,
  seedPublic,
  seedTenant,
  bootstrapCompliance,
} from './db/lifecycle';
export type {
  LifecycleOptions,
  LifecycleResult,
  LedgerKind,
  DbClient as ComplianceDbClient,
} from './db/lifecycle';
export {
  registerCompliance,
  bindCompliancePorts,
  onInstall,
  onActivate,
  onMigrate,
  onUninstall,
} from './bootstrap';
export type {
  ComplianceHostBindings,
  RegisterComplianceOptions,
  RegisterComplianceResult,
} from './bootstrap';

export {
  bindFoundationPort,
  getFoundationPort,
  type FoundationPort,
  type FoundationAuditEntry,
  type FoundationLookupItem,
  type OrgScope,
  type SoDEvaluationInput,
  type SoDEvaluationResult,
} from './ports/foundation.port';
export {
  bindDynamicUiPort,
  getDynamicUiPort,
  type DynamicUiPort,
  type ModuleEnrollment,
  type EnrollmentStatus,
  type ComponentRegistration,
  type RouteCatalogRefreshInput,
} from './ports/dynamic-ui.port';
export { bindAuditPort, getAuditPort, type AuditPort, type AuditEntry } from './ports/audit.port';

export {
  publishComplianceCatalog,
  evaluateComplianceSoD,
  loadPermissions,
  loadRoles,
  loadSodRules,
  type PermissionRow,
  type RoleRow,
  type SodRuleRow,
  type PublishCatalogResult,
} from './interface/security/publish';

export {
  getConfig as getRuntimeConfig,
  saveConfig as saveRuntimeConfig,
  listViews as listViewPresets,
  saveViewPreset,
  shareViewPreset,
  deleteViewPreset,
  type ConfigKind,
  type ConfigDescriptor,
  type ConfigRecord,
  type RuntimeConfigDeps,
  type RuntimeConfigCache,
  type SaveViewPresetInput,
  type ShareViewPresetInput,
} from './application/runtime-config/runtime-config.service';
export {
  createRuntimeConfigRouter,
  type RuntimeConfigRouterDeps,
  type RequestContext as RuntimeConfigRequestContext,
} from './interface/http/runtime-config.routes';
export {
  COMPLIANCE_COMPONENT_KEYS,
  componentRegistryByKey,
  listComponentKeys,
  getComponentEntry,
  type ComponentRegistryEntry,
  type ComponentReadiness,
} from './ui/component-registry';
export { registerComplianceComponents } from './application/ui/register-components';
export { createUiDiscoveryRouter } from './interface/http/ui-discovery.routes';

export {
  bindAiPort,
  getAiPort,
  claudeJSON,
  type AiPort,
  type AiSuggestion,
  type AiSuggestInput,
  type AiInterpretInput,
  type AiInterpretResult,
  type AiClassifyInput,
  type AiClassifyResult,
  type AiGatewayJSONInput,
  type AiGatewayCompleteInput,
} from './ports/ai.port';

export {
  bindEvidencePort,
  getEvidencePort,
  type EvidencePort,
  type EvidenceStats,
  type EvidenceCountInput,
  type EvidenceForControlInput,
  type EvidenceForControlResult,
  type EvidenceListInput,
  type EvidenceListItem,
  type AuditReadinessInput,
  type AuditReadinessResult,
} from './ports/evidence.port';

export {
  bindFindingsPort,
  getFindingsPort,
  type FindingsPort,
  type FindingsStats,
  type FindingsCountInput,
} from './ports/findings.port';

export {
  runSyncExport,
  startAsyncExport,
  getJob as getExportJob,
  type ExportFormat,
  type ExportStatus,
  type ExportRequest,
  type ExportEmitter,
  type ExportEmitterContext,
  type ExportResult,
  type ExportJob,
  type ExportDeps,
} from './application/export/export.service';
export { createExportRouter, type ExportRouterDeps } from './interface/http/export.routes';

export {
  subscribe as subscribeRealtime,
  publishEvent as publishRealtimeEvent,
  activeChannelCount,
  activeSubscriberCount,
  type RealtimeWriter,
  type RealtimeEvent,
} from './application/realtime/realtime.service';
export { createRealtimeRouter, type RealtimeRouterDeps } from './interface/http/realtime.routes';
export { createAiRouter, type AiRouterDeps } from './interface/http/ai.routes';

export {
  incCounter,
  setGauge,
  snapshot as metricsSnapshot,
  type MetricEntry,
  type MetricKind,
} from './application/observability/metrics';
export {
  reportHealth,
  reportLiveness,
  type HealthCheck,
  type HealthReport,
  type HealthDeps,
  type CheckStatus,
} from './application/observability/health';
export { createHealthRouter, type HealthRouterDeps } from './interface/http/health.routes';

export {
  listControls,
  getControl,
  createControl,
  type ControlRow,
  type ListControlsInput,
  type CreateControlInput,
} from './application/controls/controls.service';
export {
  createControlsRouter,
  type ControlsRouterDeps,
  type ControlsRouterContext,
} from './interface/http/controls.routes';

export {
  listFrameworks,
  getFramework,
  createFramework,
  type FrameworkRow,
  type ListFrameworksInput,
  type CreateFrameworkInput,
} from './application/frameworks/frameworks.service';
export {
  createFrameworksRouter,
  type FrameworksRouterDeps,
  type FrameworksRouterContext,
} from './interface/http/frameworks.routes';

export {
  listObligations,
  getObligation,
  createObligation,
  updateObligationStatus,
  type ObligationRow,
  type ObligationStatus,
  type ListObligationsInput,
  type CreateObligationInput,
  type UpdateObligationStatusInput,
} from './application/obligations/obligations.service';
export {
  createObligationsRouter,
  type ObligationsRouterDeps,
  type ObligationsRouterContext,
} from './interface/http/obligations.routes';

export {
  listAssessments,
  getAssessment,
  createAssessment,
  updateAssessmentStatus,
  type AssessmentRow,
  type AssessmentStatus,
  type ListAssessmentsInput,
  type CreateAssessmentInput,
  type UpdateAssessmentStatusInput,
} from './application/assessments/assessments.service';
export {
  createAssessmentsRouter,
  type AssessmentsRouterDeps,
  type AssessmentsRouterContext,
} from './interface/http/assessments.routes';

export {
  listRequirements,
  getRequirement,
  createRequirement,
  type RequirementRow,
  type RequirementCriticality,
  type ListRequirementsInput,
  type CreateRequirementInput,
} from './application/requirements/requirements.service';
export {
  createRequirementsRouter,
  type RequirementsRouterDeps,
  type RequirementsRouterContext,
} from './interface/http/requirements.routes';

export {
  listGaps,
  getGap,
  createGap,
  updateGapStatus,
  type GapRow,
  type GapStatus,
  type ComplianceLevel,
  type ListGapsInput,
  type CreateGapInput,
  type UpdateGapStatusInput,
} from './application/gaps/gaps.service';
export {
  createGapsRouter,
  type GapsRouterDeps,
  type GapsRouterContext,
} from './interface/http/gaps.routes';

export {
  listAttestations,
  getAttestation,
  createAttestation,
  updateAttestationStatus,
  type AttestationRow,
  type AttestationStatus,
  type ListAttestationsInput,
  type CreateAttestationInput,
  type UpdateAttestationStatusInput,
} from './application/attestations/attestations.service';
export {
  createAttestationsRouter,
  type AttestationsRouterDeps,
  type AttestationsRouterContext,
} from './interface/http/attestations.routes';

export {
  listExceptions,
  getException,
  createException,
  updateExceptionStatus,
  type ExceptionRow,
  type ExceptionStatus,
  type ListExceptionsInput,
  type CreateExceptionInput,
  type UpdateExceptionStatusInput,
} from './application/exceptions/exceptions.service';
export {
  createExceptionsRouter,
  type ExceptionsRouterDeps,
  type ExceptionsRouterContext,
} from './interface/http/exceptions.routes';

export {
  listEvidenceLinks,
  getEvidenceLink,
  createEvidenceLink,
  verifyEvidenceLink,
  type EvidenceLinkRow,
  type EvidenceLinkType,
  type ListEvidenceLinksInput,
  type CreateEvidenceLinkInput,
  type VerifyEvidenceLinkInput,
} from './application/evidence-links/evidence-links.service';
export {
  createEvidenceLinksRouter,
  type EvidenceLinksRouterDeps,
  type EvidenceLinksRouterContext,
} from './interface/http/evidence-links.routes';

export {
  listRegulatoryChanges,
  getRegulatoryChange,
  createRegulatoryChange,
  updateRegulatoryChangeStatus,
  type RegulatoryChangeRow,
  type RegulatoryChangeStatus,
  type ListRegulatoryChangesInput,
  type CreateRegulatoryChangeInput,
  type UpdateRegulatoryChangeStatusInput,
} from './application/regulatory-changes/regulatory-changes.service';
export {
  createRegulatoryChangesRouter,
  type RegulatoryChangesRouterDeps,
  type RegulatoryChangesRouterContext,
} from './interface/http/regulatory-changes.routes';

export {
  listMonitoring,
  getMonitoring,
  createMonitoring,
  recordMonitoringCheck,
  type MonitoringRow,
  type MonitoringStatus,
  type ListMonitoringInput,
  type CreateMonitoringInput,
  type RecordMonitoringCheckInput,
} from './application/monitoring/monitoring.service';
export {
  createMonitoringRouter,
  type MonitoringRouterDeps,
  type MonitoringRouterContext,
} from './interface/http/monitoring.routes';

export {
  listPostureScores,
  getPostureScore,
  recordPostureScore,
  type PostureScoreRow,
  type ListPostureScoresInput,
  type RecordPostureScoreInput,
} from './application/posture-scores/posture-scores.service';
export {
  createPostureScoresRouter,
  type PostureScoresRouterDeps,
  type PostureScoresRouterContext,
} from './interface/http/posture-scores.routes';

export {
  listRoadmap,
  getRoadmap,
  createRoadmap,
  updateRoadmapStatus,
  type RoadmapRow,
  type RoadmapStatus,
  type ListRoadmapInput,
  type CreateRoadmapInput,
  type UpdateRoadmapStatusInput,
} from './application/roadmap/roadmap.service';
export {
  createRoadmapRouter,
  type RoadmapRouterDeps,
  type RoadmapRouterContext,
} from './interface/http/roadmap.routes';

export {
  listCalendar,
  getCalendar,
  createCalendar,
  updateCalendarStatus,
  type CalendarRow,
  type CalendarStatus,
  type ListCalendarInput,
  type CreateCalendarInput,
  type UpdateCalendarStatusInput,
} from './application/calendar/calendar.service';
export {
  createCalendarRouter,
  type CalendarRouterDeps,
  type CalendarRouterContext,
} from './interface/http/calendar.routes';

export {
  listPrograms,
  getProgram,
  createProgram,
  updateProgramStatus,
  type ProgramRow,
  type ProgramStatus,
  type ListProgramsInput,
  type CreateProgramInput,
  type UpdateProgramStatusInput,
} from './application/programs/programs.service';
export {
  createProgramsRouter,
  type ProgramsRouterDeps,
  type ProgramsRouterContext,
} from './interface/http/programs.routes';

export {
  listControlsMapping,
  getControlMapping,
  createControlMapping,
  recordControlTest,
  type ControlMappingRow,
  type MappingStatus,
  type Effectiveness,
  type ListControlsMappingInput,
  type CreateControlMappingInput,
  type RecordTestInput,
} from './application/controls-mapping/controls-mapping.service';
export {
  createControlsMappingRouter,
  type ControlsMappingRouterDeps,
  type ControlsMappingRouterContext,
} from './interface/http/controls-mapping.routes';

export {
  listKpis,
  getKpi,
  createKpi,
  recordKpiValue,
  type KpiRow,
  type KpiTrend,
  type ListKpisInput,
  type CreateKpiInput,
  type RecordKpiValueInput,
} from './application/kpis/kpis.service';
export {
  createKpisRouter,
  type KpisRouterDeps,
  type KpisRouterContext,
} from './interface/http/kpis.routes';

export {
  listSettings,
  getSetting,
  getSettingByKey,
  upsertSetting,
  deactivateSetting,
  type SettingRow,
  type SettingScope,
  type ListSettingsInput,
  type UpsertSettingInput,
  type DeactivateSettingInput,
} from './application/settings/settings.service';
export {
  createSettingsRouter,
  type SettingsRouterDeps,
  type SettingsRouterContext,
} from './interface/http/settings.routes';

export {
  listAttachments,
  getAttachment,
  createAttachment,
  deleteAttachment,
  type AttachmentRow,
  type ListAttachmentsInput,
  type CreateAttachmentInput,
  type DeleteAttachmentInput,
} from './application/attachments/attachments.service';
export {
  createAttachmentsRouter,
  type AttachmentsRouterDeps,
  type AttachmentsRouterContext,
} from './interface/http/attachments.routes';

export {
  listComments,
  getComment,
  createComment,
  resolveComment,
  type CommentRow,
  type ListCommentsInput,
  type CreateCommentInput,
  type ResolveCommentInput,
} from './application/comments/comments.service';
export {
  createCommentsRouter,
  type CommentsRouterDeps,
  type CommentsRouterContext,
} from './interface/http/comments.routes';

export {
  listTags,
  getTag,
  createTag,
  deleteTag,
  type TagRow,
  type ListTagsInput,
  type CreateTagInput,
  type DeleteTagInput,
} from './application/tags/tags.service';
export {
  createTagsRouter,
  type TagsRouterDeps,
  type TagsRouterContext,
} from './interface/http/tags.routes';

export {
  listChangeLog,
  getChangeLog,
  recordChange,
  type ChangeLogRow,
  type ListChangeLogInput,
  type RecordChangeInput,
} from './application/change-log/change-log.service';
export {
  createChangeLogRouter,
  type ChangeLogRouterDeps,
  type ChangeLogRouterContext,
} from './interface/http/change-log.routes';

export {
  listExternalMappings,
  getExternalMapping,
  createExternalMapping,
  recordSync,
  deleteExternalMapping,
  type ExternalMappingRow,
  type SyncStatus,
  type ListExternalMappingsInput,
  type CreateExternalMappingInput,
  type RecordSyncInput,
  type DeleteExternalMappingInput,
} from './application/external-mappings/external-mappings.service';
export {
  createExternalMappingsRouter,
  type ExternalMappingsRouterDeps,
  type ExternalMappingsRouterContext,
} from './interface/http/external-mappings.routes';

export {
  listReportSnapshots,
  getReportSnapshot,
  createReportSnapshot,
  deleteReportSnapshot,
  type ReportSnapshotRow,
  type ListReportSnapshotsInput,
  type CreateReportSnapshotInput,
  type DeleteReportSnapshotInput,
} from './application/report-snapshots/report-snapshots.service';
export {
  createReportSnapshotsRouter,
  type ReportSnapshotsRouterDeps,
  type ReportSnapshotsRouterContext,
} from './interface/http/report-snapshots.routes';

export {
  listAiSuggestions,
  getAiSuggestion,
  createAiSuggestion,
  reviewSuggestion,
  type AiSuggestionRow,
  type SuggestionStatus,
  type ListAiSuggestionsInput,
  type CreateAiSuggestionInput,
  type ReviewSuggestionInput,
} from './application/ai-suggestions/ai-suggestions.service';
export {
  createAiSuggestionsRouter,
  type AiSuggestionsRouterDeps,
  type AiSuggestionsRouterContext,
} from './interface/http/ai-suggestions.routes';

export {
  listVersions,
  getVersion,
  getLatestVersion,
  recordVersion,
  type VersionRow,
  type ListVersionsInput,
  type RecordVersionInput,
} from './application/versions/versions.service';
export {
  createVersionsRouter,
  type VersionsRouterDeps,
  type VersionsRouterContext,
} from './interface/http/versions.routes';

export {
  listDeficiencies,
  getDeficiency,
  createDeficiency,
  updateDeficiencyStatus,
  deleteDeficiency,
  type ControlDeficiencyRow,
  type DeficiencyStatus,
  type DeficiencySeverity,
  type ListDeficienciesInput,
  type CreateDeficiencyInput,
  type UpdateDeficiencyStatusInput,
} from './application/control-deficiencies/control-deficiencies.service';
export {
  createControlDeficienciesRouter,
  type ControlDeficienciesRouterDeps,
  type ControlDeficienciesRouterContext,
} from './interface/http/control-deficiencies.routes';

export {
  listEffectiveness,
  getEffectiveness,
  getLatestEffectiveness,
  createEffectiveness,
  type ControlEffectivenessRow,
  type AssessmentType,
  type EffectivenessRating,
  type ListEffectivenessInput,
  type CreateEffectivenessInput,
} from './application/control-effectiveness/control-effectiveness.service';
export {
  createControlEffectivenessRouter,
  type ControlEffectivenessRouterDeps,
  type ControlEffectivenessRouterContext,
} from './interface/http/control-effectiveness.routes';

export {
  listScopeTags,
  getScopeTag,
  upsertScopeTag,
  signOffScopeTag,
  deleteScopeTag,
  type ControlScopeTagRow,
  type ListScopeTagsInput,
  type UpsertScopeTagInput,
  type SignOffScopeTagInput,
} from './application/control-scope-tags/control-scope-tags.service';
export {
  createControlScopeTagsRouter,
  type ControlScopeTagsRouterDeps,
  type ControlScopeTagsRouterContext,
} from './interface/http/control-scope-tags.routes';

export {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  recordExecution,
  deleteSchedule,
  type ControlTestScheduleRow,
  type TestFrequency,
  type TestResult,
  type ListSchedulesInput,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type RecordExecutionInput,
} from './application/control-test-schedules/control-test-schedules.service';
export {
  createControlTestSchedulesRouter,
  type ControlTestSchedulesRouterDeps,
  type ControlTestSchedulesRouterContext,
} from './interface/http/control-test-schedules.routes';

export {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  type AttestationCampaignRow,
  type CampaignEntityType,
  type CampaignStatus,
  type ListCampaignsInput,
  type CreateCampaignInput,
  type UpdateCampaignStatusInput,
} from './application/attestation-campaigns/attestation-campaigns.service';
export {
  createAttestationCampaignsRouter,
  type AttestationCampaignsRouterDeps,
  type AttestationCampaignsRouterContext,
} from './interface/http/attestation-campaigns.routes';

export {
  listRecords,
  getRecord,
  createRecord,
  attestRecord,
  remindRecord,
  deleteRecord,
  type AttestationRecordRow,
  type RecordStatus,
  type ListRecordsInput,
  type CreateRecordInput,
  type AttestRecordInput,
} from './application/attestation-records/attestation-records.service';
export {
  createAttestationRecordsRouter,
  type AttestationRecordsRouterDeps,
  type AttestationRecordsRouterContext,
} from './interface/http/attestation-records.routes';

export {
  listDrafts,
  getDraft,
  createDraft,
  reviewDraft,
  deleteDraft,
  type AttestationDraftRow,
  type DraftEntityType,
  type DraftStatus,
  type ListDraftsInput,
  type CreateDraftInput,
  type ReviewDraftInput,
} from './application/attestation-drafts/attestation-drafts.service';
export {
  createAttestationDraftsRouter,
  type AttestationDraftsRouterDeps,
  type AttestationDraftsRouterContext,
} from './interface/http/attestation-drafts.routes';

export {
  listCsaCampaigns,
  getCsaCampaign,
  createCsaCampaign,
  updateCsaCampaignStatus,
  deleteCsaCampaign,
  type CsaCampaignRow,
  type CsaCampaignStatus,
  type ListCsaCampaignsInput,
  type CreateCsaCampaignInput,
  type UpdateCsaCampaignStatusInput,
} from './application/csa-campaigns/csa-campaigns.service';
export {
  createCsaCampaignsRouter,
  type CsaCampaignsRouterDeps,
  type CsaCampaignsRouterContext,
} from './interface/http/csa-campaigns.routes';

export {
  listCsaResponses,
  getCsaResponse,
  createCsaResponse,
  type CsaResponseRow,
  type CsaEffectivenessRating,
  type ListCsaResponsesInput,
  type CreateCsaResponseInput,
} from './application/csa-responses/csa-responses.service';
export {
  createCsaResponsesRouter,
  type CsaResponsesRouterDeps,
  type CsaResponsesRouterContext,
} from './interface/http/csa-responses.routes';

export {
  listUcfControls,
  getUcfControl,
  createUcfControl,
  updateUcfControl,
  updateUcfLifecycle,
  deleteUcfControl,
  type UcfControlRow,
  type UcfLifecycleState,
  type ListUcfControlsInput,
  type CreateUcfControlInput,
  type UpdateUcfControlInput,
  type UpdateUcfLifecycleInput,
} from './application/ucf-controls/ucf-controls.service';
export {
  createUcfControlsRouter,
  type UcfControlsRouterDeps,
  type UcfControlsRouterContext,
} from './interface/http/ucf-controls.routes';

export {
  listCrosswalkMappings,
  getCrosswalkMapping,
  createCrosswalkMapping,
  deleteCrosswalkMapping,
  type CrosswalkMappingRow,
  type CrosswalkRelationship,
  type ListCrosswalkMappingsInput,
  type CreateCrosswalkMappingInput,
} from './application/crosswalk-mappings/crosswalk-mappings.service';
export {
  createCrosswalkMappingsRouter,
  type CrosswalkMappingsRouterDeps,
  type CrosswalkMappingsRouterContext,
} from './interface/http/crosswalk-mappings.routes';

export {
  listSodConflicts,
  getSodConflict,
  createSodConflict,
  deleteSodConflict,
  type SodConflictRow,
  type SodConflictType,
  type SodSeverity,
  type ListSodConflictsInput,
  type CreateSodConflictInput,
} from './application/sod-conflict-matrix/sod-conflict-matrix.service';
export {
  createSodConflictMatrixRouter,
  type SodConflictMatrixRouterDeps,
  type SodConflictMatrixRouterContext,
} from './interface/http/sod-conflict-matrix.routes';

export {
  listEntities,
  getEntity,
  createEntity,
  updateEntityStatus,
  deleteEntity,
  type EntityRow,
  type EntityType,
  type EntityStatus,
  type ListEntitiesInput,
  type CreateEntityInput,
  type UpdateEntityStatusInput,
} from './application/entities/entities.service';
export {
  createEntitiesRouter,
  type EntitiesRouterDeps,
  type EntitiesRouterContext,
} from './interface/http/entities.routes';

export {
  listFindings,
  getFinding,
  createFinding,
  updateFindingStatus,
  deleteFinding,
  type FindingRow,
  type FindingSeverity,
  type FindingSource,
  type FindingStatus,
  type ListFindingsInput,
  type CreateFindingInput,
  type UpdateFindingStatusInput,
} from './application/findings/findings.service';
export {
  createFindingsRouter,
  type FindingsRouterDeps,
  type FindingsRouterContext,
} from './interface/http/findings.routes';

export {
  listEvidenceFiles,
  getEvidenceFile,
  createEvidenceFile,
  updateEvidenceFileStatus,
  deleteEvidenceFile,
  type EvidenceFileRow,
  type EvidenceFileStatus,
  type ListEvidenceFilesInput,
  type CreateEvidenceFileInput,
  type UpdateEvidenceFileStatusInput,
} from './application/evidence-files/evidence-files.service';
export {
  createEvidenceFilesRouter,
  type EvidenceFilesRouterDeps,
  type EvidenceFilesRouterContext,
} from './interface/http/evidence-files.routes';

export {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspaceStatus,
  deleteWorkspace,
  type WorkspaceRow,
  type WorkspaceStatus,
  type ListWorkspacesInput,
  type CreateWorkspaceInput,
  type UpdateWorkspaceStatusInput,
} from './application/workspaces/workspaces.service';
export {
  createWorkspacesRouter,
  type WorkspacesRouterDeps,
  type WorkspacesRouterContext,
} from './interface/http/workspaces.routes';

export {
  listInstrumentNodes,
  getInstrumentNode,
  createInstrumentNode,
  deleteInstrumentNode,
  type InstrumentNodeRow,
  type InstrumentNodeType,
  type ListInstrumentNodesInput,
  type CreateInstrumentNodeInput,
} from './application/instrument-structure/instrument-structure.service';
export {
  createInstrumentStructureRouter,
  type InstrumentStructureRouterDeps,
  type InstrumentStructureRouterContext,
} from './interface/http/instrument-structure.routes';

export {
  listSectors,
  getSector,
  createSector,
  deleteSector,
  type SectorRow,
  type SectorStatus,
  type ListSectorsInput,
  type CreateSectorInput,
} from './application/sectors/sectors.service';
export {
  createSectorsRouter,
  type SectorsRouterDeps,
  type SectorsRouterContext,
} from './interface/http/sectors.routes';

export {
  listFrameworkSectorApplicability,
  getFrameworkSectorApplicability,
  createFrameworkSectorApplicability,
  deleteFrameworkSectorApplicability,
  type FrameworkSectorApplicabilityRow,
  type Applicability,
  type ListFrameworkSectorApplicabilityInput,
  type CreateFrameworkSectorApplicabilityInput,
} from './application/framework-sector-applicability/framework-sector-applicability.service';
export {
  createFrameworkSectorApplicabilityRouter,
  type FrameworkSectorApplicabilityRouterDeps,
  type FrameworkSectorApplicabilityRouterContext,
} from './interface/http/framework-sector-applicability.routes';

export {
  listRegulatorBulletins,
  getRegulatorBulletin,
  createRegulatorBulletin,
  updateRegulatorBulletinStatus,
  deleteRegulatorBulletin,
  type RegulatorBulletinRow,
  type BulletinSeverity,
  type BulletinStatus,
  type ListRegulatorBulletinsInput,
  type CreateRegulatorBulletinInput,
  type UpdateRegulatorBulletinStatusInput,
} from './application/regulator-bulletins/regulator-bulletins.service';
export {
  createRegulatorBulletinsRouter,
  type RegulatorBulletinsRouterDeps,
  type RegulatorBulletinsRouterContext,
} from './interface/http/regulator-bulletins.routes';

export {
  listSubmissionPackets,
  getSubmissionPacket,
  createSubmissionPacket,
  updateSubmissionPacketStatus,
  deleteSubmissionPacket,
  type SubmissionPacketRow,
  type PacketStatus,
  type ListSubmissionPacketsInput,
  type CreateSubmissionPacketInput,
  type UpdateSubmissionPacketStatusInput,
} from './application/submission-packets/submission-packets.service';
export {
  createSubmissionPacketsRouter,
  type SubmissionPacketsRouterDeps,
  type SubmissionPacketsRouterContext,
} from './interface/http/submission-packets.routes';

export {
  listBilingualContent,
  getBilingualContent,
  createBilingualContent,
  updateBilingualContentStatus,
  deleteBilingualContent,
  type BilingualContentRow,
  type ContentLanguage,
  type ContentStatus,
  type ListBilingualContentInput,
  type CreateBilingualContentInput,
  type UpdateBilingualContentStatusInput,
} from './application/bilingual-content/bilingual-content.service';
export {
  createBilingualContentRouter,
  type BilingualContentRouterDeps,
  type BilingualContentRouterContext,
} from './interface/http/bilingual-content.routes';

export {
  listUniverseNodes,
  getUniverseNode,
  createUniverseNode,
  updateUniverseNodeStatus,
  deleteUniverseNode,
  type UniverseNodeRow,
  type UniverseNodeType,
  type UniverseNodeStatus,
  type ListUniverseNodesInput,
  type CreateUniverseNodeInput,
  type UpdateUniverseNodeStatusInput,
} from './application/compliance-universe/compliance-universe.service';
export {
  createComplianceUniverseRouter,
  type ComplianceUniverseRouterDeps,
  type ComplianceUniverseRouterContext,
} from './interface/http/compliance-universe.routes';

export {
  listCalculations,
  getCalculation,
  getLatestCalculation,
  runCalculation,
  type CalculationRow,
  type CalculationScope,
  type ListCalculationsInput,
  type RunCalculationInput,
} from './application/compliance-calculator/compliance-calculator.service';
export {
  createComplianceCalculatorRouter,
  type ComplianceCalculatorRouterDeps,
  type ComplianceCalculatorRouterContext,
} from './interface/http/compliance-calculator.routes';

export {
  listContentPackImports,
  getContentPackImport,
  loadContentPack,
  hashPack,
  type ImportRow,
  type ImportStatus,
  type ContentPack,
  type ContentPackFrameworkSpec,
  type ContentPackRequirementSpec,
  type ContentPackInstrumentSpec,
  type LoadContentPackInput,
  type ListImportsInput,
} from './application/content-pack-loader/content-pack-loader.service';
export {
  createContentPackLoaderRouter,
  type ContentPackLoaderRouterDeps,
  type ContentPackLoaderRouterContext,
} from './interface/http/content-pack-loader.routes';

export {
  listDriftRecords,
  runDriftDetection,
  diffBaselineFrameworks,
  diffBaselineRequirements,
  type DriftRecordRow,
  type DriftEntityType,
  type DriftKind,
  type DriftBaseline,
  type BaselineFramework,
  type BaselineRequirement,
  type ListDriftRecordsInput,
  type RunDriftDetectionInput,
} from './application/drift-detector/drift-detector.service';
export {
  createDriftDetectorRouter,
  type DriftDetectorRouterDeps,
  type DriftDetectorRouterContext,
} from './interface/http/drift-detector.routes';

export {
  listOutboxEvents,
  getOutboxEvent,
  publishEvent,
  markDispatched,
  markFailed,
  dispatchPendingEvents,
  type OutboxRow,
  type OutboxStatus,
  type PublishEventInput,
  type ListOutboxInput,
  type DispatchInput,
} from './application/event-publisher/event-publisher.service';
export {
  createEventPublisherRouter,
  type EventPublisherRouterDeps,
  type EventPublisherRouterContext,
} from './interface/http/event-publisher.routes';

export {
  listEvaluations,
  getEvaluation,
  evaluateSod,
  deriveVerdict,
  type SodVerdict,
  type SodConflictHit,
  type SodEvaluationRow,
  type ListEvaluationsInput,
  type EvaluateInput,
} from './application/sod-runtime/sod-runtime.service';
export {
  createSodRuntimeRouter,
  type SodRuntimeRouterDeps,
  type SodRuntimeRouterContext,
} from './interface/http/sod-runtime.routes';

export {
  listRemediationActions,
  getRemediationAction,
  createFromFinding,
  updateActionStatus,
  type RemediationActionRow,
  type RemediationStatus,
  type RemediationPriority,
  type CreateFromFindingInput,
  type ListActionsInput,
  type UpdateStatusInput,
} from './application/findings-remediation-bridge/findings-remediation-bridge.service';
export {
  createFindingsRemediationBridgeRouter,
  type FindingsRemediationBridgeRouterDeps,
  type FindingsRemediationBridgeRouterContext,
} from './interface/http/findings-remediation-bridge.routes';

export {
  requestIdMiddleware,
  rateLimitMiddleware,
  type RequestIdOptions,
  type RateLimitOptions,
  type RateLimitMiddleware,
} from './application/hardening/hardening.middleware';

export {
  listDecisions,
  getDecision,
  resolveApprovalChain,
  buildChain,
  type ApprovalOutcome,
  type ApprovalChainStep,
  type ApprovalDecisionRow,
  type ResolveInput,
  type ListDecisionsInput,
} from './application/approval-matrix-runtime/approval-matrix-runtime.service';
export {
  createApprovalMatrixRuntimeRouter,
  type ApprovalMatrixRuntimeRouterDeps,
  type ApprovalMatrixRuntimeRouterContext,
} from './interface/http/approval-matrix-runtime.routes';

export {
  listRuns,
  executeRun,
  createDispatcherJob,
  type DispatcherStatus,
  type DispatcherRun,
  type DispatcherJobOptions,
  type DispatcherJobHandle,
} from './application/outbox-dispatcher-job/outbox-dispatcher-job.service';
export {
  createOutboxDispatcherJobRouter,
  type OutboxDispatcherJobRouterDeps,
  type OutboxDispatcherJobRouterContext,
} from './interface/http/outbox-dispatcher-job.routes';

export {
  computeBackoffMs,
  planRetries,
  listRetryDecisions,
  type RetryAction,
  type RetryDecisionRow,
  type RetryPolicy,
  type PlanRetriesInput,
  type PlanRetriesResult,
  type ListRetryDecisionsInput,
} from './application/retry-backoff-policy/retry-backoff-policy.service';
export {
  createRetryBackoffPolicyRouter,
  type RetryBackoffPolicyRouterDeps,
  type RetryBackoffPolicyRouterContext,
} from './interface/http/retry-backoff-policy.routes';

export {
  listDlq,
  getDlq,
  moveToDlq,
  replayDlq,
  archiveDlq,
  DLQ_STATUSES,
  type DlqStatus,
  type DlqRow,
  type MoveToDlqInput,
  type ListDlqInput,
  type ReplayDlqInput,
  type ArchiveDlqInput,
} from './application/dead-letter-queue/dead-letter-queue.service';
export {
  createDeadLetterQueueRouter,
  type DeadLetterQueueRouterDeps,
  type DeadLetterQueueRouterContext,
} from './interface/http/dead-letter-queue.routes';

export {
  runRetention,
  listRetentionRuns,
  planEntity,
  isSupportedEntityType,
  RETENTION_SUPPORTED_ENTITIES,
  RETENTION_RUN_STATUSES,
  RETENTION_MODES,
  type RetentionMode,
  type RetentionRunStatus,
  type RetentionPolicyRule,
  type RetentionEntityResult,
  type RetentionRunRow,
  type RunRetentionInput,
  type ListRunsInput as RetentionListRunsInput,
} from './application/retention-policy/retention-policy.service';
export {
  createRetentionPolicyRouter,
  type RetentionPolicyRouterDeps,
  type RetentionPolicyRouterContext,
} from './interface/http/retention-policy.routes';

export {
  enqueueNotification,
  listNotifications,
  getNotification,
  cancelNotification,
  dispatchQueued,
  markSent as markNotificationSent,
  markFailed as markNotificationFailed,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationStatus,
  type NotificationRow,
  type EnqueueInput as EnqueueNotificationInput,
  type ListNotificationsInput,
  type DispatchInput as DispatchNotificationsInput,
  type DispatchResult as DispatchNotificationsResult,
  type CancelInput as CancelNotificationInput,
} from './application/notification-dispatcher/notification-dispatcher.service';
export {
  createNotificationDispatcherRouter,
  type NotificationDispatcherRouterDeps,
  type NotificationDispatcherRouterContext,
} from './interface/http/notification-dispatcher.routes';

export {
  createDefinition,
  getDefinition,
  listDefinitions,
  startInstance,
  getInstance,
  listInstances,
  listTransitions,
  triggerEvent,
  terminateInstance,
  findTransition,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
  type WorkflowDefinition,
  type WorkflowTransitionRule,
  type WorkflowDefinitionRow,
  type WorkflowInstanceRow,
  type WorkflowTransitionRow,
  type CreateDefinitionInput,
  type StartInstanceInput,
  type TriggerEventInput,
  type ListDefinitionsInput,
  type ListInstancesInput,
  type TriggerResult,
} from './application/workflow-runtime/workflow-runtime.service';
export {
  createWorkflowRuntimeRouter,
  type WorkflowRuntimeRouterDeps,
  type WorkflowRuntimeRouterContext,
} from './interface/http/workflow-runtime.routes';

export {
  runArchive,
  listArchiveRuns,
  ARCHIVE_RUN_STATUSES,
  type ArchiveRunStatus,
  type ArchiveRunRow,
  type RunArchiveInput,
  type ListArchiveRunsInput,
} from './application/outbox-archive/outbox-archive.service';
export {
  createOutboxArchiveRouter,
  type OutboxArchiveRouterDeps,
  type OutboxArchiveRouterContext,
} from './interface/http/outbox-archive.routes';

export {
  recordMigration,
  getMigration,
  listMigrations,
  rollbackMigration,
  MIGRATION_STATUSES,
  type MigrationStatus,
  type MigrationRow,
  type RecordMigrationInput,
  type ListMigrationsInput,
  type RollbackInput as RollbackMigrationInput,
} from './application/schema-migration-tracker/schema-migration-tracker.service';
export {
  createSchemaMigrationTrackerRouter,
  type SchemaMigrationTrackerRouterDeps,
  type SchemaMigrationTrackerRouterContext,
} from './interface/http/schema-migration-tracker.routes';

export {
  listAuditEvents,
  countAuditEvents,
  encodeCursor as encodeAuditCursor,
  decodeCursor as decodeAuditCursor,
  type AuditEventRow,
  type StreamCursor as AuditStreamCursor,
  type ListAuditEventsInput,
  type ListAuditEventsResult,
} from './application/audit-log-stream/audit-log-stream.service';
export {
  createAuditLogStreamRouter,
  type AuditLogStreamRouterDeps,
  type AuditLogStreamRouterContext,
} from './interface/http/audit-log-stream.routes';

export {
  upsertJob as upsertScheduledJob,
  getJob as getScheduledJob,
  listJobs as listScheduledJobs,
  listJobRuns as listScheduledJobRuns,
  runDue as runDueScheduledJobs,
  isDue as isScheduledJobDue,
  SCHEDULED_JOB_RUN_STATUSES,
  type ScheduledJobRunStatus,
  type ScheduledJobRow,
  type ScheduledJobRunRow,
  type UpsertJobInput as UpsertScheduledJobInput,
  type ListJobsInput as ListScheduledJobsInput,
  type ListJobRunsInput as ListScheduledJobRunsInput,
  type RunDueInput as RunDueScheduledJobsInput,
  type RunDueResult as RunDueScheduledJobsResult,
} from './application/scheduled-jobs-runner/scheduled-jobs-runner.service';
export {
  createScheduledJobsRunnerRouter,
  type ScheduledJobsRunnerRouterDeps,
  type ScheduledJobsRunnerRouterContext,
} from './interface/http/scheduled-jobs-runner.routes';

export {
  createSubscription as createWebhookSubscription,
  getSubscription as getWebhookSubscription,
  listSubscriptions as listWebhookSubscriptions,
  changeStatus as changeWebhookSubscriptionStatus,
  dispatchEvent as dispatchWebhookEvent,
  listDeliveries as listWebhookDeliveries,
  type SubscriptionStatus as WebhookSubscriptionStatus,
  type DeliveryStatus as WebhookDeliveryStatus,
  type WebhookSubscriptionRow,
  type WebhookDeliveryRow,
  type CreateSubscriptionInput as CreateWebhookSubscriptionInput,
  type ChangeStatusInput as ChangeWebhookSubscriptionStatusInput,
  type ListSubscriptionsInput as ListWebhookSubscriptionsInput,
  type DispatchEventInput as DispatchWebhookEventInput,
  type DispatchEventResult as DispatchWebhookEventResult,
  type ListDeliveriesInput as ListWebhookDeliveriesInput,
} from './application/webhook-subscriptions/webhook-subscriptions.service';
export {
  createWebhookSubscriptionsRouter,
  type WebhookSubscriptionsRouterDeps,
  type WebhookSubscriptionsRouterContext,
} from './interface/http/webhook-subscriptions.routes';

export {
  recordResult as recordIdempotencyResult,
  lookup as lookupIdempotencyKey,
  purgeExpired as purgeExpiredIdempotencyKeys,
  listKeys as listIdempotencyKeys,
  isExpired as isIdempotencyExpired,
  type IdempotencyRow,
  type RecordResultInput as RecordIdempotencyResultInput,
  type RecordResultResult as RecordIdempotencyResultResult,
  type LookupInput as LookupIdempotencyKeyInput,
  type PurgeExpiredInput as PurgeExpiredIdempotencyInput,
  type PurgeExpiredResult as PurgeExpiredIdempotencyResult,
} from './application/idempotency-keys/idempotency-keys.service';
export {
  createIdempotencyKeysRouter,
  type IdempotencyKeysRouterDeps,
  type IdempotencyKeysRouterContext,
} from './interface/http/idempotency-keys.routes';

export {
  upsertFlag as upsertFeatureFlag,
  getFlag as getFeatureFlag,
  listFlags as listFeatureFlags,
  deleteFlag as deleteFeatureFlag,
  evaluate as evaluateFeatureFlag,
  bucket as featureFlagBucket,
  FEATURE_FLAG_REASONS,
  type FeatureFlagRow,
  type EvaluationReason as FeatureFlagEvaluationReason,
  type UpsertFlagInput as UpsertFeatureFlagInput,
  type EvaluateInput as EvaluateFeatureFlagInput,
  type EvaluateResult as EvaluateFeatureFlagResult,
  type ListFlagsInput as ListFeatureFlagsInput,
} from './application/feature-flags/feature-flags.service';
export {
  createFeatureFlagsRouter,
  type FeatureFlagsRouterDeps,
  type FeatureFlagsRouterContext,
} from './interface/http/feature-flags.routes';

export {
  issueKey as issueApiKey,
  getKey as getApiKey,
  listKeys as listApiKeys,
  verifyKey as verifyApiKey,
  revokeKey as revokeApiKey,
  hashPlaintext as hashApiKeyPlaintext,
  generatePlaintext as generateApiKeyPlaintext,
  generateKeyId as generateApiKeyId,
  API_KEY_STATUSES,
  API_KEY_VERIFY_REASONS,
  type ApiKeyRow,
  type ApiKeyStatus,
  type VerifyReason as ApiKeyVerifyReason,
  type IssueKeyInput as IssueApiKeyInput,
  type IssueKeyResult as IssueApiKeyResult,
  type VerifyKeyInput as VerifyApiKeyInput,
  type VerifyKeyResult as VerifyApiKeyResult,
  type RevokeKeyInput as RevokeApiKeyInput,
  type ListKeysInput as ListApiKeysInput,
} from './application/api-keys/api-keys.service';
export {
  createApiKeysRouter,
  type ApiKeysRouterDeps,
  type ApiKeysRouterContext,
} from './interface/http/api-keys.routes';

export {
  upsertPolicy as upsertRateLimitPolicy,
  getPolicy as getRateLimitPolicy,
  listPolicies as listRateLimitPolicies,
  deletePolicy as deleteRateLimitPolicy,
  consume as consumeRateLimit,
  check as checkRateLimit,
  purgeExpiredCounters as purgeExpiredRateLimitCounters,
  windowStartFor as rateLimitWindowStartFor,
  RATE_LIMIT_SUBJECT_KINDS,
  type RateLimitPolicyRow,
  type RateLimitCounterRow,
  type SubjectKind as RateLimitSubjectKind,
  type UpsertPolicyInput as UpsertRateLimitPolicyInput,
  type ConsumeInput as ConsumeRateLimitInput,
  type ConsumeResult as RateLimitConsumeResult,
  type CheckInput as CheckRateLimitInput,
} from './application/rate-limit-policies/rate-limit-policies.service';
export {
  createRateLimitPoliciesRouter,
  type RateLimitPoliciesRouterDeps,
  type RateLimitPoliciesRouterContext,
} from './interface/http/rate-limit-policies.routes';

export const COMPLIANCE_CONTRACT_VERSION = 'v1' as const;
