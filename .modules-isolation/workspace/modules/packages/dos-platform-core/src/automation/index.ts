/**
 * DOS Tenant Automation Engine — Canonical Barrel
 *
 * Generic per-tenant automation engine. Products register their
 * domain-specific workers via registerAutomationWorker().
 *
 * @owner DOS
 * @since 2026-03-30
 */
export {
  TenantAutomationEngine,
  tenantAutomationEngine,
  registerAutomationWorker,
  getRegisteredWorkers,
  getWorkersByOwner,
} from './tenant-automation-engine.service';
export type {
  AutomationWorker,
  AutomationRunContext,
  AutomationWorkerResult,
  AutomationRunResult,
} from './tenant-automation-engine.service';
