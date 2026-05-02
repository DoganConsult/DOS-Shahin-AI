/**
 * workflow-service — governance-ai / action-orchestration adapter.
 *
 * Looks up newly-interpreted governance issues and requests recommended
 * actions from the governance service. Persists a placeholder row per issue
 * so downstream consumers can attach real recommendations.
 */
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface Recommendation {
  id: string;
  issueId: string;
  tenantId: string;
  action: string;
  createdAt: string;
}

export async function generateRecommendationsForNewIssues(
  tenantId: string,
): Promise<Recommendation[]> {
  let newIssueIds: string[] = [];

  try {
    const res = await safeQuery(
      `SELECT id
         FROM public.governance_issues
        WHERE tenant_id = $1
          AND status = 'new'
          AND COALESCE(recommendations_generated, false) = false
        ORDER BY created_at ASC
        LIMIT 100`,
      [tenantId],
    );
    newIssueIds = res.rows.map((r: { id: string }) => r.id);
  } catch (err) {
    logger.warn('[ActionOrchestration] issue lookup failed', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }

  if (newIssueIds.length === 0) return [];

  await publish('governance.recommendations.requested', tenantId, {
    issueIds: newIssueIds,
    requestedAt: new Date().toISOString(),
  });

  const now = new Date().toISOString();
  return newIssueIds.map((issueId) => ({
    id: `pending-rec-${issueId}`,
    issueId,
    tenantId,
    action: 'pending_llm_generation',
    createdAt: now,
  }));
}
