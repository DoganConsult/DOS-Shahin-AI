// ============================================
// Shahin — Questionnaire Intelligence Engine — Facade
// Re-exports sub-modules and keeps orchestrators:
//   generateWorkspaceConfig, generateIntelligenceReport, generateExecutiveSummary
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';

// ── Re-export branching sub-module ──
export {
  getBranchingRules,
  computeSkipSet,
  computeSkipSetFromOrgProfile,
  type BranchingRule,
} from './questionnaire-branching.service';

// ── Re-export maturity scorer sub-module ──
export {
  computeMaturityScores,
  generateGapAnalysis,
  scoreToMaturity,
  getCategoryScore,
  CATEGORY_META,
  RECOMMENDATION_TEMPLATES,
  INDUSTRY_BENCHMARKS,
  type CategoryScore,
  type GapItem,
} from './questionnaire-maturity-scorer.service';

// ── Re-export framework recommender sub-module ──
export {
  getSectorFrameworkBreakdown,
  recommendFrameworks,
  resolveSectorRegulators,
  type FrameworkRecommendation,
} from './questionnaire-framework-recommender.service';

// ── Import internals needed by orchestrators ──
import {
  computeMaturityScores,
  generateGapAnalysis,
  scoreToMaturity,
  getCategoryScore,
  CATEGORY_META as _CATEGORY_META,
  INDUSTRY_BENCHMARKS,
  type CategoryScore,
  type GapItem,
} from './questionnaire-maturity-scorer.service';

import {
  recommendFrameworks,
  type FrameworkRecommendation,
} from './questionnaire-framework-recommender.service';

// ─── Types ──────────────────────────────────────

export interface WorkspaceConfig {
  enabledModules: string[];
  suggestedPhase: string;
  riskProfile: 'low' | 'medium' | 'high' | 'critical';
  suggestedFrameworks: string[];
  scopeDimensions: { type: string; values: string[] }[];
  priorityAreas: string[];
}

export interface IntelligenceReport {
  assessmentId: string;
  overallScore: number;
  overallMaturity: number;
  overallLabel: string;
  categoryScores: CategoryScore[];
  gaps: GapItem[];
  frameworkRecommendations: FrameworkRecommendation[];
  workspaceConfig: WorkspaceConfig;
  benchmarkComparison: { category: string; yourScore: number; industryAvg: number }[];
  executiveSummary_en: string;
  executiveSummary_ar: string;
  generatedAt: string;
}

// ─── Workspace Auto-Configuration ───────────────

/**
 * Generate workspace configuration based on assessment results.
 * Determines which modules to enable, lifecycle phase, and priority areas.
 */
