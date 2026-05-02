"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_sdk_1 = require("@dos/module-sdk");
const PLAYBOOK_STATES = ['draft', 'active', 'executing', 'completed', 'archived'];
const PLAYBOOK_TRANSITIONS = {
    draft: ['active'],
    active: ['executing', 'archived'],
    executing: ['completed'],
    completed: ['archived'],
    archived: [],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'playbooks', entityType: 'playbooks', states: PLAYBOOK_STATES, transitions: PLAYBOOK_TRANSITIONS, ...{
        initialState: 'draft',
        terminalStates: ['archived'],
        transitionPermissions: {
            'draft->active': 'playbooks.manage',
            'active->executing': 'playbooks.execute',
            'active->archived': 'playbooks.manage',
            'executing->completed': 'playbooks.execute',
            'completed->archived': 'playbooks.manage',
        },
    } });
//# sourceMappingURL=lifecycle-registration.js.map