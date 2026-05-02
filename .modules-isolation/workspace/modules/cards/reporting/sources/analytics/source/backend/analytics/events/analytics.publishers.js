"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPublisher = setPublisher;
exports.publish = publish;
exports.getPublishedEventNames = getPublishedEventNames;
const logger_port_1 = require("../ports/logger.port");
const analytics_events_1 = require("./analytics.events");
let _publisher = null;
function setPublisher(fn) {
    _publisher = fn;
}
async function publish(eventName, payload) {
    if (!analytics_events_1.ANALYTICS_EVENT_CONTRACT.published[eventName]) {
        logger_port_1.logger.warn(`[${analytics_events_1.ANALYTICS_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
        return;
    }
    const fullPayload = { ...payload, moduleCode: analytics_events_1.ANALYTICS_EVENT_CONTRACT.moduleCode };
    if (_publisher) {
        await _publisher(fullPayload);
    }
    logger_port_1.logger.debug(`[${analytics_events_1.ANALYTICS_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}
function getPublishedEventNames() {
    return Object.keys(analytics_events_1.ANALYTICS_EVENT_CONTRACT.published);
}
//# sourceMappingURL=analytics.publishers.js.map