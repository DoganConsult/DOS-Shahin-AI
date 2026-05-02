// Questionnaire-intelligence service — drives the maturity-assessment loop:
// computes skip sets from prior answers, generates an intelligence report
// over the (tenant, framework) corpus, recommends frameworks aligned with
// the tenant's posture, scores maturity per dimension, and produces gap +
// workspace-config artifacts. Backed by:
//   - dos.maturity_assessments              (assessment session header)
//   - dos.maturity_assessment_responses     (per-question responses)
//   - dos.framework_recommendation_rules    (framework-fit scoring rules)
//   - dos.maturity_dimension_definitions    (dimensions + weights)
//
// Replaces a missing source file referenced by governance maturity.routes.

import { safeQuery } from '@dos/db';

export interface SkipSet {
  questionIds: string[];
  reason: string;
}

export interface IntelligenceReport {
  tenantId: string;
  generatedAt: string;
  signals: Array<{ name: string; value: number; trend?: 'up' | 'down' | 'flat' }>;
  recommendations: string[];
}

export interface FrameworkRecommendation {
  code: string;
  title: string;
  fitScore: number;
  rationale: string;
}

export interface MaturityScore {
  dimension: string;
  score: number;
  level: 'starter' | 'developing' | 'established' | 'optimized' | 'leading';
}

export interface GapAnalysis {
  dimension: string;
  current: number;
  target: number;
  gapPoints: number;
  recommendations: string[];
}

export interface WorkspaceConfig {
  modules: string[];
  defaultRoles: string[];
  initialFrameworks: string[];
}

export interface BranchingRule {
  questionId: string;
  ifAnswer: string | number | boolean;
  jumpTo?: string;
  skipSet?: string[];
}

/**
 * Compute the set of question IDs to skip for a given assessment based on
 * prior answers + branching rules.
 */
export async function computeSkipSet(
  tenantId: string,
  assessmentId: string,
): Promise<SkipSet> {
  try {
    const responses = await safeQuery(
      `SELECT question_id, answer
         FROM dos.maturity_assessment_responses
        WHERE tenant_id = $1 AND assessment_id = $2`,
      [tenantId, assessmentId],
    );
    const rules = await safeQuery(
      `SELECT question_id, if_answer, skip_set
         FROM dos.framework_branching_rules
        WHERE tenant_id = $1`,
      [tenantId],
    );
    const skip = new Set<string>();
    const responseMap = new Map<string, unknown>();
    for (const row of responses.rows as Record<string, unknown>[]) {
      responseMap.set(row['question_id'] as string, row['answer']);
    }
    for (const r of rules.rows as Record<string, unknown>[]) {
      const qid = r['question_id'] as string;
      const want = r['if_answer'];
      const skipList = (r['skip_set'] as string[]) ?? [];
      if (responseMap.has(qid) && responseMap.get(qid) === want) {
        for (const s of skipList) skip.add(s);
      }
    }
    return { questionIds: Array.from(skip), reason: skip.size > 0 ? 'branching-rules-applied' : 'no-skip' };
  } catch {
    return { questionIds: [], reason: 'tables-absent' };
  }
}

export async function generateIntelligenceReport(tenantId: string): Promise<IntelligenceReport> {
  let signals: IntelligenceReport['signals'] = [];
  try {
    const r = await safeQuery(
      `SELECT signal_name, signal_value, trend
         FROM dos.maturity_signals
        WHERE tenant_id = $1
        ORDER BY recorded_at DESC
        LIMIT 50`,
      [tenantId],
    );
    signals = (r.rows as Record<string, unknown>[]).map((row) => ({
      name: row['signal_name'] as string,
      value: Number(row['signal_value'] ?? 0),
      trend: (row['trend'] as 'up' | 'down' | 'flat' | undefined) ?? 'flat',
    }));
  } catch {
    signals = [];
  }
  const recommendations: string[] = [];
  for (const s of signals) {
    if (s.value < 50 && s.trend !== 'up') {
      recommendations.push(`Improve ${s.name} (current ${s.value})`);
    }
  }
  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    signals,
    recommendations,
  };
}

