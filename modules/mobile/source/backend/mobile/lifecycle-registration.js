"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_sdk_1 = require("@dos/module-sdk");
const SESSION_STATES = ['active', 'suspended', 'expired', 'revoked'];
const SESSION_TRANSITIONS = {
    active: ['suspended', 'expired', 'revoked'],
    suspended: ['active', 'revoked'],
    expired: [],
    revoked: [],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'mobile', entityType: 'mobile_sessions', states: SESSION_STATES, transitions: SESSION_TRANSITIONS, ...{
        initialState: 'active',
        terminalStates: ['expired', 'revoked'],
        transitionPermissions: {
            'active->suspended': 'mobile.session.manage',
            'active->revoked': 'mobile.session.manage',
            'suspended->active': 'mobile.session.manage',
            'suspended->revoked': 'mobile.session.manage',
        },
    } });
//# sourceMappingURL=lifecycle-registration.js.map