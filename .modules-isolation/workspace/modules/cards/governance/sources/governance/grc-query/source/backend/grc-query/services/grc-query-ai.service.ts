/**
 * GRC Query module — AI recommendations.
 *
 * Suggests canonical GRC queries based on tenant posture: untreated risks,
 * overdue control tests, expired evidence, recent findings. The panel
 * surface consumes these and allows the user to open each as a saved
 * query.
 */

import { safeQuery, tenantSchema } from '@dos/db';

export interface QueryRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  queryKey: string;
  filters?: Record<string, unknown>;
}

export async function getAiRecommendations(
  tenantId: string,
  _context: Record<string, unknown> = {},
): Promise<QueryRecommendation[]> {
  const schema = tenantSchema(tenantId);
  const out: QueryRecommendation[] = [];

  try {
    const [untreated, overdue, expired, findings] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".risks
         WHERE (treatment_status IS NULL OR treatment_status='none')
           AND status='open' AND risk_score >= 8`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".controls
         WHERE next_test_date < NOW() AND status='implemented'`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".evidence
         WHERE expiry_date < NOW()`,
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".findings
         WHERE status='open' AND severity IN ('critical','high')
           AND created_at > NOW() - INTERVAL '30 days'`,
      ),
    ]);

    const nUntreated = Number(untreated.rows?.[0]?.n ?? 0);
    if (nUntreated > 0) {
      out.push({
        title: 'Risks without treatment plans',
        description: `${nUntreated} high-severity risks are open and lack treatment. Run the "untreated-risks" query.`,
        priority: nUntreated > 10 ? 'critical' : 'high',
        queryKey: 'untreated-high-risks',
        filters: { status: 'open', minScore: 8, treatmentStatus: ['none', null] },
      });
    }

    const nOverdue = Number(overdue.rows?.[0]?.n ?? 0);
    if (nOverdue > 0) {
      out.push({
        title: 'Overdue control tests',
        description: `${nOverdue} controls have missed their next-test date.`,
        priority: nOverdue > 20 ? 'high' : 'medium',
        queryKey: 'overdue-control-tests',
        filters: { nextTestBefore: new Date().toISOString() },
      });
    }

    const nExpired = Number(expired.rows?.[0]?.n ?? 0);
    if (nExpired > 0) {
      out.push({
        title: 'Expired evidence items',
        description: `${nExpired} evidence items have passed their expiry date.`,
        priority: nExpired > 15 ? 'high' : 'medium',
        queryKey: 'expired-evidence',
      });
    }

    const nFindings = Number(findings.rows?.[0]?.n ?? 0);
    if (nFindings > 0) {
      out.push({
        title: 'Recent severe findings',
        description: `${nFindings} critical/high findings raised in the last 30 days.`,
        priority: nFindings > 5 ? 'high' : 'medium',
        queryKey: 'recent-severe-findings',
        filters: { severity: ['critical', 'high'], ageDays: 30 },
      });
    }
  } catch {
    /* fall through to default */
  }

  if (out.length === 0) {
    out.push({
      title: 'No urgent queries',
      description: 'No elevated-priority data patterns detected. Try the "compliance-by-framework" saved query.',
      priority: 'low',
      queryKey: 'compliance-by-framework',
    });
  }

  return out;
}
