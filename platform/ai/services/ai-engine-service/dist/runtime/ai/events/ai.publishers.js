import { logger } from '../ports/logger.port';
import { AI_EVENT_CONTRACT } from './ai.events';
let _publisher = null;
export function setPublisher(fn) {
    _publisher = fn;
}
export async function publish(eventName, payload) {
    if (!AI_EVENT_CONTRACT.published[eventName]) {
        logger.warn(`[${AI_EVENT_CONTRACT.moduleCode}] attempted to publish undeclared event: ${eventName}`);
        return;
    }
    const fullPayload = { ...payload, moduleCode: AI_EVENT_CONTRACT.moduleCode };
    if (_publisher) {
        await _publisher(fullPayload);
    }
    logger.debug(`[${AI_EVENT_CONTRACT.moduleCode}] published ${eventName}`);
}
export function getPublishedEventNames() {
    return Object.keys(AI_EVENT_CONTRACT.published);
}
//# sourceMappingURL=ai.publishers.js.map