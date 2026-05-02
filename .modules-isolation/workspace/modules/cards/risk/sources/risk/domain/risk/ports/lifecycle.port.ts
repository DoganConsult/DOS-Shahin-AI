export { createProcessTask } from '@dos/platform-core/workflows';
export { registerLifecycleDefinition } from '@dos/platform-core/lifecycle';

// Phase 0.5: EntityStateMachine was removed from @dos/platform-core/lifecycle
// during the lifecycle API refactor. Provide a minimal local stub for the
// risk state machine to keep compiling. Risk is not user-certified in Wave 1;
// state transitions are no-ops until Wave 2 reconnects to the new API.
// `config` is `unknown` so legacy callers using either `Array<{from,to,on?}>`
// or `Record<State, State[]>` for transitions both build.
export class EntityStateMachine<S extends string = string> {
  constructor(_config: unknown) {
    // no-op constructor
  }
  can(_from: S, _to: S): boolean { return true; }
  transition(_from: S, _to: S, _context?: Record<string, unknown>): S { return _to; }
  getStates(): readonly S[] { return [] as unknown as readonly S[]; }
}
