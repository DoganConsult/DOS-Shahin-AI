"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityStateMachine = exports.InvalidTransitionError = void 0;
exports.setLifecycleRegistry = setLifecycleRegistry;
exports.registerLifecycleDefinition = registerLifecycleDefinition;
exports.getDefinition = getDefinition;
exports.getRegistryEntry = getRegistryEntry;
exports.isTransitionValid = isTransitionValid;
exports.isTerminalState = isTerminalState;
exports.enforceStatusTransition = enforceStatusTransition;
exports.tryLifecycleTransition = tryLifecycleTransition;
exports.canTransition = canTransition;
exports.performTransition = performTransition;
exports.getTransitionPermission = getTransitionPermission;
let _lifecycle = null;
const _fallbackDefinitions = new Map();
function buildDefinitionKey(moduleCode, entityType) {
    return `${moduleCode}::${entityType}`;
}
function storeDefinition(moduleCode, entityType, states, transitions, opts) {
    _fallbackDefinitions.set(buildDefinitionKey(moduleCode, entityType), {
        moduleCode,
        entityType,
        states,
        transitions,
        opts,
    });
}
function getStoredEntry(moduleCode, entityType) {
    return _fallbackDefinitions.get(buildDefinitionKey(moduleCode, entityType)) ?? null;
}
function getStoredDefinition(moduleCode, entityType) {
    const entry = getStoredEntry(moduleCode, entityType);
    if (!entry) {
        return null;
    }
    return {
        states: entry.states,
        transitions: entry.transitions,
        opts: entry.opts,
    };
}
const fallbackLifecycle = {
    registerLifecycleDefinition(moduleCode, entityType, states, transitions, opts) {
        storeDefinition(moduleCode, entityType, states, transitions, opts);
    },
    getDefinition(moduleCode, entityType) {
        return getStoredDefinition(moduleCode, entityType);
    },
    getAllDefinitions() {
        return Array.from(_fallbackDefinitions.values());
    },
    getRegistryEntry(moduleCode, entityType) {
        return getStoredEntry(moduleCode, entityType);
    },
    isTransitionValid(moduleCode, entityType, from, to) {
        const def = getStoredDefinition(moduleCode, entityType);
        if (!def) {
            return false;
        }
        const allowed = def.transitions[from];
        return Array.isArray(allowed) && allowed.includes(to);
    },
    isTerminalState(moduleCode, entityType, state) {
        const def = getStoredDefinition(moduleCode, entityType);
        if (!def) {
            return false;
        }
        if (def.opts?.terminalStates) {
            return def.opts.terminalStates.includes(state);
        }
        return !(state in def.transitions);
    },
};
function normalizeLifecycleDefinition(moduleCodeOrDefinition, entityType, states, transitions, opts) {
    if (typeof moduleCodeOrDefinition === 'string') {
        return {
            moduleCode: moduleCodeOrDefinition,
            entityType: entityType ?? moduleCodeOrDefinition,
            states: states ?? [],
            transitions: transitions ?? {},
            opts,
        };
    }
    const definition = moduleCodeOrDefinition;
    return {
        moduleCode: definition.moduleCode,
        entityType: definition.entityType,
        states: definition.states,
        transitions: definition.transitions,
        opts: {
            initialState: definition.initialState,
            terminalStates: definition.terminalStates,
            transitionPermissions: definition.transitionPermissions,
            labels: definition.labels,
        },
    };
}
function resolveEntityTypes(request) {
    const candidates = [request.entityType, request.table, request.moduleCode].filter((value) => typeof value === 'string' && value.length > 0);
    return Array.from(new Set(candidates));
}
function findLifecycleEntry(request) {
    for (const entityType of resolveEntityTypes(request)) {
        const entry = getRegistryEntry(request.moduleCode, entityType);
        if (entry) {
            return entry;
        }
    }
    return null;
}
function buildDeniedReason(entry, fromStatus, toStatus) {
    return `Lifecycle transition denied for ${entry.moduleCode}/${entry.entityType}: ${fromStatus} -> ${toStatus} is not allowed.`;
}
function evaluateTransitionRequest(request) {
    if (!request.moduleCode || !request.toStatus || !request.fromStatus) {
        return { allowed: true };
    }
    const entry = findLifecycleEntry(request);
    if (!entry) {
        return { allowed: true };
    }
    if (request.fromStatus === request.toStatus) {
        return { allowed: true };
    }
    const allowed = entry.transitions[request.fromStatus];
    if (!Array.isArray(allowed) || !allowed.includes(request.toStatus)) {
        return {
            allowed: false,
            reason: buildDeniedReason(entry, request.fromStatus, request.toStatus),
        };
    }
    return { allowed: true };
}
function normalizeTransitionRequest(requestOrModuleCode, entityId, fromStatus, toStatus, actorUserId) {
    if (typeof requestOrModuleCode === 'string') {
        return {
            request: {
                moduleCode: requestOrModuleCode,
                entityType: requestOrModuleCode,
                entityId: entityId ?? '',
                fromStatus,
                toStatus: toStatus ?? '',
                actorUserId,
            },
            legacySignature: true,
        };
    }
    return {
        request: requestOrModuleCode,
        legacySignature: false,
    };
}
function setLifecycleRegistry(impl) {
    _lifecycle = impl;
    for (const entry of _fallbackDefinitions.values()) {
        impl.registerLifecycleDefinition(entry.moduleCode, entry.entityType, entry.states, entry.transitions, entry.opts);
    }
}
function getLifecycle() {
    return _lifecycle ?? fallbackLifecycle;
}
function registerLifecycleDefinition(moduleCodeOrDefinition, entityType, states, transitions, opts) {
    const definition = normalizeLifecycleDefinition(moduleCodeOrDefinition, entityType, states, transitions, opts);
    storeDefinition(definition.moduleCode, definition.entityType, definition.states, definition.transitions, definition.opts);
    if (_lifecycle) {
        return _lifecycle.registerLifecycleDefinition(definition.moduleCode, definition.entityType, definition.states, definition.transitions, definition.opts);
    }
}
function getDefinition(moduleCode, entityType) {
    const definition = getLifecycle().getDefinition(moduleCode, entityType);
    return definition ?? getStoredDefinition(moduleCode, entityType);
}
function getRegistryEntry(moduleCode, entityType) {
    const impl = getLifecycle();
    if (impl.getRegistryEntry) {
        return impl.getRegistryEntry(moduleCode, entityType) ?? getStoredEntry(moduleCode, entityType);
    }
    const def = impl.getDefinition(moduleCode, entityType) ?? getStoredDefinition(moduleCode, entityType);
    if (!def)
        return null;
    return { moduleCode, entityType, ...def };
}
function isTransitionValid(moduleCode, entityType, from, to) {
    const impl = getLifecycle();
    if (impl.isTransitionValid) {
        return impl.isTransitionValid(moduleCode, entityType, from, to);
    }
    const def = impl.getDefinition(moduleCode, entityType);
    if (!def)
        return false;
    const allowed = def.transitions[from];
    return Array.isArray(allowed) && allowed.includes(to);
}
function isTerminalState(moduleCode, entityType, state) {
    const impl = getLifecycle();
    if (impl.isTerminalState) {
        return impl.isTerminalState(moduleCode, entityType, state);
    }
    const def = impl.getDefinition(moduleCode, entityType);
    if (!def)
        return false;
    if (def.opts?.terminalStates) {
        return def.opts.terminalStates.includes(state);
    }
    return !(state in def.transitions);
}
async function enforceStatusTransition(tenantId, requestOrModuleCode, entityId, fromStatus, toStatus, actorUserId) {
    void tenantId;
    const normalized = normalizeTransitionRequest(requestOrModuleCode, entityId, fromStatus, toStatus, actorUserId);
    const evaluation = evaluateTransitionRequest(normalized.request);
    if (!evaluation.allowed) {
        if (normalized.legacySignature) {
            const error = new Error(evaluation.reason ?? 'Lifecycle transition denied.');
            error.statusCode = 403;
            throw error;
        }
        return {
            success: false,
            blocked: true,
            pendingApproval: false,
            reason: evaluation.reason,
        };
    }
    return {
        success: false,
        blocked: false,
        pendingApproval: false,
    };
}
async function tryLifecycleTransition(tenantId, request) {
    void tenantId;
    const evaluation = evaluateTransitionRequest(request);
    if (!evaluation.allowed) {
        return {
            handled: true,
            denied: true,
            pendingApproval: false,
            result: {
                reason: evaluation.reason,
            },
        };
    }
    return {
        handled: false,
        denied: false,
        pendingApproval: false,
    };
}
/**
 * Phase 11 (M5) — minimal EntityStateMachine shim.
 *
 * Evidence + reporting module code constructs EntityStateMachine<State>
 * with `{entityType, transitions}` and calls `transition(...)`. The
 * canonical FSM implementation has never landed in @dos/platform-core/
 * lifecycle; this shim provides the surface the consumer needs:
 *   - `allowedTransitions(from)` — check what targets are reachable
 *   - `transition(tenantId, entityId, from, to, opts)` — validate the
 *     transition is declared; throw a typed error otherwise
 * The actual DB write is owned by the caller (see evidence-lifecycle.
 * service.ts), so the shim only enforces the transition graph.
 */