export function generateWorkspaceConfig(
  orgAnswers: { question_id: string; answer: unknown }[],
  categoryScores: CategoryScore[],
  overallScore: number
): WorkspaceConfig {
  const answerMap = new Map<string, unknown>();
  for (const a of orgAnswers) answerMap.set(a.question_id, a.answer);

  // Determine risk profile based on sector, size, and maturity
  const empCount = answerMap.get('Q0003') || '1-50';
  const grcMaturity = answerMap.get('Q0016') || 'No program exists';
  let riskProfile: WorkspaceConfig['riskProfile'] = 'medium';

  if (grcMaturity === 'No program exists' || grcMaturity === 'Ad-hoc processes') {
    riskProfile = overallScore < 30 ? 'critical' : 'high';
  } else if (overallScore >= 75) {
    riskProfile = 'low';
  }

  // Determine suggested lifecycle phase
  let suggestedPhase = 'plan';
  if (overallScore >= 80) suggestedPhase = 'improve';
  else if (overallScore >= 65) suggestedPhase = 'assure';
  else if (overallScore >= 50) suggestedPhase = 'operate';
  else if (overallScore >= 35) suggestedPhase = 'implement';
  else if (overallScore >= 20) suggestedPhase = 'design';
  else if (overallScore >= 10) suggestedPhase = 'assess';

  // Enable all core modules, plus optional ones based on needs
  const enabledModules = [
    'governance', 'risks', 'compliance', 'controls', 'policies',
    'evidence', 'audit', 'incidents',
  ];

  // Add vendor management if they have vendors
  const vendorCount = answerMap.get('Q0302');
  if (vendorCount && vendorCount !== '1-10') {
    enabledModules.push('vendors');
  }

  // Add BCP if needed
  const bcpScore = getCategoryScore(categoryScores, 'bcp');
  if (bcpScore < 60 || empCount !== '1-50') {
    enabledModules.push('bcp');
  }

  // Add privacy module
  enabledModules.push('privacy');

  // Add digital twin and red team for mature orgs
  if (overallScore >= 65) {
    enabledModules.push('digital-twin', 'red-team');
  }

  // Priority areas: bottom 3 categories by score (excluding org_profile)
  const scoredCats = categoryScores
    .filter(c => c.category !== 'org_profile')
    .sort((a, b) => a.score - b.score);
  const priorityAreas = scoredCats.slice(0, 3).map(c => c.category);

  // Scope dimensions based on org structure
  const scopeDimensions: { type: string; values: string[] }[] = [];
  const locations = answerMap.get('Q0012');
  if (locations && locations !== '1') {
    scopeDimensions.push({ type: 'location', values: ['Head Office', 'Branch 1', 'Branch 2'] });
  }
  const hasSubsidiaries = answerMap.get('Q0013');
  if (hasSubsidiaries) {
    scopeDimensions.push({ type: 'entity', values: ['Parent Company', 'Subsidiary 1'] });
  }

  const suggestedFrameworks = ['NCA ECC', 'PDPL'];
  const sector = answerMap.get('Q0006');
  if (sector && Array.isArray(sector)) {
    if (sector.some(s => /bank|financ/i.test(s))) suggestedFrameworks.push('SAMA CSF');
    if (sector.some(s => /telecom/i.test(s))) suggestedFrameworks.push('CST CRF');
    if (sector.some(s => /health/i.test(s))) suggestedFrameworks.push('MOH HIS');
    if (sector.some(s => /energy|oil|gas|electric/i.test(s))) suggestedFrameworks.push('NCA OTCC');
    if (sector.some(s => /capital|securities/i.test(s))) suggestedFrameworks.push('CMA Cyber');
    if (sector.some(s => /retail|commerce/i.test(s))) suggestedFrameworks.push('ZATCA E-Invoice');
  }

  return {
    enabledModules,
    suggestedPhase,
    riskProfile,
    suggestedFrameworks,
    scopeDimensions,
    priorityAreas,
  };
}

// ─── Executive Summary Generator ────────────────

function generateExecutiveSummary(
  overallScore: number,
  overallLabel: string,
  categoryScores: CategoryScore[],
  gaps: GapItem[],
  frameworks: FrameworkRecommendation[]
): { en: string; ar: string } {
  const criticalGaps = gaps.filter(g => g.priority === 'critical').length;
  const highGaps = gaps.filter(g => g.priority === 'high').length;
  const mandatoryFrameworks = frameworks.filter(f => f.priority === 'mandatory').length;

  const weakest = categoryScores
    .filter(c => c.category !== 'org_profile')
    .sort((a, b) => a.score - b.score)[0];
  const strongest = categoryScores
    .filter(c => c.category !== 'org_profile')
    .sort((a, b) => b.score - a.score)[0];

  const en = `Your organization achieved an overall GRC maturity score of ${overallScore}% (${overallLabel} — Level ${scoreToMaturity(overallScore).level}/5). ` +
    `Your strongest area is ${strongest?.label_en || 'N/A'} (${strongest?.score || 0}%), while ${weakest?.label_en || 'N/A'} (${weakest?.score || 0}%) requires immediate attention. ` +
    `The assessment identified ${criticalGaps} critical and ${highGaps} high-priority gaps across ${categoryScores.length - 1} domains. ` +
    `${mandatoryFrameworks} regulatory frameworks are mandatory for your organization. ` +
    `Focus on the top 3 priority areas to achieve the most significant maturity improvement in the shortest timeframe.`;

  const ar = `حققت مؤسستك درجة نضج شاملة في الحوكمة والمخاطر والامتثال بنسبة ${overallScore}% (${overallLabel} — المستوى ${scoreToMaturity(overallScore).level}/5). ` +
    `أقوى مجال لديك هو ${strongest?.label_ar || 'غير متاح'} (${strongest?.score || 0}%)، بينما ${weakest?.label_ar || 'غير متاح'} (${weakest?.score || 0}%) يحتاج اهتمامًا فوريًا. ` +
    `حدد التقييم ${criticalGaps} فجوة حرجة و${highGaps} فجوة عالية الأولوية عبر ${categoryScores.length - 1} مجالات. ` +
    `${mandatoryFrameworks} أطر تنظيمية إلزامية لمؤسستك. ` +
    `ركز على أعلى 3 مجالات أولوية لتحقيق أهم تحسين في النضج في أقصر وقت.`;

  return { en, ar };
}

