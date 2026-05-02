"use strict";
// ============================================
// Action Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActionItems = listActionItems;
exports.getActionItemById = getActionItemById;
exports.createActionItem = createActionItem;
exports.updateActionItem = updateActionItem;
exports.dailyDigest = dailyDigest;
exports.consolidatedCenter = consolidatedCenter;
exports.escalateOverdue = escalateOverdue;
exports.dispatch = dispatch;
const module_sdk_1 = require("@dos/module-sdk");
const middleware_port_1 = require("../ports/middleware.port");
// --- Service imports ---
const action_item_service_1 = require("../services/action-item.service");
const action_executor_service_1 = require("../services/action-executor.service");
// ── ACTION ITEM CRUD ───────────────────────────────────
async function listActionItems(req, res) {
    const filters = {};
    if (req.query.assignedTo)
        filters.assignedTo = req.query.assignedTo;
    if (req.query.status)
        filters.status = req.query.status;
    if (req.query.sourceType)
        filters.sourceType = req.query.sourceType;
    const result = await (0, action_item_service_1.getActionItems)(req.tenantId, filters);
    res.json((0, module_sdk_1.ok)(result, req));
}
async function getActionItemById(req, res) {
    const { id } = req.params;
    const result = await (0, action_item_service_1.getActionItems)(req.tenantId);
    const item = result.items.find((i) => i.actionId === id);
    if (!item)
        throw new module_sdk_1.NotFoundError('action_item', id);
    res.json((0, module_sdk_1.ok)(item, req));
}
async function createActionItem(req, res) {
    const item = await (0, action_item_service_1.createActionItem)(req.tenantId, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'action_item', entityId: item?.actionId, afterState: item });
    res.status(201).json((0, module_sdk_1.ok)(item, req));
}
async function updateActionItem(req, res) {
    const { id } = req.params;
    const updated = await (0, action_item_service_1.updateActionItem)(req.tenantId, id, req.body);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'action_item', entityId: id, afterState: updated });
    res.json((0, module_sdk_1.ok)(updated, req));
}
// ── DAILY DIGEST ───────────────────────────────────────
async function dailyDigest(req, res) {
    const userId = req.user?.userId ?? req.query.userId;
    if (!userId)
        throw new module_sdk_1.NotFoundError('user', 'unknown');
    const result = await (0, action_item_service_1.getDailyDigest)(req.tenantId, userId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── CONSOLIDATED ACTION CENTER ─────────────────────────
async function consolidatedCenter(req, res) {
    const userId = req.query.userId;
    const result = await (0, action_item_service_1.getConsolidatedActionCenter)(req.tenantId, userId);
    res.json((0, module_sdk_1.ok)(result, req));
}
// ── ESCALATION ─────────────────────────────────────────
async function escalateOverdue(req, res) {
    const count = await (0, action_item_service_1.escalateOverdueItems)(req.tenantId);
    (0, middleware_port_1.setAuditData)(res, { action: 'update', entityType: 'action_item_escalation' });
    res.json((0, module_sdk_1.ok)({ escalatedCount: count }, req));
}
// ── DISPATCH ACTION ────────────────────────────────────
async function dispatch(req, res) {
    const userId = req.user.userId;
    const result = await (0, action_executor_service_1.dispatchAction)({
        ...req.body,
        tenantId: req.tenantId,
        actor: userId,
    });
    (0, middleware_port_1.setAuditData)(res, { action: 'create', entityType: 'dispatched_action', entityId: result?.actionId });
    res.status(201).json((0, module_sdk_1.ok)(result, req));
}
//# sourceMappingURL=action.controller.js.map