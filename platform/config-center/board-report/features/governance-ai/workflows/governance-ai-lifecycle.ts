import type { GovAiSignalStatus } from '../contracts/governance-ai.contracts';
export const GOV_AI_SIGNAL_STATES: readonly GovAiSignalStatus[] = ['detected', 'analyzing', 'interpreted', 'escalated', 'dismissed', 'archived'] as const;
export const GOV_AI_SIGNAL_TRANSITIONS: Record<GovAiSignalStatus, GovAiSignalStatus[]> = {
  detected: ['analyzing', 'dismissed'], analyzing: ['interpreted', 'dismissed'], interpreted: ['escalated', 'dismissed', 'archived'],
  escalated: ['archived'], dismissed: ['archived'], archived: [],
};
export function isValidGovAiTransition(from: GovAiSignalStatus, to: GovAiSignalStatus): boolean { return GOV_AI_SIGNAL_TRANSITIONS[from]?.includes(to) ?? false; }
