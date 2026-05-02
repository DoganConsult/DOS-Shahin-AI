import type { ProvisioningJobStatus } from '../contracts/provisioning.contracts';
export const PROVISIONING_STATES: readonly ProvisioningJobStatus[] = ['queued', 'validating', 'running', 'waiting', 'completed', 'failed', 'rolled_back'] as const;
export const PROVISIONING_TRANSITIONS: Record<ProvisioningJobStatus, ProvisioningJobStatus[]> = {
  queued: ['validating', 'failed'], validating: ['running', 'failed'], running: ['waiting', 'completed', 'failed'],
  waiting: ['running', 'failed'], completed: [], failed: ['queued', 'rolled_back'], rolled_back: ['queued'],
};
export const PROVISIONING_TERMINAL_STATES: readonly ProvisioningJobStatus[] = ['completed'];
export function isValidProvisioningTransition(from: ProvisioningJobStatus, to: ProvisioningJobStatus): boolean { return PROVISIONING_TRANSITIONS[from]?.includes(to) ?? false; }
export function isProvisioningTerminal(state: ProvisioningJobStatus): boolean { return PROVISIONING_TERMINAL_STATES.includes(state); }
