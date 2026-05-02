"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueHandoff = enqueueHandoff;
exports.getHandoffBatch = getHandoffBatch;
const _handoffQueue = [];
function enqueueHandoff(handoff) {
    const entry = {
        id: 'handoff-' + Date.now() + '-' + Math.random().toString(16).slice(2),
        payload: handoff,
        createdAt: new Date().toISOString(),
    };
    _handoffQueue.push(entry);
}
function getHandoffBatch(agentId, limit = 50) {
    const out = [];
    const remaining = [];
    for (const msg of _handoffQueue) {
        if (out.length >= limit) {
            remaining.push(msg);
            continue;
        }
        if (!msg.agentId || msg.agentId === agentId) {
            out.push(msg.payload);
        }
        else {
            remaining.push(msg);
        }
    }
    _handoffQueue.length = 0;
    _handoffQueue.push(...remaining);
    return out;
}
//# sourceMappingURL=handoff-queue.service.js.map