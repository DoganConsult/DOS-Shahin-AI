"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_TRANSITIONS = exports.ASSET_STATES = void 0;
exports.ASSET_STATES = [
    'draft', 'registered', 'classified', 'active', 'under_review',
    'decommissioning', 'decommissioned', 'disposed', 'archived',
];
exports.ASSET_TRANSITIONS = {
    draft: ['registered'],
    registered: ['classified'],
    classified: ['active'],
    active: ['under_review', 'decommissioning'],
    under_review: ['active', 'decommissioning'],
    decommissioning: ['decommissioned'],
    decommissioned: ['disposed', 'archived'],
    disposed: ['archived'],
    archived: [],
};
//# sourceMappingURL=asset-lifecycle.js.map