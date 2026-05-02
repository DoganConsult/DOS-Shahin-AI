/**
 * workflow-service — audit-committee-reporting adapter.
 *
 * Records an executive summary request for the audit committee report and
 * publishes an `audit.committee.summary_requested` event so the audit
 * module's subscriber can render the full PDF/HTML artifact.
 */
import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ExecutiveSummaryResult {
  reportId: string;
  status: 'queued' | 'failed';
  generatedAt: string;
  error?: string;
}

export async function generateExecutiveSummary(
  tenantId: string,
  opts?: { periodStart?: string; periodEnd?: string },
): Promise<ExecutiveSummaryResult> {
  const reportId = randomUUID();
  const generatedAt = new Date().toISOString();
  try {
    await safeQuery(
      `INSERT INTO public.audit_committee_reports
         (id, tenant_id, report_type, status, period_start, period_end, requested_at)
       VALUES ($1, $2, 'executive_summary', 'queued', $3, $4, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [reportId, tenantId, opts?.periodStart ?? null, opts?.periodEnd ?? null],
    );
  } catch (err) {
    logger.warn('[AuditCommitteeReporting] report-row insert failed', {
      tenantId, reportId, error: toErrorMessage(err),
    });
  }
  try {
    await publish('audit.committee.summary_requested', tenantId, {
      reportId,
      periodStart: opts?.periodStart,
      periodEnd: opts?.periodEnd,
      generatedAt,
    });
    return { reportId, status: 'queued', generatedAt };
  } catch (err) {
    return {
      reportId,
      status: 'failed',
      generatedAt,
      error: toErrorMessage(err),
    };
  }
}
