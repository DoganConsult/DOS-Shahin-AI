"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindFoundationPublisher = bindFoundationPublisher;
const logger_port_1 = require("../../ports/logger.port");
const foundation_publishers_1 = require("./foundation.publishers");
const metrics_1 = require("../observability/metrics");
/**
 * Bind the foundation module's publisher to the host service's event bus.
 * Called exactly once at host boot (user-service/server.ts after
 * createEventBackbone/setEventBus). All subsequent calls to publish(eventName,...)
 * inside the foundation module will route through this bus and thus hit the
 * platform outbox + Redis streams.
 */
function bindFoundationPublisher(bus) {
    (0, foundation_publishers_1.setPublisher)(async (payload) => {
        const eventType = payload.eventType || `${payload.moduleCode}.unknown`;
        const tenantId = payload.tenantId;
        const userId = payload.userId;
        const idempotencyKey = payload.idempotencyKey;
        try {
            await bus.publish(eventType, payload, { tenantId, userId, idempotencyKey });
            metrics_1.FOUNDATION_METRICS.eventsPublished.inc(eventType);
        }
        catch (err) {
            metrics_1.FOUNDATION_METRICS.eventsPublished.inc(`${eventType}__failed`);
            logger_port_1.logger.warn(`[foundation.outbox] publish failed for ${eventType}: ${err?.message ?? err}`);
            throw err;
        }
    });
    logger_port_1.logger.info('[foundation.outbox] publisher bound to event-backbone');
}
//# sourceMappingURL=foundation.outbox-binder.js.map