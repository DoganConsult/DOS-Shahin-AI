"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_STATE_MACHINE = void 0;
const lifecycle_port_1 = require("../ports/lifecycle.port");
const FOUNDATION_STATES = ['draft', 'in_review', 'approved', 'published', 'active', 'suspended', 'archived'];
const FOUNDATION_TRANSITIONS = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['published'],
    published: ['active'],
    active: ['suspended', 'archived'],
    suspended: ['active', 'archived'],
    archived: [],
};
(0, lifecycle_port_1.registerLifecycleDefinition)('foundation', 'foundation_node', FOUNDATION_STATES, FOUNDATION_TRANSITIONS, {
    initialState: 'draft',
    terminalStates: ['archived'],
});
exports.FOUNDATION_STATE_MACHINE = new lifecycle_port_1.EntityStateMachine({
    entityType: 'foundation_node',
    transitions: {
        draft: ['in_review'],
        in_review: ['approved', 'draft'],
        approved: ['published'],
        published: ['active'],
        active: ['suspended', 'archived'],
        suspended: ['active', 'archived'],
        archived: [],
    },
});
//# sourceMappingURL=lifecycle-registration.js.map