class InvalidTransitionError extends Error {
    entityType;
    fromState;
    toState;
    statusCode = 400;
    constructor(entityType, fromState, toState) {
        super(`Invalid transition for ${entityType}: ${fromState} -> ${toState}`);
        this.entityType = entityType;
        this.fromState = fromState;
        this.toState = toState;
        this.name = 'InvalidTransitionError';
    }
}
exports.InvalidTransitionError = InvalidTransitionError;
class EntityStateMachine {
    entityType;
    transitions;
    terminalStates;
    constructor(opts) {
        this.entityType = opts.entityType;
        this.transitions = opts.transitions;
        this.terminalStates = opts.terminalStates ?? [];
    }
    allowedTransitions(from) {
        return this.transitions[from] ?? [];
    }
    canTransition(from, to) {
        if (from === to)
            return false;
        return this.allowedTransitions(from).includes(to);
    }
    async transition(tenantId, entityId, from, to, _opts) {
        if (!this.canTransition(from, to)) {
            throw new InvalidTransitionError(this.entityType, String(from), String(to));
        }
        return { tenantId, entityId, from, to };
    }
}
exports.EntityStateMachine = EntityStateMachine;
/**
 * Can this transition legally happen for the given (moduleCode, entityType)?
 * Consults the registered lifecycle definitions; returns false when no
 * definition is registered, or when the from→to edge is absent.
 */
