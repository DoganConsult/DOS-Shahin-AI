import type { BcpPlanStatus } from '../contracts/bcp.contracts';
export const BCP_STATES: readonly BcpPlanStatus[] = ['draft', 'active', 'under_review', 'approved', 'outdated', 'retired', 'archived'] as const;
export const BCP_TRANSITIONS: Record<BcpPlanStatus, BcpPlanStatus[]> = {
  draft: ['under_review', 'archived'], under_review: ['approved', 'draft'], approved: ['active'],
  active: ['under_review', 'outdated'], outdated: ['under_review', 'retired'], retired: ['archived'], archived: [],
};
export const BCP_TERMINAL_STATES: readonly BcpPlanStatus[] = ['archived'];
export function isValidBcpTransition(from: BcpPlanStatus, to: BcpPlanStatus): boolean { return BCP_TRANSITIONS[from]?.includes(to) ?? false; }
export function isBcpTerminal(state: BcpPlanStatus): boolean { return BCP_TERMINAL_STATES.includes(state); }