// ─── Main Intelligence Report Generator ─────────

/**
 * Generate a complete intelligence report from an assessment.
 * This is the main entry point that combines all 5 maximizers.
 */
export async function generateIntelligenceReport(
  tenantId: string,
  assessmentId: string
): Promise<IntelligenceReport> {
  const schema = tenantSchema(tenantId);

  // Fetch all responses with question metadata
  const result = await safeQuery(
    `SELECT r.question_id, r.answer, r.score,
            q.category, q.domain, q.weight, q.text_en, q.text_ar, q.tags
     FROM "${schema}".maturity_responses r
     JOIN maturity_questions q ON q.question_id = r.question_id
     WHERE r.assessment_id = $1
     ORDER BY q.sort_order`,
    [assessmentId]
  );

  const responses: unknown[] = result.rows.map((r: GenericRow) => {
    let answer = r.answer;
    if (typeof answer === 'string') {
      try { answer = JSON.parse(answer); } catch { /* keep raw string */ }
    }
    return {
      ...r,
      answer,
      score: Number(r.score) || 0,
      weight: Number(r.weight) || 1,
    };
  });

  const { categoryScores, overallScore, overallMaturity, overallLabel } =
    computeMaturityScores((responses as any));

  const gaps = generateGapAnalysis((responses as any));

  const orgAnswers = responses.filter(( r: Record<string, unknown>) => r.category === 'org_profile');
  const frameworkRecommendations = await recommendFrameworks((orgAnswers as any), categoryScores);

  const workspaceConfig = generateWorkspaceConfig((orgAnswers as any), categoryScores, overallScore);

  // 6. Benchmark comparison
  const benchmarkComparison = categoryScores.map(c => ({
    category: c.category,
    yourScore: c.score,
    industryAvg: INDUSTRY_BENCHMARKS[c.category] || 50,
  }));

  // 7. Executive summary
  const summary = generateExecutiveSummary(overallScore, overallLabel, categoryScores, gaps, frameworkRecommendations);

  // 8. Persist the report
  try {
    await safeQuery(
      `UPDATE "${schema}".maturity_assessments
       SET overall_score = $1, domain_scores = $2, status = 'completed', completed_at = NOW()
       WHERE assessment_id = $3`,
      [overallScore, JSON.stringify(Object.fromEntries(categoryScores.map(c => [c.category, c.score]))), assessmentId]
    );
  } catch { /* table might not have all columns */ }

  return {
    assessmentId,
    overallScore,
    overallMaturity,
    overallLabel,
    categoryScores,
    gaps,
    frameworkRecommendations,
    workspaceConfig,
    benchmarkComparison,
    executiveSummary_en: summary.en,
    executiveSummary_ar: summary.ar,
    generatedAt: new Date().toISOString(),
  };
}
