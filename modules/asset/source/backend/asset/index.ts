// ── Asset Module — Barrel Export ──────────────────────────────
// Runtime exports
export { ASSET_POLICY } from './policies/asset.policies';
export { ASSET_STATUSES, ASSET_DEFAULT_STATUS, ASSET_LIMITS, ASSET_TIMEOUTS, ASSET_SLA_DEFAULTS } from './data/asset-constants';
export { getAssetSeedData, seedAssetModule } from './data/asset-seed';
export { emitAssetEvent, emitAssetStatusChange } from './services/asset-event.service';
export { ASSET_AI_CONFIG, isAssetAiActionAllowed, isAssetAiActionBlocked } from './services/asset-ai.service';
export { getAssetJobs } from './jobs/asset-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/asset-workflow.service';
export * as assetQuery from './repositories/asset-query.repo';
export { default as assetAdminRoutes } from './routes/asset-admin.routes';
export { ASSET_EVENT_CONTRACT, ASSET_PUBLISHED_EVENTS, ASSET_CONSUMED_EVENTS, ASSET_EVENT_LEGACY_ALIASES, ASSET_EVENT_ORDERING, ASSET_EVENT_SECURITY, ASSET_EVENT_CORRELATION } from './events/asset.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/asset.mapper';
export { assetResponseSchema, assetListResponseSchema, assetEventPayloadSchema, assetStatusTransitionSchema, assetImportRowSchema, assetImportBatchSchema, assetExportRequestSchema, assetAdminConfigSchema, assetBulkUpdateSchema, assetBulkStatusChangeSchema } from './schemas/asset.schemas';

// Type exports
export type { AssetStatus, AssetEventPayload, AssetSource, AssetStatusReason } from '@dos/types/asset';
export type { AssetCreateDTO, AssetUpdateDTO, AssetResponseDTO, AssetListItemDTO, AssetDetailDTO, AssetAdminDTO, AssetImportDTO, AssetExportDTO, AssetSearchResultDTO, AssetAuditDTO, AssetBulkOperationDTO } from './types/asset.dto';
export type { AssetWorkflowContext } from './services/asset-workflow.service';
