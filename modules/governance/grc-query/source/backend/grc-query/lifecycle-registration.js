"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_sdk_1 = require("@dos/module-sdk");
const QUERY_STATES = ['draft', 'active', 'archived'];
const QUERY_TRANSITIONS = {
    draft: ['active'],
    active: ['archived'],
    archived: [],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'grc-query', entityType: 'grc_saved_queries', states: QUERY_STATES, transitions: QUERY_TRANSITIONS, ...{
        initialState: 'draft',
        terminalStates: ['archived'],
        transitionPermissions: {
            'draft->active': 'grc-query.manage',
            'active->archived': 'grc-query.manage',
        },
    } });
//# sourceMappingURL=lifecycle-registration.js.map