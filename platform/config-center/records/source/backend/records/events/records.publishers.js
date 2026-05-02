"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPublisher = setPublisher;
exports.publish = publish;
exports.getPublishedEventNames = getPublishedEventNames;
const logger_port_1 = require("../ports/logger.port");
const records_events_1 = require("./records.events");
let _publisher = null;
function setPublisher(fn) {
    _publisher = fn;
}
async function publish(eventName, payload) {
    if (!records_events_1.RECORDS_EVENT_CONTRACT.published[eventName]) {
        logger_port_1.logger.warn(`[${records_events_1.RECORDS_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
        return;
    }
    const fullPayload = { ...payload, moduleCode: records_events_1.RECORDS_EVENT_CONTRACT.moduleCode };
    if (_publisher) {
        await _publisher(fullPayload);
    }
    logger_port_1.logger.debug(`[${records_events_1.RECORDS_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}
function getPublishedEventNames() {
    return Object.keys(records_events_1.RECORDS_EVENT_CONTRACT.published);
}
//# sourceMappingURL=records.publishers.js.map