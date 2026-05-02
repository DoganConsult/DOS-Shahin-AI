import type { BootstrapStatus } from '../contracts/bootstrap.contracts';
export const BOOTSTRAP_STATES: readonly BootstrapStatus[] = ['not_started', 'initializing', 'configuring', 'provisioning', 'validating', 'completed', 'failed', 'rolled_back'] as const;
export const BOOTSTRAP_TRANSITIONS: Record<BootstrapStatus, BootstrapStatus[]> = {
  not_started: ['initializing'], initializing: ['configuring', 'failed'], configuring: ['provisioning', 'failed'],
  provisioning: ['validating', 'failed'], validating: ['completed', 'failed'], completed: [],
  failed: ['initializing', 'rolled_back'], rolled_back: ['initializing'],
};
export const BOOTSTRAP_TERMINAL_STATES: readonly BootstrapStatus[] = ['completed'];
export function isValidBootstrapTransition(from: BootstrapStatus, to: BootstrapStatus): boolean { return BOOTSTRAP_TRANSITIONS[from]?.includes(to) ?? false; }
export function isBootstrapTerminal(state: BootstrapStatus): boolean { return BOOTSTRAP_TERMINAL_STATES.includes(state); }
