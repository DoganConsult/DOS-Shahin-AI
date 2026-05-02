/**
 * Lifecycle port — outbound interface for the platform lifecycle/state-machine
 * services. Host injects a real registry; defaults are inert no-ops so the
 * Foundation module can boot standalone for tests/dev.
 */
export type LifecycleHook = 'onInstall' | 'onActivate' | 'onMigrate' | 'onUninstall';
export interface LifecycleRegistrationOptions {
    initialState?: string;
    terminalStates?: readonly string[];
    [k: string]: unknown;
}
export type RegisterLifecycleDefinitionFn = (moduleCode: string, entityType: string, states: readonly string[], transitions: Record<string, readonly string[]>, options?: LifecycleRegistrationOptions) => void;
export declare function bindLifecyclePort(impl: {
    registerLifecycleDefinition?: RegisterLifecycleDefinitionFn;
}): void;
export declare const registerLifecycleDefinition: RegisterLifecycleDefinitionFn;
/**
 * EntityStateMachine — minimal in-module implementation usable standalone.
 * Constructor accepts `{ entityType, transitions }`.
 */
export interface EntityStateMachineConfig<TState extends string = string> {
    entityType: string;
    transitions: Record<string, readonly TState[]>;
    initialState?: TState;
}
export declare class EntityStateMachine<TState extends string = string> {
    readonly entityType: string;
    readonly transitions: Record<string, readonly TState[]>;
    readonly initialState?: TState;
    constructor(config: EntityStateMachineConfig<TState>);
    can(from: TState, to: TState): boolean;
    next(from: TState): readonly TState[];
}
