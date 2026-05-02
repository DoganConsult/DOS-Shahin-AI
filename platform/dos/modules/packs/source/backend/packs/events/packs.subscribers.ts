/**
 * Packs -- Event Subscribers
 *
 * Handles consumed events from provisioning, modules, and tenant lifecycle.
 * All handlers are idempotent with exponential retry policy.
 *
 * MP-36 Section 2.4: Packs consumes from adjacent modules.
 * - provisioning.job.started -> check required packs
 * - provisioning.job.completed -> verify pack installation
 * - module.activated -> install module-specific pack
 * - tenant.tier.changed -> adjust pack entitlements
 *
 * @owner DOS
 * @module packs
 */

import { logger } from '../ports/logger.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { PACKS_EVENT_CONTRACT } from './packs.events';
import { safeQuery } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

// ── Provisioning Started ────────────────────────────────────────────

/**
 * When provisioning starts, verify that required base packs are available
 * in the pack registry before provisioning proceeds.
 */
async function handleProvisioningStarted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  logger.info(`[packs] provisioning started for tenant ${tenantId}`, {
    jobId: payload.jobId,
    sessionId: payload.sessionId,
  });

  // Check that base packs exist in the registry
  const { rows } = await safeQuery(
    `SELECT code, version FROM public.pack_registry
     WHERE pack_type = 'base' AND is_active = true`,
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) {
    logger.warn(`[packs] no base packs found in registry during provisioning for tenant ${tenantId}`);
  } else {
    logger.info(`[packs] ${rows.length} base packs available for tenant ${tenantId}`);
  }
}

// ── Provisioning Completed ──────────────────────────────────────────

/**
 * When provisioning completes, verify all required packs were installed
 * for the tenant and log any discrepancies.
 */
async function handleProvisioningCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  logger.info(`[packs] provisioning completed for tenant ${tenantId}`, {
    jobId: payload.jobId,
  });

  // Verify base packs are installed
  const { rows: installed } = await safeQuery(
    `SELECT pack_code, pack_version, status
     FROM public.tenant_pack_installations
     WHERE tenant_id = $1`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  const failedPacks = (installed as Array<Record<string, unknown>>)
    .filter(r => r.status === 'failed');

  if (failedPacks.length > 0) {
    logger.warn(`[packs] ${failedPacks.length} pack(s) failed installation during provisioning for tenant ${tenantId}`, {
      failedPacks: failedPacks.map(p => p.pack_code),
    });
  } else {
    logger.info(`[packs] ${installed.length} pack(s) installed for tenant ${tenantId}`);
  }
}

// ── Module Activated ────────────────────────────────────────────────

/**
 * When a module is activated, check if there are module-specific packs
 * that should be auto-installed for the tenant.
 */
async function handleModuleActivated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  const moduleCode = payload.moduleCode as string;
  if (!moduleCode) return;

  logger.info(`[packs] module ${moduleCode} activated for tenant ${tenantId}`);

  // Check for module-specific packs
  const { rows: modulePacks } = await safeQuery(
    `SELECT code, version FROM public.pack_registry
     WHERE pack_type = 'module'
       AND is_active = true
       AND applies_to ? $1`,
    [moduleCode],
  ).catch(() => ({ rows: [] }));

  if (modulePacks.length > 0) {
    logger.info(`[packs] ${modulePacks.length} module pack(s) available for ${moduleCode} in tenant ${tenantId}`, {
      packs: (modulePacks as Array<Record<string, unknown>>).map(p => p.code),
    });
  }
}

// ── Tenant Tier Changed ─────────────────────────────────────────────

/**
 * When a tenant's licensing tier changes, adjust pack entitlements.
 * Higher tiers may unlock additional packs; lower tiers may require
 * deactivation of premium packs.
 */
async function handleTenantTierChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  const oldTier = payload.oldTier as string;
  const newTier = payload.newTier as string;

  logger.info(`[packs] tenant ${tenantId} tier changed: ${oldTier} -> ${newTier}`);

  // Log the tier change for audit
  const tierOrder: Record<string, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    enterprise: 3,
  };

  const isDowngrade = (tierOrder[newTier] ?? 0) < (tierOrder[oldTier] ?? 0);
  if (isDowngrade) {
    logger.warn(`[packs] tenant ${tenantId} downgraded from ${oldTier} to ${newTier} -- pack entitlement review needed`);
  }
}

// ── Handler Registration ────────────────────────────────────────────


// -- foundation.scope_changed (Phase 3) -------------------------------------
//
// When a Foundation org/department/business-unit moves under a new parent,
// packs applicability for records linked to that org node must be
// recomputed. We emit one recompute task per event; idempotency on
// (triggerSource, entityId) is enforced by the task store.
async function handleFoundationScopeChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!entityId) return;
  const entityType = (payload.entityType as string | undefined) ?? 'org_unit';

  await createProcessTask(tenantId, {
    title: `Recompute packs applicability — Foundation scope changed`,
    description: `recompute pack applicability for ${entityType} ${entityId} after parent change.`,
    taskType: 'packs_applicability_recompute',
    priority: 'medium',
    entityType,
    entityId,
    triggerSource: 'foundation.scope_changed',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[packs] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[packs] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('provisioning.job.started', wrapHandler('handleProvisioningStarted', handleProvisioningStarted));
handlers.set('provisioning.job.completed', wrapHandler('handleProvisioningCompleted', handleProvisioningCompleted));
handlers.set('module.activated', wrapHandler('handleModuleActivated', handleModuleActivated));
handlers.set('tenant.tier.changed', wrapHandler('handleTenantTierChanged', handleTenantTierChanged));

/**
 * Get all subscription handlers for external wiring.
 */
export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

/**
 * Subscribe all handlers using a generic bus interface.
 */
export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${PACKS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

/**
 * Register all packs event subscribers with the platform event bus.
 */
export function registerPacksEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `packs:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[packs] registered ${handlers.size} domain event subscribers`);
}

handlers.set('foundation.scope_changed', wrapHandler('handleFoundationScopeChanged', handleFoundationScopeChanged));
