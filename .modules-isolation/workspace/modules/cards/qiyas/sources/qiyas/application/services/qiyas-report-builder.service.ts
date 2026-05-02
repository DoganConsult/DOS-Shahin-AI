// ============================================
// Shahin-Ai — Qiyas Report Builder
// Assessment reports, executive summaries,
// domain breakdowns, benchmark comparisons, recommendations
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from "@dos/db";
import { getLevelByScore, getLevelById, getNextLevel, MATURITY_LEVELS } from "./qiyas-maturity-model.service";

// === Types ===

export interface ExecutiveSummary {
  assessmentId: string;
  title: string;
  framework: string;
  assessmentDate: string;
  overallScore: number;
  maturityLevel: number;
  maturityName: string;
  keyFindings: string[];
  topRisks: string[];
  recommendedActions: string[];
  comparedToBenchmark: BenchmarkComparison | null;
}

export interface DomainBreakdown {
  domain: string;
  score: number;
  maturityLevel: number;
  maturityName: string;
  questionCount: number;
  color: string;
  status: "above_target" | "at_target" | "below_target";
}

export interface BenchmarkComparison {
  benchmarkName: string;
  benchmarkScore: number;
  organizationScore: number;
  delta: number;
  percentile: number;
}

export interface AssessmentReport {
  reportId: string;
  generatedAt: string;
  assessmentId: string;
  tenantId: string;
  title: string;
  framework: string;
  executiveSummary: ExecutiveSummary;
  domainBreakdowns: DomainBreakdown[];
  scoreHistory: Array<{ period: string; score: number }>;
  recommendations: RecommendationItem[];
  appendix: Record<string, unknown>;
}

