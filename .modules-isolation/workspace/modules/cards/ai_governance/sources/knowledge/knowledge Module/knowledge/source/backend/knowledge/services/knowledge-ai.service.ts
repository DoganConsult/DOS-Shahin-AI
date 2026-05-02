/**
 * Knowledge module — AI recommendations.
 *
 * Surfaces stale documents, orphaned policies, and gap-candidates derived
 * from the tenant's knowledge base. Consumed by <app-ai-insight-panel>
 * mounted on the knowledge landing page.
 */

import { safeQuery, tenantSchema } from '@dos/db';

export interface KnowledgeRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: 'review' | 'archive' | 'link' | 'create';
  targetId?: string;
}

export async function getAiRecommendations(
  tenantId: string,
  _context: Record<string, unknown> = {},
): Promise<KnowledgeRecommendation[]> {
  const schema = tenantSchema(tenantId);
  const out: KnowledgeRecommendation[] = [];

  try {
    const [stale, orphans, unapproved] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".knowledge_documents
         WHERE updated_at < NOW() - INTERVAL '365 days' AND status='published'`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".policies p
         WHERE NOT EXISTS (
           SELECT 1 FROM "${schema}".controls c WHERE c.policy_id = p.policy_id
         ) AND p.status='published'`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".knowledge_documents
         WHERE status='draft' AND created_at < NOW() - INTERVAL '30 days'`,
      ),
    ]);

    const nStale = Number(stale.rows?.[0]?.n ?? 0);
    if (nStale > 0) {
      out.push({
        title: 'Documents overdue for review',
        description: `${nStale} published document(s) haven't been updated in the last 12 months.`,
        priority: nStale > 20 ? 'high' : 'medium',
        action: 'review',
      });
    }

    const nOrphans = Number(orphans.rows?.[0]?.n ?? 0);
    if (nOrphans > 0) {
      out.push({
        title: 'Policies not linked to any control',
        description: `${nOrphans} policy/policies have no control mapping. Add controls or archive if deprecated.`,
        priority: nOrphans > 10 ? 'high' : 'medium',
        action: 'link',
      });
    }

    const nUnapproved = Number(unapproved.rows?.[0]?.n ?? 0);
    if (nUnapproved > 0) {
      out.push({
        title: 'Drafts stuck in review',
        description: `${nUnapproved} draft(s) older than 30 days are not yet published.`,
        priority: 'medium',
        action: 'review',
      });
    }
  } catch {
    /* fall through */
  }

  if (out.length === 0) {
    out.push({
      title: 'Knowledge base healthy',
      description: 'No stale documents, orphan policies, or long-pending drafts detected.',
      priority: 'low',
    });
  }

  return out;
}
