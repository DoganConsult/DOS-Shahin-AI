"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_TRANSITIONS = exports.ACTION_STATES = void 0;
exports.ACTION_STATES = [
    'pending', 'assigned', 'in_progress', 'overdue', 'escalated',
    'completed', 'verified', 'cancelled', 'archived',
];
exports.ACTION_TRANSITIONS = {
    pending: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'overdue', 'escalated', 'cancelled'],
    overdue: ['in_progress', 'escalated', 'cancelled'],
    escalated: ['in_progress', 'cancelled'],
    completed: ['verified', 'archived'],
    verified: ['archived'],
    cancelled: ['archived'],
    archived: [],
};
//# sourceMappingURL=action-lifecycle.js.map