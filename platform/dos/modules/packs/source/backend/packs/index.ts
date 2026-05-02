// ── Packs Module -- Barrel Export ──────────────────────────────────

// Lifecycle registry registration (side-effect -- Design Freeze Section 15)
import './lifecycle-registration';

// Runtime exports
export { PACKS_POLICY } from './policies/packs.policies';
export { PACKS_LIMITS, PACKS_TIMEOUTS, PACKS_SLA_DEFAULTS, PACKS_THRESHOLDS, PACK_INSTALL_ORDER, PACKS_DEFAULT_SETTINGS } from './data/packs-constants';
export { getPacksJobs } from './jobs/packs-monitor.job';
export { toCatalogEntry, toInstallationRecord, toDashboardSummary, toAudienceShaped, toAdminResponse, redactForAudit, toAuditEntry } from './mappers/packs.mapper';

// Event contracts
export { PACKS_EVENT_CONTRACT, PACKS_PUBLISHED_EVENTS, PACKS_CONSUMED_EVENTS, PACKS_EVENT_ORDERING, PACKS_EVENT_SECURITY, PACKS_EVENT_CORRELATION } from './events/packs.events';

// Publishers
export { publish as emitPacksEvent, emitPackInstalled, emitPackUpdated, emitPackUninstalled, emitPackInstallFailed, emitCatalogSynced, emitCompatibilityChecked } from './events/packs.publishers';

// Subscribers
export { registerPacksEventSubscribers, getSubscriptionHandlers } from './events/packs.subscribers';

// Schemas
export { installPackBody, evaluatePoliciesBody } from './schemas/packs.schemas';

// Contracts
export type { PacksListParams, PacksListResponse, PacksDetailResponse, PacksMutationResponse, PackCatalogContract, PackInstallationContract, PackUninstallContract, PackCompatibilityContract, InstalledPacksContract, PackUpdatesContract, PacksDiagnosticsContract, PacksAdminSettingsContract } from './contracts/packs.contract';

// Diagnostics
export { runDiagnostics, getPacksMetrics, getDependencyDiagnostics } from './diagnostics/packs-diagnostics.service';
export type { DiagnosticsResult } from './diagnostics/packs-diagnostics.service';

// Admin routes
export { default as packsAdminRoutes } from './admin/packs-admin.routes';

// Type exports
export type { PackLifecycleState, PackInstallationStatus, PackCategory, PacksEventPayload, PackCompatibilityResult, PackHealthCheck, PackDashboardSummary, PackCatalogEntry, PackInstallationRecord, PackStatusReason, PackSource } from './types/packs.types';
export { PACK_LIFECYCLE_STATES, PACK_INSTALLATION_STATUSES, TERMINAL_PACK_STATES, ACTIVE_PACK_STATES, PACK_CATEGORIES } from './types/packs.types';

// AI layer
export { PACKS_AI_CONFIG, recommendPacks, analyzePackImpact, explainCompatibility, analyzePackHealth, isPacksAiActionAllowed, isPacksAiActionBlocked } from './ai/packs-ai.service';
export type { PackRecommendation, PackImpactAnalysis, CompatibilityExplanation, PackHealthAnalysis } from './ai/packs-ai.service';
