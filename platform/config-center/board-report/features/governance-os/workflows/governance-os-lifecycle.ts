import type { GovernanceRitualStatus } from '../contracts/governance-os.contracts';
export const GOV_RITUAL_STATES: readonly GovernanceRitualStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'] as const;
export const GOV_RITUAL_TRANSITIONS: Record<GovernanceRitualStatus, GovernanceRitualStatus[]> = {
  scheduled: ['in_progress', 'cancelled', 'overdue'], in_progress: ['completed', 'cancelled'],
  completed: ['scheduled'], cancelled: ['scheduled'], overdue: ['in_progress', 'cancelled'],
};
export function isValidGovRitualTransition(from: GovernanceRitualStatus, to: GovernanceRitualStatus): boolean { return GOV_RITUAL_TRANSITIONS[from]?.includes(to) ?? false; }
