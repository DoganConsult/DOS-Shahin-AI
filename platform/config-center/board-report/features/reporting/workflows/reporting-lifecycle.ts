import type { ReportStatus } from '../contracts/reporting.contracts';

export const REPORTING_STATES: readonly ReportStatus[] = [
  'draft', 'generating', 'generated', 'under_review', 'approved', 'released', 'distributed', 'archived',
] as const;

export const REPORTING_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ['generating', 'archived'],
  generating: ['generated'],
  generated: ['under_review', 'archived'],
  under_review: ['approved', 'draft'],
  approved: ['released', 'archived'],
  released: ['distributed', 'archived'],
  distributed: ['archived'],
  archived: [],
};

export const REPORTING_TERMINAL_STATES: readonly ReportStatus[] = ['archived'];

export function isValidReportTransition(from: ReportStatus, to: ReportStatus): boolean {
  return REPORTING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isReportTerminal(state: ReportStatus): boolean {
  return REPORTING_TERMINAL_STATES.includes(state);
}
