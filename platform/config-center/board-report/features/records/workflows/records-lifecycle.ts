import type { RecordStatus } from '../contracts/records.contracts';
export const RECORD_STATES: readonly RecordStatus[] = ['active', 'retention', 'review_pending', 'disposed', 'legal_hold', 'archived'] as const;
export const RECORD_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  active: ['retention', 'legal_hold'], retention: ['review_pending', 'legal_hold'],
  review_pending: ['disposed', 'retention', 'legal_hold'], disposed: ['archived'],
  legal_hold: ['active', 'retention'], archived: [],
};
export const RECORD_TERMINAL_STATES: readonly RecordStatus[] = ['archived'];
export function isValidRecordTransition(from: RecordStatus, to: RecordStatus): boolean { return RECORD_TRANSITIONS[from]?.includes(to) ?? false; }
export function isRecordTerminal(state: RecordStatus): boolean { return RECORD_TERMINAL_STATES.includes(state); }
