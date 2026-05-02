"use strict";
/**
 * Lifecycle port — outbound interface for the platform lifecycle/state-machine
 * services. Host injects a real registry; defaults are inert no-ops so the
 * Foundation module can boot standalone for tests/dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityStateMachine = exports.registerLifecycleDefinition = void 0;
exports.bindLifecyclePort = bindLifecyclePort;
let _registerLifecycleDefinition = () => {
    /* no-op when unbound */
};
function bindLifecyclePort(impl) {
    if (impl.registerLifecycleDefinition)
        _registerLifecycleDefinition = impl.registerLifecycleDefinition;
}
const registerLifecycleDefinition = (moduleCode, entityType, states, transitions, options) => _registerLifecycleDefinition(moduleCode, entityType, states, transitions, options);
exports.registerLifecycleDefinition = registerLifecycleDefinition;
class EntityStateMachine {
    entityType;
    transitions;
    initialState;
    constructor(config) {
        this.entityType = config.entityType;
        this.transitions = config.transitions;
        this.initialState = config.initialState;
    }
    can(from, to) {
        return (this.transitions[from] ?? []).includes(to);
    }
    next(from) {
        return this.transitions[from] ?? [];
    }
}
exports.EntityStateMachine = EntityStateMachine;
//# sourceMappingURL=lifecycle.port.js.map