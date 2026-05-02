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
  registerLifecycleDefinition(
    moduleCode: string,
    entityType: string,
    states: readonly string[],
    transitions: Record<string, string[]>,
    opts?: LifecycleOpts,
  ): void;
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

let _lifecycle: PlatformLifecycle | null = null;
const _fallbackDefinitions = new Map<string, LifecycleRegistryEntry>();

function buildDefinitionKey(moduleCode: string, entityType: string): string {
  return `${moduleCode}::${entityType}`;
}

function storeDefinition(
  moduleCode: string,
  entityType: string,
  states: readonly string[],
  transitions: Record<string, string[]>,
  opts?: LifecycleOpts,
): void {
  _fallbackDefinitions.set(buildDefinitionKey(moduleCode, entityType), {
    moduleCode,
    entityType,
    states,
    transitions,
    opts,
  });
}

function getStoredEntry(moduleCode: string, entityType: string): LifecycleRegistryEntry | null {
  return _fallbackDefinitions.get(buildDefinitionKey(moduleCode, entityType)) ?? null;
}

function getStoredDefinition(moduleCode: string, entityType: string): {
  states: readonly string[];
  transitions: Record<string, string[]>;
  opts?: LifecycleOpts;
} | null {
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

const fallbackLifecycle: PlatformLifecycle = {
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

function normalizeLifecycleDefinition(
  moduleCodeOrDefinition: string | LifecycleDefinitionInput,
  entityType?: string,
  states?: readonly string[],
  transitions?: Record<string, string[]>,
  opts?: LifecycleOpts,
): LifecycleRegistryEntry {
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

function resolveEntityTypes(request: EnforceStatusTransitionRequest): string[] {
  const candidates = [request.entityType, request.table, request.moduleCode].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  return Array.from(new Set(candidates));
}

function findLifecycleEntry(request: EnforceStatusTransitionRequest): LifecycleRegistryEntry | null {
  for (const entityType of resolveEntityTypes(request)) {
    const entry = getRegistryEntry(request.moduleCode, entityType);
    if (entry) {
      return entry;
    }
  }

  return null;
}

function buildDeniedReason(entry: LifecycleRegistryEntry, fromStatus: string, toStatus: string): string {
  return `Lifecycle transition denied for ${entry.moduleCode}/${entry.entityType}: ${fromStatus} -> ${toStatus} is not allowed.`;
}

function evaluateTransitionRequest(request: EnforceStatusTransitionRequest): { allowed: boolean; reason?: string } {
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

function normalizeTransitionRequest(
  requestOrModuleCode: EnforceStatusTransitionRequest | string,
  entityId?: string,
  fromStatus?: string,
  toStatus?: string,
  actorUserId?: string,
): { request: EnforceStatusTransitionRequest; legacySignature: boolean } {
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

export function setLifecycleRegistry(impl: PlatformLifecycle): void {
  _lifecycle = impl;

  for (const entry of _fallbackDefinitions.values()) {
    impl.registerLifecycleDefinition(
      entry.moduleCode,
      entry.entityType,
      entry.states,
      entry.transitions,
      entry.opts,
    );
  }
}

function getLifecycle(): PlatformLifecycle {
  return _lifecycle ?? fallbackLifecycle;
}

export function registerLifecycleDefinition(
  moduleCodeOrDefinition: string | LifecycleDefinitionInput,
  entityType?: string,
  states?: readonly string[],
  transitions?: Record<string, string[]>,
  opts?: LifecycleOpts,
): void {
  const definition = normalizeLifecycleDefinition(
    moduleCodeOrDefinition,
    entityType,
    states,
    transitions,
    opts,
  );

  storeDefinition(
    definition.moduleCode,
    definition.entityType,
    definition.states,
    definition.transitions,
    definition.opts,
  );

  if (_lifecycle) {
    return _lifecycle.registerLifecycleDefinition(
      definition.moduleCode,
      definition.entityType,
      definition.states,
      definition.transitions,
      definition.opts,
    );
  }
}

export function getDefinition(moduleCode: string, entityType: string): {
  states: readonly string[];
  transitions: Record<string, string[]>;
  opts?: LifecycleOpts;
} | null {
  const definition = getLifecycle().getDefinition(moduleCode, entityType);
  return definition ?? getStoredDefinition(moduleCode, entityType);
}

export function getRegistryEntry(moduleCode: string, entityType: string): LifecycleRegistryEntry | null {
  const impl = getLifecycle();
  if (impl.getRegistryEntry) {
    return impl.getRegistryEntry(moduleCode, entityType) ?? getStoredEntry(moduleCode, entityType);
  }
  const def = impl.getDefinition(moduleCode, entityType) ?? getStoredDefinition(moduleCode, entityType);
  if (!def) return null;
  return { moduleCode, entityType, ...def };
}

export function isTransitionValid(moduleCode: string, entityType: string, from: string, to: string): boolean {
  const impl = getLifecycle();
  if (impl.isTransitionValid) {
    return impl.isTransitionValid(moduleCode, entityType, from, to);
  }
  const def = impl.getDefinition(moduleCode, entityType);
  if (!def) return false;
  const allowed = def.transitions[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function isTerminalState(moduleCode: string, entityType: string, state: string): boolean {
  const impl = getLifecycle();
  if (impl.isTerminalState) {
    return impl.isTerminalState(moduleCode, entityType, state);
  }
  const def = impl.getDefinition(moduleCode, entityType);
  if (!def) return false;
  if (def.opts?.terminalStates) {
    return (def.opts.terminalStates as string[]).includes(state);
  }
  return !(state in def.transitions);
}

export async function enforceStatusTransition(
  tenantId: string,
  requestOrModuleCode: EnforceStatusTransitionRequest | string,
  entityId?: string,
  fromStatus?: string,
  toStatus?: string,
  actorUserId?: string,
): Promise<EnforceStatusTransitionResult> {
  void tenantId;
  const normalized = normalizeTransitionRequest(
    requestOrModuleCode,
    entityId,
    fromStatus,
    toStatus,
    actorUserId,
  );
  const evaluation = evaluateTransitionRequest(normalized.request);

  if (!evaluation.allowed) {
    if (normalized.legacySignature) {
      const error = new Error(evaluation.reason ?? 'Lifecycle transition denied.');
      (error as Error & { statusCode?: number }).statusCode = 403;
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

export async function tryLifecycleTransition(
  tenantId: string,
  request: EnforceStatusTransitionRequest,
): Promise<TryLifecycleTransitionResult> {
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
export class InvalidTransitionError extends Error {
  readonly statusCode = 400;
  constructor(
    public readonly entityType: string,
    public readonly fromState: string,
    public readonly toState: string,
  ) {
    super(`Invalid transition for ${entityType}: ${fromState} -> ${toState}`);
    this.name = 'InvalidTransitionError';
  }
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

export class EntityStateMachine<S extends string = string> {
  readonly entityType: string;
  readonly transitions: Record<S, readonly S[]>;
  readonly terminalStates: readonly S[];

  constructor(opts: EntityStateMachineOpts<S>) {
    this.entityType = opts.entityType;
    this.transitions = opts.transitions;
    this.terminalStates = opts.terminalStates ?? [];
  }

  allowedTransitions(from: S): readonly S[] {
    return this.transitions[from] ?? [];
  }

  canTransition(from: S, to: S): boolean {
    if (from === to) return false;
    return this.allowedTransitions(from).includes(to);
  }

  async transition(
    tenantId: string,
    entityId: string,
    from: S,
    to: S,
    _opts?: EntityStateMachineTransitionOpts,
  ): Promise<{ tenantId: string; entityId: string; from: S; to: S }> {
    if (!this.canTransition(from, to)) {
      throw new InvalidTransitionError(this.entityType, String(from), String(to));
    }
    return { tenantId, entityId, from, to };
  }
}

// ── Registry-backed free-function helpers ────────────────────────────────────
// The workflow-lifecycle-bridge (and other module code) use `canTransition`
// and `performTransition` as free functions keyed on (moduleCode, entityType).
// They read from the same registry populated by `registerLifecycleDefinition`
// so a single lifecycle registration is visible to every consumer.

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
export function canTransition(
  moduleCode: string,
  entityType: string,
  from: string,
  to: string,
): boolean {
  if (from === to) return false;
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
export async function performTransition(
  entityId: string,
  fromState: string,
  toState: string,
  moduleCode: string,
  entityType: string,
  opts?: PerformTransitionOptions,
): Promise<TransitionResult> {
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
export function getTransitionPermission(
  moduleCode: string,
  entityType: string,
  from: string,
  to: string,
): string | null {
  const entry = getRegistryEntry(moduleCode, entityType);
  const perms = entry?.opts?.transitionPermissions;
  if (!perms) return null;
  const key = `${from}→${to}`;
  const altKey = `${from}->${to}`;
  return perms[key] ?? perms[altKey] ?? null;
}
