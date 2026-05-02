import type { ExceptionStatus } from '../contracts/exception.contracts';

export const EXCEPTION_STATES: readonly ExceptionStatus[] = [
  'draft', 'submitted', 'under_review', 'approved', 'active',
  'expiring', 'expired', 'revoked', 'closed', 'archived',
] as const;

export const EXCEPTION_TRANSITIONS: Record<ExceptionStatus, ExceptionStatus[]> = {
  draft: ['submitted', 'archived'],
  submitted: ['under_review', 'draft', 'archived'],
  under_review: ['approved', 'submitted', 'archived'],
  approved: ['active', 'revoked'],
  active: ['expiring', 'revoked', 'closed'],
  expiring: ['active', 'expired', 'closed'],
  expired: ['closed', 'archived'],
  revoked: ['archived'],
  closed: ['archived'],
  archived: [],
};

export const EXCEPTION_TERMINAL_STATES: readonly ExceptionStatus[] = ['archived'];

export function isValidExceptionTransition(from: ExceptionStatus, to: ExceptionStatus): boolean {
  return EXCEPTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isExceptionTerminal(state: ExceptionStatus): boolean {
  return EXCEPTION_TERMINAL_STATES.includes(state);
}

export function isExceptionRenewable(state: ExceptionStatus): boolean {
  return ['active', 'expiring'].includes(state);
}
