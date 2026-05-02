// ── Vendor Module — Barrel Export ──────────────────────────────
// Runtime exports
export { VENDOR_POLICY } from './policies/vendor.policies';
export { VENDOR_STATUSES, VENDOR_DEFAULT_STATUS, VENDOR_LIMITS, VENDOR_TIMEOUTS, VENDOR_SLA_DEFAULTS } from './data/vendor-constants';
export { getVendorSeedData, seedVendorModule } from './data/vendor-seed';
export { emitVendorEvent, emitVendorStatusChange } from './services/vendor/vendor-event.service';
export { VENDOR_AI_CONFIG, isVendorAiActionAllowed, isVendorAiActionBlocked } from './services/vendor/vendor-ai.service';
export { getVendorJobs } from './jobs/vendor-monitor.job';
export { onWorkflowTriggered, onTaskCreated, onApprovalRequired, onEscalation, onClosure, onFailure } from './services/vendor/vendor-workflow.service';
export * as vendorQuery from './repositories/vendor-query.repo';
export { default as vendorAdminRoutes } from './routes/vendor-admin.routes';
export { VENDOR_EVENT_CONTRACT, VENDOR_PUBLISHED_EVENTS, VENDOR_CONSUMED_EVENTS, VENDOR_EVENT_LEGACY_ALIASES, VENDOR_EVENT_ORDERING, VENDOR_EVENT_SECURITY, VENDOR_EVENT_CORRELATION } from './events/vendor.events';
export { toAudienceShaped, toAdminResponse, toListItem, redactForAudit, stripFieldsForExport, toImportEntity } from './mappers/vendor.mapper';
export { vendorResponseSchema, vendorListResponseSchema, vendorEventPayloadSchema, vendorStatusTransitionSchema, vendorImportRowSchema, vendorImportBatchSchema, vendorExportRequestSchema, vendorAdminConfigSchema, vendorBulkUpdateSchema, vendorBulkStatusChangeSchema } from './schemas/vendor.schemas';

// Type exports
export type { VendorStatus, VendorEventPayload, VendorSource, VendorStatusReason } from '@dos/types/vendor';
export type { VendorCreateDTO, VendorUpdateDTO, VendorResponseDTO, VendorListItemDTO, VendorDetailDTO, VendorAdminDTO, VendorImportDTO, VendorExportDTO, VendorSearchResultDTO, VendorAuditDTO, VendorBulkOperationDTO } from './types/vendor.dto';
export type { VendorWorkflowContext } from './services/vendor/vendor-workflow.service';
