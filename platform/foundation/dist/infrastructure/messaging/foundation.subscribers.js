"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionHandlers = getSubscriptionHandlers;
exports.subscribeAll = subscribeAll;
const logger_port_1 = require("../../ports/logger.port");
const handlers = new Map();
async function handleWorkflowStatusChanged(payload) {
    const module = payload.module;
    if (module !== 'foundation')
        return;
    logger_port_1.logger.debug(`[foundation] workflow status changed: ${payload.entityId}`);
}
handlers.set('workflow.status_changed', handleWorkflowStatusChanged);
// -- Phase 8 (F-070): team.member_added → mirror to position assignment ---
async function handleTeamMemberAdded(payload) {
    const tenantId = payload.tenantId;
    const teamId = payload.teamId ?? payload.entityId;
    const userId = payload.userId;
    if (!tenantId || !teamId || !userId)
        return;
    logger_port_1.logger.info(`[foundation] mirror team.member_added: team=${teamId} user=${userId}`);
    // Real implementation: insert into position_assignments mirroring team membership.
}
handlers.set('team.member_added', handleTeamMemberAdded);
// -- Phase 8 (F-071): team.member_removed → remove mirrored assignment ----
async function handleTeamMemberRemoved(payload) {
    const tenantId = payload.tenantId;
    const teamId = payload.teamId ?? payload.entityId;
    const userId = payload.userId;
    if (!tenantId || !teamId || !userId)
        return;
    logger_port_1.logger.info(`[foundation] mirror team.member_removed: team=${teamId} user=${userId}`);
}
handlers.set('team.member_removed', handleTeamMemberRemoved);
// -- Phase 8 (F-072): onboarding.completed → seed root org + default depts -
async function handleOnboardingCompleted(payload) {
    const tenantId = payload.tenantId;
    if (!tenantId)
        return;
    logger_port_1.logger.info(`[foundation] onboarding.completed → seed root org + default departments for tenant=${tenantId}`);
}
handlers.set('onboarding.completed', handleOnboardingCompleted);
function getSubscriptionHandlers() {
    return new Map(handlers);
}
function subscribeAll(bus) {
    for (const [event, handler] of handlers) {
        bus.on(event, handler);
    }
}
//# sourceMappingURL=foundation.subscribers.js.map