import type { QiyasAssessmentStatus } from '../contracts/qiyas.contracts';
export const QIYAS_STATES: readonly QiyasAssessmentStatus[] = ['draft', 'in_progress', 'submitted', 'scored', 'reviewed', 'published', 'archived'] as const;
export const QIYAS_TRANSITIONS: Record<QiyasAssessmentStatus, QiyasAssessmentStatus[]> = {
  draft: ['in_progress', 'archived'], in_progress: ['submitted', 'draft'], submitted: ['scored', 'in_progress'],
  scored: ['reviewed', 'in_progress'], reviewed: ['published', 'scored'], published: ['archived'], archived: [],
};
export const QIYAS_TERMINAL_STATES: readonly QiyasAssessmentStatus[] = ['archived'];
export function isValidQiyasTransition(from: QiyasAssessmentStatus, to: QiyasAssessmentStatus): boolean { return QIYAS_TRANSITIONS[from]?.includes(to) ?? false; }
export function isQiyasTerminal(state: QiyasAssessmentStatus): boolean { return QIYAS_TERMINAL_STATES.includes(state); }
