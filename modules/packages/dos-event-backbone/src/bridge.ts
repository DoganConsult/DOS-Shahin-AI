import type { EventEnvelope, EventHandler } from './types';
import type { RedisStreamEventBus } from './redis-stream-bus';

/**
 * Dual-publish bridge for progressive migration from in-memory EventBus to Redis Streams.
 *
 * Phase 1: Both legacy and backbone receive events (dual-publish)
 * Phase 2: Consumers validated on backbone
 * Phase 3: Legacy publish path removed
 */
export class DualPublishBridge {
  private backbone: RedisStreamEventBus;
  private legacyPublish?: (eventType: string, payload: unknown) => void;
  private legacyEnabled: boolean;

  constructor(backbone: RedisStreamEventBus, legacyPublish?: (eventType: string, payload: unknown) => void) {
    this.backbone = backbone;
    this.legacyPublish = legacyPublish;
    this.legacyEnabled = !!legacyPublish;
  }

  async publish(eventType: string, payload: unknown, meta?: { tenantId?: string; userId?: string }): Promise<string> {
    // Always publish to backbone (new path)
    const eventId = await this.backbone.publish(eventType, payload, meta);

    // Also publish to legacy if bridge is active
    if (this.legacyEnabled && this.legacyPublish) {
      try {
        this.legacyPublish(eventType, payload);
      } catch (err) {
        this.backbone.getLogger().warn('Legacy publish failed', {
          eventType,
          error: err instanceof Error ? err.message : String(err),
        });
        // Don't fail — backbone is the primary path
      }
    }

    return eventId;
  }

  disableLegacy(): void {
    this.legacyEnabled = false;
  }

  enableLegacy(): void {
    if (this.legacyPublish) {
      this.legacyEnabled = true;
    }
  }

  isLegacyEnabled(): boolean {
    return this.legacyEnabled;
  }
}
