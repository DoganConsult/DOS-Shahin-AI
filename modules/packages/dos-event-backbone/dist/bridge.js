"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualPublishBridge = void 0;
/**
 * Dual-publish bridge for progressive migration from in-memory EventBus to Redis Streams.
 *
 * Phase 1: Both legacy and backbone receive events (dual-publish)
 * Phase 2: Consumers validated on backbone
 * Phase 3: Legacy publish path removed
 */
class DualPublishBridge {
    backbone;
    legacyPublish;
    legacyEnabled;
    constructor(backbone, legacyPublish) {
        this.backbone = backbone;
        this.legacyPublish = legacyPublish;
        this.legacyEnabled = !!legacyPublish;
    }
    async publish(eventType, payload, meta) {
        // Always publish to backbone (new path)
        const eventId = await this.backbone.publish(eventType, payload, meta);
        // Also publish to legacy if bridge is active
        if (this.legacyEnabled && this.legacyPublish) {
            try {
                this.legacyPublish(eventType, payload);
            }
            catch (err) {
                this.backbone.getLogger().warn('Legacy publish failed', {
                    eventType,
                    error: err instanceof Error ? err.message : String(err),
                });
                // Don't fail — backbone is the primary path
            }
        }
        return eventId;
    }
    disableLegacy() {
        this.legacyEnabled = false;
    }
    enableLegacy() {
        if (this.legacyPublish) {
            this.legacyEnabled = true;
        }
    }
    isLegacyEnabled() {
        return this.legacyEnabled;
    }
}
exports.DualPublishBridge = DualPublishBridge;
//# sourceMappingURL=bridge.js.map