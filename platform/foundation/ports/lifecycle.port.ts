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

export type RegisterLifecycleDefinitionFn = (
  moduleCode: string,
  entityType: string,
  states: readonly string[],
  transitions: Record<string, readonly string[]>,
  options?: LifecycleRegistrationOptions,
) => void;

let _registerLifecycleDefinition: RegisterLifecycleDefinitionFn = () => {
  /* no-op when unbound */
};

export function bindLifecyclePort(impl: {
  registerLifecycleDefinition?: RegisterLifecycleDefinitionFn;
}) {
  if (impl.registerLifecycleDefinition) _registerLifecycleDefinition = impl.registerLifecycleDefinition;
}

export const registerLifecycleDefinition: RegisterLifecycleDefinitionFn = (
  moduleCode,
  entityType,
  states,
  transitions,
  options,
) => _registerLifecycleDefinition(moduleCode, entityType, states, transitions, options);

/**
 * EntityStateMachine — minimal in-module implementation usable standalone.
 * Constructor accepts `{ entityType, transitions }`.
 */
export interface EntityStateMachineConfig<TState extends string = string> {
  entityType: string;
  transitions: Record<string, readonly TState[]>;
  initialState?: TState;
}

export class EntityStateMachine<TState extends string = string> {
  public readonly entityType: string;
  public readonly transitions: Record<string, readonly TState[]>;
  public readonly initialState?: TState;

  constructor(config: EntityStateMachineConfig<TState>) {
    this.entityType = config.entityType;
    this.transitions = config.transitions;
    this.initialState = config.initialState;
  }

  can(from: TState, to: TState): boolean {
    return (this.transitions[from] ?? []).includes(to);
  }

  next(from: TState): readonly TState[] {
    return this.transitions[from] ?? [];
  }
}
