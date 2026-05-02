// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
// ============================================================================
// Link Integrity Hub — AI OS R2
// Cross-hub subscriber for entity deletion events.
// Detects orphaned links and publishes warnings.
// ============================================================================

import type { PlatformEvent } from '@dos/platform-core/events';
import { eventBus } from '@dos/platform-core/events';
import type { EntityType } from '@dos/types';

type SubFn = (eventType: string, name: string, handler: (e: PlatformEvent) => Promise<void>) => void;

/**
 * Entity types that have deletion-related events we should monitor.
 * Maps event prefix → entity type for link integrity checking.
 */
const DELETION_EVENT_MAP: Record<string, EntityType> = {
  'risk': 'risk',
  'control': 'control',
  'policy': 'policy',
  'incident': 'incident',
  'vendor': 'vendor',
  'finding': 'finding',
};

export function registerLinkIntegrityHub(sub: SubFn): void {
  // Subscribe to all domain deletion-like events
  // Since most modules don't have explicit .deleted events yet,
  // we subscribe to state-change events that indicate entity removal

  for (const [domain, entityType] of Object.entries(DELETION_EVENT_MAP)) {
    // Listen for any event that might indicate entity modification
    // The cross-hub approach is best-effort: if a deletion event exists, we catch it
    sub(`${domain}.deleted` as string, `link-integrity-${domain}-deleted`, async (event: PlatformEvent) => {
      try {
        const entityId = event.entityId || event.payload?.entityId;
        if (!entityId) return;

        const { enforceLinksOnDelete } = await import('../../../modules/platform/services/entity/entity-link-integrity.service');
        const result = await enforceLinksOnDelete(event.tenantId, entityType, entityId);

        if (result.blocked || result.inboundLinkCount > 0) {
          await eventBus.publish({
            eventType: 'link.orphan_detected',
            tenantId: event.tenantId,
            sourceService: 'link-integrity-hub',
            entityType: entityType,
            entityId: entityId,
            severity: result.blocked ? 'warning' : 'info',
            payload: {
              entityType,
              entityId,
              blocked: result.blocked,
              reason: result.reason,
              inboundLinkCount: result.inboundLinkCount,
              criticalLinks: result.criticalLinks,
            },
          });
        }
      } catch (err) {
        logger.warn(`[LinkIntegrityHub] Error checking links for ${domain} deletion:`, err);
      }
    });
  }
}
