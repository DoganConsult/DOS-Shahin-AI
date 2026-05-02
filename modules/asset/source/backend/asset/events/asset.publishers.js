"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPublisher = setPublisher;
exports.publish = publish;
exports.getPublishedEventNames = getPublishedEventNames;
const logger_port_1 = require("../ports/logger.port");
const asset_events_1 = require("./asset.events");
let _publisher = null;
function setPublisher(fn) {
    _publisher = fn;
}
async function publish(eventName, payload) {
    if (!asset_events_1.ASSET_EVENT_CONTRACT.published[eventName]) {
        logger_port_1.logger.warn(`[${asset_events_1.ASSET_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
        return;
    }
    const fullPayload = { ...payload, moduleCode: asset_events_1.ASSET_EVENT_CONTRACT.moduleCode };
    if (_publisher) {
        await _publisher(fullPayload);
    }
    logger_port_1.logger.debug(`[${asset_events_1.ASSET_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}
function getPublishedEventNames() {
    return Object.keys(asset_events_1.ASSET_EVENT_CONTRACT.published);
}
//# sourceMappingURL=asset.publishers.js.map