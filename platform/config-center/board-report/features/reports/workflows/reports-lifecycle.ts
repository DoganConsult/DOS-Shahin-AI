import type { ReportStatus } from '../contracts/reports.contracts';
export const REPORT_STATES: readonly ReportStatus[] = ['draft', 'generating', 'generated', 'reviewing', 'approved', 'published', 'distributed', 'failed', 'archived'] as const;
export const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ['generating', 'archived'], generating: ['generated', 'failed'], generated: ['reviewing', 'published', 'archived'],
  reviewing: ['approved', 'generated'], approved: ['published'], published: ['distributed', 'archived'],
  distributed: ['archived'], failed: ['draft', 'generating', 'archived'], archived: [],
};
export function isValidReportTransition(from: ReportStatus, to: ReportStatus): boolean { return REPORT_TRANSITIONS[from]?.includes(to) ?? false; }
