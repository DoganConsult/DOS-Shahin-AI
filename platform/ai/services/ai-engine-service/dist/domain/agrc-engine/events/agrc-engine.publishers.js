import { logger } from '../ports/logger.port.js';
import { AGRC_ENGINE_EVENT_CONTRACT } from './agrc-engine.events.js';
let _publisher = null;
export function setPublisher(fn) {
    _publisher = fn;
}
export async function publish(eventName, payload) {
    if (!AGRC_ENGINE_EVENT_CONTRACT.published[eventName]) {
        logger.warn(`[${AGRC_ENGINE_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
        return;
    }
    const fullPayload = { ...payload, moduleCode: AGRC_ENGINE_EVENT_CONTRACT.moduleCode };
    if (_publisher) {
        await _publisher(fullPayload);
    }
    logger.debug(`[${AGRC_ENGINE_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}
export function getPublishedEventNames() {
    return Object.keys(AGRC_ENGINE_EVENT_CONTRACT.published);
}
//# sourceMappingURL=agrc-engine.publishers.js.map