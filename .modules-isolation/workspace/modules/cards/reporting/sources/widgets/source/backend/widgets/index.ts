/**
 * Widgets Module — Public API
 *
 * @owner widgets
 * @module widgets
 */

// ── Manifest & Module Registration ──────────────────────────────────────────
export { WIDGETS_MANIFEST } from './widgets.module';
export { WIDGETS_MANIFEST_META } from './manifest/widgets.manifest';

// ── Types & Contracts ───────────────────────────────────────────────────────
export type {
  WidgetStatus, WidgetCategory, WidgetSize,
  WidgetDefinition, WidgetBundle, WidgetLayoutConfig,
  WidgetRenderContext, WidgetRenderResult,
  WidgetRequestContext, WidgetResponseDto,
  WidgetCreateDTO, WidgetUpdateDTO,
  BundleCreateDTO, BundleUpdateDTO,
  ExecutiveWidgetSummaryDto, BreachedKriDto, PolicyReviewDebtDto,
} from './types/widget.types';

export type {
  WidgetsListParams, WidgetsListResponse,
  WidgetsDetailResponse, WidgetsMutationResponse,
  WidgetRenderContract, WidgetBundleContract,
  WidgetDiagnosticsContract, WidgetRegistryCatalogContract,
} from './contracts/widgets.contract';

// ── Events ──────────────────────────────────────────────────────────────────
export {
  WIDGETS_EVENT_TYPES,
  WIDGETS_EVENT_CONTRACT,
  WIDGETS_PUBLISHED_EVENTS,
  WIDGETS_CONSUMED_EVENTS,
  WIDGETS_EVENT_ORDERING,
  WIDGETS_EVENT_SECURITY,
} from './events/widgets.events';
export type { WIDGETS_EventType } from './events/widgets.events';
export {
  emitWidgetCreated, emitWidgetUpdated,
  emitWidgetDeleted, emitWidgetStatusChanged,
} from './events/widgets.publishers';
export { registerWidgetEventSubscribers } from './events/widgets.subscribers';

// ── Services ────────────────────────────────────────────────────────────────
export { WidgetRegistryService } from './services/registry/widget-registry.service';
export { WidgetBundleService } from './services/bundle/widget-bundle.service';
export { WidgetRuntimeService } from './services/runtime/widget-runtime.service';
export { ExecutiveWidgetsService } from './services/executive/executive-widgets.service';
export { WidgetDiagnosticsService } from './diagnostics/widgets-diagnostics.service';
export { WidgetAIService } from './services/ai/widget-ai.service';
export { WidgetDashboardService } from './services/dashboard/widget-dashboard.service';

// ── Jobs ────────────────────────────────────────────────────────────────────
export { getWidgetJobs, monitorWidgetHealth, checkDataFreshness, cleanupRenderLogs, cleanupOrphanedBundles } from './jobs/widget-monitor.job';

// ── Security ────────────────────────────────────────────────────────────────
export { WIDGETS_PERMISSIONS, WIDGETS_ROLES, WIDGETS_ACTIONS } from './security/widgets.security';
export { WIDGETS_APPROVAL_MATRIX } from './security/widgets.approval-matrix';

// ── Schemas ─────────────────────────────────────────────────────────────────
export {
  createWidgetBody, updateWidgetBody, listWidgetsQuery,
  createBundleBody, updateBundleBody, listBundlesQuery,
  statusTransitionBody, widgetKeyParam,
} from './schemas/widget.schemas';

// ── Routes ──────────────────────────────────────────────────────────────────
export { default as widgetRegistryRoutes } from './routes/widget-registry.routes';
export { default as widgetBundleRoutes } from './routes/widget-bundle.routes';
export { default as widgetRuntimeRoutes } from './routes/widget-runtime.routes';
export { default as widgetExecutiveRoutes } from './routes/widget-executive.routes';
export { default as widgetDiagnosticsRoutes } from './routes/widget-diagnostics.routes';
