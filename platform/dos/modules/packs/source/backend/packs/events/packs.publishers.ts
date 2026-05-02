/**
 * Packs -- Event Publisher
 *
 * Publishes events declared in PACKS_EVENT_CONTRACT.
 * All publish calls are validated against the event contract.
 *
 * @owner DOS
 * @module packs
 */

import { logger } from '../ports/logger.port';
import type { ModuleEventPayload } from '@dos/types';
import { PACKS_EVENT_CONTRACT } from './packs.events';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export type EventPublisher = (payload: ModuleEventPayload) => Promise<void>;

let _publisher: EventPublisher | null = null;

/**
 * Set the external event publisher function.
 * Called once during module initialization to wire the platform event bus.
 */
export function setPublisher(fn: EventPublisher): void {
  _publisher = fn;
}

/**
 * Publish a packs module event.
 * Validates the event name against the contract before publishing.
 *
 * @param eventName - Fully qualified event name (e.g. 'packs.installed')
 * @param payload - Event payload without moduleCode (added automatically)
 */
export async function publish(
  eventName: string,
  payload: Omit<ModuleEventPayload, 'moduleCode'>,
): Promise<void> {
  if (!PACKS_EVENT_CONTRACT.published[eventName]) {
    logger.warn(`[${PACKS_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
    return;
  }
  const fullPayload: ModuleEventPayload = {
    ...payload,
    moduleCode: PACKS_EVENT_CONTRACT.moduleCode,
  };
  if (_publisher) {
    await _publisher(fullPayload);
  }
  logger.debug(`[${PACKS_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}

/**
 * Get list of all published event names for this module.
 */
export function getPublishedEventNames(): string[] {
  return Object.keys(PACKS_EVENT_CONTRACT.published);
}

// ── Convenience Publishers ──────────────────────────────────────────

/**
 * Emit pack installed event.
 */
export async function emitPackInstalled(
  tenantId: string,
  packCode: string,
  packVersion: string,
  installedBy: string,
  correlationId: string,
): Promise<void> {

  await publish(('packs.installed' as any), {
    tenantId,
    entityType: 'installation',
    entityId: packCode,
    triggeredBy: installedBy,
    timestamp: new Date().toISOString(),
    correlationId,
    data: { packCode, packVersion },
  } as unknown);
}

/**
 * Emit pack updated event.
 */
export async function emitPackUpdated(
  tenantId: string,
  packCode: string,
  oldVersion: string,
  newVersion: string,
  updatedBy: string,
  correlationId: string,
): Promise<void> {

  await publish(('packs.updated' as any), {
    tenantId,
    entityType: 'installation',
    entityId: packCode,
    triggeredBy: updatedBy,
    timestamp: new Date().toISOString(),
    correlationId,
    data: { packCode, oldVersion, newVersion },
  } as unknown);
}

/**
 * Emit pack uninstalled event.
 */
export async function emitPackUninstalled(
  tenantId: string,
  packCode: string,
  uninstalledBy: string,
  correlationId: string,
): Promise<void> {

  await publish(('packs.uninstalled' as any), {
    tenantId,
    entityType: 'installation',
    entityId: packCode,
    triggeredBy: uninstalledBy,
    timestamp: new Date().toISOString(),
    correlationId,
    data: { packCode },
  } as unknown);
}

/**
 * Emit pack install failed event.
 */
export async function emitPackInstallFailed(
  tenantId: string,
  packCode: string,
  error: string,
  correlationId: string,
): Promise<void> {

  await publish(('packs.install_failed' as any), {
    tenantId,
    entityType: 'installation',
    entityId: packCode,
    triggeredBy: SYSTEM_JOB_ACTOR,
    timestamp: new Date().toISOString(),
    correlationId,
    data: { packCode, error },
  } as unknown);
}

/**
 * Emit catalog synced event.
 */
export async function emitCatalogSynced(
  added: number,
  updated: number,
  errors: number,
  correlationId: string,
): Promise<void> {

  await publish(('packs.catalog_synced' as any), {
    tenantId: 'platform',
    entityType: 'catalog',
    entityId: 'pack_registry',
    triggeredBy: SYSTEM_JOB_ACTOR,
    timestamp: new Date().toISOString(),
    correlationId,
    data: { added, updated, errors },
  } as unknown);
}

/**
 * Emit compatibility checked event.
 */
export async function emitCompatibilityChecked(
  tenantId: string,
  packCode: string,
  compatible: boolean,
  correlationId: string,
): Promise<void> {

  await publish(('packs.compatibility_checked' as any), {
    tenantId,
    entityType: 'pack',
    entityId: packCode,
    triggeredBy: SYSTEM_JOB_ACTOR,
    timestamp: new Date().toISOString(),
    correlationId,
    data: { packCode, compatible },
  } as unknown);
}
