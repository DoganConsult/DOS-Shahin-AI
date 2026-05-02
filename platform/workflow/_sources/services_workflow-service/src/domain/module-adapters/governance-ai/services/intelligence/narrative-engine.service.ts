/**
 * workflow-service — governance-ai / narrative-engine adapter.
 *
 * Produces a concise board-ready narrative summary for the tenant. Reads the
 * latest governance snapshot row when present; when absent, returns a
 * deterministic "no-data" summary so callers can safely render the narrative
 * without throwing. LLM-generated narratives remain owned by
 * governance-service and are published via `governance.narrative.requested`.
 */
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface GovernanceSnapshot {
  tenantId: string;
  score: number;
  openIssues: number;
  overdueIssues: number;
  recentChanges: number;
  generatedAt: string;
}

async function readSnapshot(tenantId: string): Promise<GovernanceSnapshot | null> {
  try {
    const res = await safeQuery(
      `SELECT
         COALESCE((SELECT score FROM public.governance_health_scores
                    WHERE tenant_id = $1 ORDER BY computed_at DESC LIMIT 1), 0) AS score,
         COALESCE((SELECT COUNT(*) FROM public.governance_issues
                    WHERE tenant_id = $1 AND status IN ('new','in_progress')), 0) AS open_issues,
         COALESCE((SELECT COUNT(*) FROM public.governance_issues
                    WHERE tenant_id = $1 AND status IN ('new','in_progress')
                      AND sla_due_at IS NOT NULL AND sla_due_at < NOW()), 0) AS overdue_issues,
         COALESCE((SELECT COUNT(*) FROM public.governance_signals
                    WHERE tenant_id = $1 AND detected_at > NOW() - INTERVAL '7 days'), 0) AS recent_changes`,
      [tenantId],
    );
    const row = res.rows[0] as
      | { score: number; open_issues: number; overdue_issues: number; recent_changes: number }
      | undefined;
    if (!row) return null;
    return {
      tenantId,
      score: Number(row.score) || 0,
      openIssues: Number(row.open_issues) || 0,
      overdueIssues: Number(row.overdue_issues) || 0,
      recentChanges: Number(row.recent_changes) || 0,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn('[NarrativeEngine] snapshot read failed', {
      tenantId, error: toErrorMessage(err),
    });
    return null;
  }
}

export async function generateNarrativeSummary(tenantId: string): Promise<string> {
  const snap = await readSnapshot(tenantId);

  if (!snap) {
    return 'Governance narrative unavailable — no snapshot data for this tenant yet.';
  }

  await publish('governance.narrative.requested', tenantId, {
    snapshot: snap,
    requestedAt: snap.generatedAt,
  });

  const parts: string[] = [];
  parts.push(`Governance health score: ${snap.score}.`);
  if (snap.openIssues > 0) {
    parts.push(`${snap.openIssues} open issue${snap.openIssues === 1 ? '' : 's'}`);
    if (snap.overdueIssues > 0) {
      parts.push(`${snap.overdueIssues} past SLA`);
    }
  } else {
    parts.push('No open governance issues.');
  }
  if (snap.recentChanges > 0) {
    parts.push(`${snap.recentChanges} new signal${snap.recentChanges === 1 ? '' : 's'} in last 7 days`);
  }
  return parts.join(' — ');
}
