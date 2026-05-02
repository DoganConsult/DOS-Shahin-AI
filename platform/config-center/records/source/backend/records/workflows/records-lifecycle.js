"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORD_TRANSITIONS = exports.RECORD_STATES = void 0;
exports.RECORD_STATES = [
    'draft', 'active', 'under_review', 'retention_hold',
    'pending_disposal', 'disposed', 'archived',
];
exports.RECORD_TRANSITIONS = {
    draft: ['active'],
    active: ['under_review', 'retention_hold', 'pending_disposal'],
    under_review: ['active', 'retention_hold'],
    retention_hold: ['active', 'pending_disposal'],
    pending_disposal: ['disposed'],
    disposed: ['archived'],
    archived: [],
};
//# sourceMappingURL=records-lifecycle.js.map