function canTransition(moduleCode, entityType, from, to) {
    if (from === to)
        return false;
    return isTransitionValid(moduleCode, entityType, from, to);
}
/**
 * Execute a transition. This is the in-process FSM step — persistence is
 * owned by the caller (see workflow-lifecycle-bridge). A success result is
 * returned only when the transition is legal; otherwise `success: false`
 * with a typed `error` message.
 *
 * The first five positional parameters match the call-site contract used by
 * `workflow-lifecycle-bridge.ts`:
 *   performTransition(entityId, fromState, toState, moduleCode, entityType, opts)
 */
async function performTransition(entityId, fromState, toState, moduleCode, entityType, opts) {
    if (!canTransition(moduleCode, entityType, fromState, toState)) {
        return {
            success: false,
            fromState,
            toState,
            error: `Transition ${fromState}→${toState} is not declared for ${moduleCode}:${entityType}`,
            metadata: { entityId, ...(opts?.metadata ?? {}) },
        };
    }
    return {
        success: true,
        fromState,
        toState,
        metadata: {
            entityId,
            actor: opts?.actor,
            tenantId: opts?.tenantId,
            reason: opts?.reason,
            ...(opts?.metadata ?? {}),
        },
    };
}
/**
 * Return the permission code required for the given transition, if any.
 * Looks up `opts.transitionPermissions[from→to]` from the registered
 * lifecycle definition. Returns `null` when no permission is declared.
 */
function getTransitionPermission(moduleCode, entityType, from, to) {
    const entry = getRegistryEntry(moduleCode, entityType);
    const perms = entry?.opts?.transitionPermissions;
    if (!perms)
        return null;
    const key = `${from}→${to}`;
    const altKey = `${from}->${to}`;
    return perms[key] ?? perms[altKey] ?? null;
}
//# sourceMappingURL=lifecycle.js.map