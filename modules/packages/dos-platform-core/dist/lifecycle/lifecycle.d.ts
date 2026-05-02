export interface LifecycleOpts {
    initialState?: string;
    terminalStates?: readonly string[];
    transitionPermissions?: Record<string, string>;
    labels?: Record<string, string>;
}
export interface LifecycleRegistryEntry {
    moduleCode: string;
    entityType: string;
    states: readonly string[];
    transitions: Record<string, string[]>;
    opts?: LifecycleOpts;
}
export interface LifecycleDefinitionInput extends LifecycleOpts {
    moduleCode: string;
    entityType: string;
    states: readonly string[];
    transitions: Record<string, string[]>;
    [key: string]: unknown;
}
export interface EnforceStatusTransitionRequest {
    moduleCode: string;
    entityId: string;
    toStatus: string;
    fromStatus?: string;
    entityType?: string;
    table?: string;
    idColumn?: string;
    actorUserId?: string;
    statusColumn?: string;
    extraSets?: string;
    extraParams?: unknown[];
}
export interface EnforceStatusTransitionResult {
    success: boolean;
    blocked: boolean;
    pendingApproval: boolean;
    reason?: string;
    approvalId?: string;
}
export interface TryLifecycleTransitionResult {
    handled: boolean;
    denied: boolean;
    pendingApproval: boolean;
    approvalId?: string;
    result?: {
        reason?: string;
    };
}
export interface PlatformLifecycle {
    registerLifecycleDefinition(moduleCode: string, entityType: string, states: readonly string[], transitions: Record<string, string[]>, opts?: LifecycleOpts): void;
    getDefinition(moduleCode: string, entityType: string): {
        states: readonly string[];
        transitions: Record<string, string[]>;
        opts?: LifecycleOpts;
    } | null;
    getAllDefinitions?(): unknown[];
    isTransitionValid?(moduleCode: string, entityType: string, from: string, to: string): boolean;
    getRegistryEntry?(moduleCode: string, entityType: string): LifecycleRegistryEntry | null;
    isTerminalState?(moduleCode: string, entityType: string, state: string): boolean;
}
export declare function setLifecycleRegistry(impl: PlatformLifecycle): void;
export declare function registerLifecycleDefinition(moduleCodeOrDefinition: string | LifecycleDefinitionInput, entityType?: string, states?: readonly string[], transitions?: Record<string, string[]>, opts?: LifecycleOpts): void;
export declare function getDefinition(moduleCode: string, entityType: string): {
    states: readonly string[];
    transitions: Record<string, string[]>;
    opts?: LifecycleOpts;
} | null;
export declare function getRegistryEntry(moduleCode: string, entityType: string): LifecycleRegistryEntry | null;
export declare function isTransitionValid(moduleCode: string, entityType: string, from: string, to: string): boolean;
export declare function isTerminalState(moduleCode: string, entityType: string, state: string): boolean;
export declare function enforceStatusTransition(tenantId: string, requestOrModuleCode: EnforceStatusTransitionRequest | string, entityId?: string, fromStatus?: string, toStatus?: string, actorUserId?: string): Promise<EnforceStatusTransitionResult>;
export declare function tryLifecycleTransition(tenantId: string, request: EnforceStatusTransitionRequest): Promise<TryLifecycleTransitionResult>;
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
export declare class InvalidTransitionError extends Error {
    readonly entityType: string;
    readonly fromState: string;
    readonly toState: string;
    readonly statusCode = 400;
    constructor(entityType: string, fromState: string, toState: string);
}
export interface EntityStateMachineOpts<S extends string> {
    entityType: string;
    transitions: Record<S, readonly S[]>;
    terminalStates?: readonly S[];
}
export interface EntityStateMachineTransitionOpts {
    actor?: string;
    reason?: string;
}
export declare class EntityStateMachine<S extends string = string> {
    readonly entityType: string;
    readonly transitions: Record<S, readonly S[]>;
    readonly terminalStates: readonly S[];
    constructor(opts: EntityStateMachineOpts<S>);
    allowedTransitions(from: S): readonly S[];
    canTransition(from: S, to: S): boolean;
    transition(tenantId: string, entityId: string, from: S, to: S, _opts?: EntityStateMachineTransitionOpts): Promise<{
        tenantId: string;
        entityId: string;
        from: S;
        to: S;
    }>;
}
/** Result of a performed transition — returned by `performTransition`. */
export interface TransitionResult {
    success: boolean;
    fromState: string;
    toState: string;
    error?: string;
    metadata?: Record<string, unknown>;
    auditId?: string;
}
/** Optional arguments for `performTransition`. */
export interface PerformTransitionOptions {
    actor?: string;
    tenantId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Can this transition legally happen for the given (moduleCode, entityType)?
 * Consults the registered lifecycle definitions; returns false when no
 * definition is registered, or when the from→to edge is absent.
 */
export declare function canTransition(moduleCode: string, entityType: string, from: string, to: string): boolean;
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
export declare function performTransition(entityId: string, fromState: string, toState: string, moduleCode: string, entityType: string, opts?: PerformTransitionOptions): Promise<TransitionResult>;
/**
 * Return the permission code required for the given transition, if any.
 * Looks up `opts.transitionPermissions[from→to]` from the registered
 * lifecycle definition. Returns `null` when no permission is declared.
 */
export declare function getTransitionPermission(moduleCode: string, entityType: string, from: string, to: string): string | null;