export interface RecommendationItem {
  priority: "critical" | "high" | "medium" | "low";
  domain: string;
  action: string;
  rationale: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

// === Pure Functions ===

export function generateKeyFindings(score: number, maturityLevel: number, framework: string): string[] {
  const levelDef = getLevelById(maturityLevel);
  const findings: string[] = [
    `Overall maturity score: ${score}/100 (${levelDef?.name || "Unknown"} level)`,
    `Framework assessed: ${framework}`,
  ];
  if (score < 30) findings.push("Critical gaps identified requiring immediate remediation");
  if (score >= 70) findings.push("Organization demonstrates strong control implementation");
  if (maturityLevel < 3) findings.push("Formal policies and procedures are not yet fully established");
  return findings;
}

export function generateRecommendations(
  domainBreakdowns: DomainBreakdown[],
  maturityLevel: number
): RecommendationItem[] {
  const recs: RecommendationItem[] = [];

  const criticalDomains = domainBreakdowns.filter(d => d.score < 30);
  const highDomains = domainBreakdowns.filter(d => d.score >= 30 && d.score < 50);
  const nextLevel = getNextLevel(maturityLevel);

  for (const d of criticalDomains) {
    recs.push({
      priority: "critical",
      domain: d.domain,
      action: `Establish foundational controls and policies for ${d.domain}`,
      rationale: `Domain score of ${d.score}% indicates critical control gaps`,
      effort: "high",
      impact: "high",
    });
  }

  for (const d of highDomains) {
    recs.push({
      priority: "high",
      domain: d.domain,
      action: `Formalize and document ${d.domain} processes`,
      rationale: `Domain score of ${d.score}% requires significant improvement`,
      effort: "medium",
      impact: "high",
    });
  }

  if (nextLevel) {
    recs.push({
      priority: "medium",
      domain: "organization-wide",
      action: `Progress toward ${nextLevel.name} level by meeting: ${nextLevel.criteria.slice(0, 2).join("; ")}`,
      rationale: `Current maturity level ${maturityLevel} has clear criteria for advancement`,
      effort: "medium",
      impact: "medium",
    });
  }

  return recs.slice(0, 10);
}

export function computeBenchmark(
  organizationScore: number,
  industryScores: number[]
): BenchmarkComparison {
  const sorted = [...industryScores].sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / Math.max(sorted.length, 1);
  const below = sorted.filter(s => s < organizationScore).length;
  const percentile = Math.round((below / Math.max(sorted.length, 1)) * 100);

  return {
    benchmarkName: "Industry Average",
    benchmarkScore: Math.round(avg * 10) / 10,
    organizationScore,
    delta: Math.round((organizationScore - avg) * 10) / 10,
    percentile,
  };
}

// === DB Functions ===

export async function buildAssessmentReport(
  tenantId: string,
  assessmentId: string
): Promise<AssessmentReport> {
  const schema = tenantSchema(tenantId);
  const assessmentResult = await safeQuery(
    `SELECT * FROM "${schema}".qiyas_qiyas WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, assessmentId],
  );
  const assessment = getFirstRow(assessmentResult) as any;
  if (!assessment) throw new Error('Assessment not found');

  const domainScores = await safeQuery(
    `SELECT domain_name, score, maturity_level
     FROM "${schema}".qiyas_domain_scores
     WHERE assessment_id = $1
     ORDER BY domain_name ASC`,
    [assessmentId],
  ).catch(() => ({ rows: [] as any[] }));

  const domainBreakdowns: DomainBreakdown[] = (domainScores.rows as any[]).map((r) => {
    const score = r.score != null ? Math.round(parseFloat(String(r.score)) * 10) / 10 : 0;
    const level = r.maturity_level != null ? parseInt(String(r.maturity_level), 10) : getLevelByScore(score).level;
    const def = getLevelById(level);
    return {
      domain: r.domain_name ?? r.domain ?? '',
      score,
      maturityLevel: level,
      maturityName: def?.name || 'Unknown',
      questionCount: typeof r.question_count === 'number' ? r.question_count : 0,
      color: def?.color || '#94A3B8',
      status: score >= 70 ? 'above_target' : score >= 50 ? 'at_target' : 'below_target',
    };
  });

  const overallScore = assessment.score != null
    ? Math.round(parseFloat(String(assessment.score)) * 10) / 10
    : Math.round((domainBreakdowns.reduce((s, d) => s + d.score, 0) / Math.max(domainBreakdowns.length, 1)) * 10) / 10;
  const maturityLevel = assessment.maturity_level != null
    ? parseInt(String(assessment.maturity_level), 10)
    : getLevelByScore(overallScore).level;

  const maturityDef = getLevelById(maturityLevel);
  const keyFindings = generateKeyFindings(overallScore, maturityLevel, assessment.framework || '');
  const recs = generateRecommendations(domainBreakdowns, maturityLevel);

  const executiveSummary: ExecutiveSummary = {
    assessmentId,
    title: assessment.title ?? '',
    framework: assessment.framework ?? '',
    assessmentDate: assessment.assessment_date?.toISOString?.() || assessment.assessment_date || new Date().toISOString(),
    overallScore,
    maturityLevel,
    maturityName: maturityDef?.name || 'Unknown',
    keyFindings,
    topRisks: [],
    recommendedActions: recs.map((r) => r.action).slice(0, 5),
    comparedToBenchmark: null,
  };

  const historyResult = await safeQuery(
    `SELECT assessment_date, score
     FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND framework = $2 AND status = 'completed' AND deleted_at IS NULL AND score IS NOT NULL
     ORDER BY assessment_date DESC
     LIMIT 6`,
    [tenantId, assessment.framework ?? ''],
  ).catch(() => ({ rows: [] as any[] }));

  const scoreHistory = (historyResult.rows as any[])
    .map((r) => ({
      period: r.assessment_date?.toISOString?.().split('T')[0] || String(r.assessment_date || ''),
      score: Math.round(parseFloat(String(r.score ?? 0)) * 10) / 10,
    }))
    .reverse();

  return {
    reportId: `qiyas-report-${assessmentId}`,
    generatedAt: new Date().toISOString(),
    assessmentId,
    tenantId,
    title: assessment.title ?? '',
    framework: assessment.framework ?? '',
    executiveSummary,
    domainBreakdowns,
    scoreHistory,
    recommendations: recs,
    appendix: { levels: MATURITY_LEVELS },
  };
}

export async function getExecutiveSummary(tenantId: string, assessmentId: string): Promise<ExecutiveSummary> {
  const report = await buildAssessmentReport(tenantId, assessmentId);
  return report.executiveSummary;
}

export async function getFrameworkLeaderboard(
  tenantId: string
): Promise<Array<{ framework: string; latestScore: number; maturityLevel: number; rank: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT DISTINCT ON (framework) framework, score, maturity_level
     FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND status = 'completed' AND deleted_at IS NULL AND score IS NOT NULL
       AND assessor != 'question_bank'
     ORDER BY framework, updated_at DESC`,
    [tenantId]
  );

  return result.rows
    .map(r => ({ framework: r.framework, latestScore: parseFloat(r.score), maturityLevel: parseInt(r.maturity_level, 10) }))
    .sort((a, b) => b.latestScore - a.latestScore)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