export async function recommendFrameworks(
  tenantId: string,
  responses: Record<string, unknown> = {},
): Promise<FrameworkRecommendation[]> {
  try {
    const r = await safeQuery(
      `SELECT framework_code, title, fit_rule, weight
         FROM dos.framework_recommendation_rules
        WHERE tenant_id = $1
        ORDER BY weight DESC`,
      [tenantId],
    );
    const out: FrameworkRecommendation[] = [];
    for (const row of r.rows as Record<string, unknown>[]) {
      const rule = (row['fit_rule'] as Record<string, unknown>) ?? {};
      let fit = 0;
      let total = 0;
      for (const [k, v] of Object.entries(rule)) {
        total += 1;
        if (responses[k] === v) fit += 1;
      }
      const fitScore = total === 0 ? 0.5 : fit / total;
      out.push({
        code: row['framework_code'] as string,
        title: (row['title'] as string) ?? (row['framework_code'] as string),
        fitScore,
        rationale: total === 0 ? 'no rules configured' : `${fit}/${total} criteria matched`,
      });
    }
    return out.sort((a, b) => b.fitScore - a.fitScore);
  } catch {
    return [];
  }
}

export async function computeMaturityScores(
  tenantId: string,
  assessmentId: string,
): Promise<MaturityScore[]> {
  try {
    const dims = await safeQuery(
      `SELECT dimension_code, weight FROM dos.maturity_dimension_definitions WHERE tenant_id = $1`,
      [tenantId],
    );
    const scores = await safeQuery(
      `SELECT r.question_id, r.answer, q.dimension_code, q.max_score
         FROM dos.maturity_assessment_responses r
         JOIN dos.maturity_questions q ON q.question_id = r.question_id
        WHERE r.tenant_id = $1 AND r.assessment_id = $2`,
      [tenantId, assessmentId],
    );
    const totals = new Map<string, { sum: number; max: number }>();
    for (const row of scores.rows as Record<string, unknown>[]) {
      const dim = row['dimension_code'] as string;
      const ans = Number(row['answer'] ?? 0);
      const max = Number(row['max_score'] ?? 5);
      const e = totals.get(dim) ?? { sum: 0, max: 0 };
      e.sum += ans;
      e.max += max;
      totals.set(dim, e);
    }
    const out: MaturityScore[] = [];
    for (const row of dims.rows as Record<string, unknown>[]) {
      const dim = row['dimension_code'] as string;
      const e = totals.get(dim) ?? { sum: 0, max: 0 };
      const pct = e.max === 0 ? 0 : (e.sum / e.max) * 100;
      out.push({
        dimension: dim,
        score: Math.round(pct * 10) / 10,
        level: pct >= 85 ? 'leading' : pct >= 70 ? 'optimized' : pct >= 50 ? 'established' : pct >= 30 ? 'developing' : 'starter',
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function generateGapAnalysis(
  tenantId: string,
  assessmentId: string,
  targetLevel: number = 70,
): Promise<GapAnalysis[]> {
  const scores = await computeMaturityScores(tenantId, assessmentId);
  return scores.map((s) => ({
    dimension: s.dimension,
    current: s.score,
    target: targetLevel,
    gapPoints: Math.max(0, targetLevel - s.score),
    recommendations: s.score < targetLevel
      ? [`Raise ${s.dimension} from ${s.score}% to ${targetLevel}% via targeted controls + evidence`]
      : [],
  }));
}

export async function generateWorkspaceConfig(
  tenantId: string,
  responses: Record<string, unknown> = {},
): Promise<WorkspaceConfig> {
  const recs = await recommendFrameworks(tenantId, responses);
  return {
    modules: ['foundation', 'governance', 'risk', 'compliance', 'evidence', 'audit'],
    defaultRoles: ['admin', 'risk_admin', 'compliance_admin', 'evidence_owner', 'audit_owner', 'member'],
    initialFrameworks: recs.slice(0, 3).map((r) => r.code),
  };
}

export async function getBranchingRules(tenantId: string): Promise<BranchingRule[]> {
  try {
    const r = await safeQuery(
      `SELECT question_id, if_answer, jump_to, skip_set
         FROM dos.framework_branching_rules
        WHERE tenant_id = $1
        ORDER BY question_id`,
      [tenantId],
    );
    return (r.rows as Record<string, unknown>[]).map((row) => ({
      questionId: row['question_id'] as string,
      ifAnswer: row['if_answer'] as BranchingRule['ifAnswer'],
      jumpTo: (row['jump_to'] as string) ?? undefined,
      skipSet: (row['skip_set'] as string[]) ?? undefined,
    }));
  } catch {
    return [];
  }
}
