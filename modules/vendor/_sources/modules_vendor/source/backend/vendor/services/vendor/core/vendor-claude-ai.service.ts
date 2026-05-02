/**
 * Vendor Claude AI Service -- AI-powered vendor risk assessment,
 * due diligence analysis, contract clause analysis, and vendor comparison.
 *
 * MP-10 SS8: Allowed AI participation:
 *   - Questionnaire analysis
 *   - Scoring hints
 *   - Monitoring narratives
 *   - Due diligence report generation
 *   - Contract clause analysis
 *   - Vendor comparison
 *
 * MP-10 SS8.2: Restricted AI behavior:
 *   - No autonomous protected approvals
 *   - No hidden workflow engine
 *   - No duplicate invitation/external-access truth outside DAuth
 *
 * Uses the centralized Claude client from the AI module.
 * All AI operations are logged for audit trail (Law 12).
 *
 * @owner vendor
 * @module vendor
 */

import { logger } from '../../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';

// ── AI Response Types ──────────────────────────────────────────────────

export interface VendorRiskSummaryResult {
  summary: string;
  riskFactors: { factor: string; severity: 'critical' | 'high' | 'medium' | 'low'; description: string }[];
  mitigationSuggestions: string[];
  overallRiskAssessment: string;
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface DueDiligenceReportResult {
  executiveSummary: string;
  financialAssessment: string;
  securityAssessment: string;
  complianceAssessment: string;
  overallRecommendation: 'approve' | 'conditional_approve' | 'reject' | 'escalate';
  conditions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface ContractClauseAnalysisResult {
  summary: string;
  keyClausesIdentified: { clause: string; category: string; riskLevel: string; note: string }[];
  missingClauses: string[];
  recommendations: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface VendorComparisonResult {
  comparison: string;
  strengthsByVendor: Record<string, string[]>;
  weaknessesByVendor: Record<string, string[]>;
  recommendation: string;
  scoreSummary: Record<string, number>;
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface QuestionnaireAnalysisResult {
  summary: string;
  redFlags: string[];
  greenFlags: string[];
  suggestedFollowUp: string[];
  riskIndicators: { indicator: string; severity: string; evidence: string }[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface MonitoringNarrativeResult {
  narrative: string;
  trendAssessment: string;
  alertItems: string[];
  recommendedActions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

// ── Claude Client Lazy Import ──────────────────────────────────────────

/**
 * Get the Claude client lazily to avoid circular imports.
 * Returns null if AI is not configured.
 */
async function getClaude(): Promise<{
  createChatCompletion: any;
  CLAUDE_MODEL: string;
} | null> {
  try {

    const mod = await import('../../../../config/claude-client');
    if (!mod.getClaudeClient()) return null;
    return { createChatCompletion: mod.createChatCompletion, CLAUDE_MODEL: mod.CLAUDE_MODEL };
  } catch {
    logger.warn('[vendor-ai] Claude client not available');
    return null;
  }
}

/**
 * Log AI invocation to audit trail for compliance with Law 12.
 */
async function logAiInvocation(
  tenantId: string,
  operation: string,
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number },
): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".agrc_event_log (event_type, entity_type, payload, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        'vendor.ai_invocation',
        'vendor',
        JSON.stringify({ operation, tokensUsed, timestamp: new Date().toISOString() }),
      ],
    );
  } catch {
    // Audit logging is best-effort
  }
}

// ── Core AI Functions ──────────────────────────────────────────────────

/**
 * Generate an AI-powered vendor risk assessment summary.
 *
 * MP-10 SS8.1: Scoring hints and monitoring narratives.
 */
export async function generateVendorRiskSummary(
  tenantId: string,
  vendorData: {
    vendorName: string;
    riskTier: string;
    riskScore: number;
    assessmentScores: Record<string, number>;
    openFindings: number;
    slaBreaches: number;
    contractStatus: string;
    lastAssessmentDate: string | null;
    fourthPartyCount: number;
  },
): Promise<VendorRiskSummaryResult> {
  const riskFactors: VendorRiskSummaryResult['riskFactors'] = [];
  if (vendorData.riskScore > 70) riskFactors.push({ factor: 'High risk score', severity: 'high', description: `Risk score ${vendorData.riskScore} exceeds threshold` });
  if (vendorData.openFindings > 5) riskFactors.push({ factor: 'Open findings', severity: 'medium', description: `${vendorData.openFindings} unresolved findings` });
  if (vendorData.slaBreaches > 0) riskFactors.push({ factor: 'SLA breaches', severity: 'high', description: `${vendorData.slaBreaches} SLA breaches recorded` });
  if (vendorData.fourthPartyCount > 3) riskFactors.push({ factor: 'Fourth-party concentration', severity: 'medium', description: `${vendorData.fourthPartyCount} fourth-party dependencies` });

  const fallback: VendorRiskSummaryResult = {
    summary: `${vendorData.vendorName} is classified as ${vendorData.riskTier} risk with a score of ${vendorData.riskScore}. ${riskFactors.length} risk factors identified.`,
    riskFactors,
    mitigationSuggestions: riskFactors.map(rf => `Address ${rf.factor.toLowerCase()}`),
    overallRiskAssessment: vendorData.riskTier === 'critical' || vendorData.riskTier === 'high' ? 'Elevated risk requiring attention' : 'Acceptable risk level',
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are an enterprise vendor risk management advisor. Analyze vendor risk data and provide actionable risk assessments. Be precise and compliance-focused. Output valid JSON only.`;

    const userPrompt = `Generate a vendor risk assessment summary:
Vendor: ${vendorData.vendorName}
Risk Tier: ${vendorData.riskTier}
Risk Score: ${vendorData.riskScore}/100
Assessment Scores: ${JSON.stringify(vendorData.assessmentScores)}
Open Findings: ${vendorData.openFindings}
SLA Breaches: ${vendorData.slaBreaches}
Contract Status: ${vendorData.contractStatus}
Last Assessment: ${vendorData.lastAssessmentDate || 'Never assessed'}
Fourth-Party Dependencies: ${vendorData.fourthPartyCount}

Respond with JSON:
{
  "summary": "2-3 sentence risk summary",
  "riskFactors": [{"factor": "name", "severity": "critical|high|medium|low", "description": "detail"}],
  "mitigationSuggestions": ["suggestion1", "suggestion2"],
  "overallRiskAssessment": "assessment statement"
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'generateVendorRiskSummary', result.usage);

    return {
      summary: parsed.summary || fallback.summary,
      riskFactors: parsed.riskFactors || fallback.riskFactors,
      mitigationSuggestions: parsed.mitigationSuggestions || fallback.mitigationSuggestions,
      overallRiskAssessment: parsed.overallRiskAssessment || fallback.overallRiskAssessment,
      confidence: 0.85,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[vendor-ai] generateVendorRiskSummary failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Generate an AI-powered due diligence report from assessment data.
 *
 * MP-10 SS8.1: Due diligence report generation.
 */
export async function generateDueDiligenceReport(
  tenantId: string,
  ddData: {
    vendorName: string;
    assessmentType: string;
    stepResults: { step: string; status: string; findings: string[]; score: number }[];
    financialData: Record<string, unknown>;
    securityData: Record<string, unknown>;
    complianceData: Record<string, unknown>;
  },
): Promise<DueDiligenceReportResult> {
  const completedSteps = ddData.stepResults.filter(s => s.status === 'completed');
  const failedSteps = ddData.stepResults.filter(s => s.status === 'failed');
  const avgScore = completedSteps.length > 0
    ? Math.round(completedSteps.reduce((sum, s) => sum + s.score, 0) / completedSteps.length)
    : 0;

  const recommendation: DueDiligenceReportResult['overallRecommendation'] =
    failedSteps.length > 0 ? 'escalate' :
    avgScore >= 80 ? 'approve' :
    avgScore >= 60 ? 'conditional_approve' : 'reject';

  const fallback: DueDiligenceReportResult = {
    executiveSummary: `Due diligence for ${ddData.vendorName} (${ddData.assessmentType}): ${completedSteps.length}/${ddData.stepResults.length} steps completed. Average score: ${avgScore}%.`,
    financialAssessment: 'Financial review data provided. Manual analysis recommended.',
    securityAssessment: 'Security assessment data provided. Manual analysis recommended.',
    complianceAssessment: 'Compliance check data provided. Manual analysis recommended.',
    overallRecommendation: recommendation,
    conditions: recommendation === 'conditional_approve' ? ['Address open findings before full approval'] : [],
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are an enterprise vendor due diligence analyst. Generate comprehensive due diligence reports from assessment data. Be thorough and compliance-focused. Output valid JSON only.`;

    const userPrompt = `Generate a due diligence report:
Vendor: ${ddData.vendorName}
Assessment Type: ${ddData.assessmentType}
Step Results: ${JSON.stringify(ddData.stepResults)}
Financial Data: ${JSON.stringify(ddData.financialData)}
Security Data: ${JSON.stringify(ddData.securityData)}
Compliance Data: ${JSON.stringify(ddData.complianceData)}

Respond with JSON:
{
  "executiveSummary": "comprehensive summary",
  "financialAssessment": "financial analysis",
  "securityAssessment": "security analysis",
  "complianceAssessment": "compliance analysis",
  "overallRecommendation": "approve|conditional_approve|reject|escalate",
  "conditions": ["condition1"]
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 2048 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'generateDueDiligenceReport', result.usage);

    return {
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      financialAssessment: parsed.financialAssessment || fallback.financialAssessment,
      securityAssessment: parsed.securityAssessment || fallback.securityAssessment,
      complianceAssessment: parsed.complianceAssessment || fallback.complianceAssessment,
      overallRecommendation: parsed.overallRecommendation || recommendation,
      conditions: parsed.conditions || fallback.conditions,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[vendor-ai] generateDueDiligenceReport failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Analyze contract clauses for risk and compliance gaps.
 *
 * MP-10 SS8.1: Contract clause analysis.
 */
export async function analyzeContractClauses(
  tenantId: string,
  contractData: {
    vendorName: string;
    contractType: string;
    clauses: { title: string; content: string }[];
    requiredClauses: string[];
  },
): Promise<ContractClauseAnalysisResult> {
  const foundClauseCategories = contractData.clauses.map(c => c.title.toLowerCase());
  const missingClauses = contractData.requiredClauses.filter(
    rc => !foundClauseCategories.some(fc => fc.includes(rc.toLowerCase())),
  );

  const fallback: ContractClauseAnalysisResult = {
    summary: `Contract analysis for ${contractData.vendorName} (${contractData.contractType}): ${contractData.clauses.length} clauses reviewed, ${missingClauses.length} required clauses missing.`,
    keyClausesIdentified: contractData.clauses.map(c => ({
      clause: c.title, category: 'general', riskLevel: 'low', note: 'Clause present',
    })),
    missingClauses,
    recommendations: missingClauses.length > 0 ? ['Add missing required clauses before execution'] : ['Contract appears compliant'],
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are a legal contract analyst specializing in vendor agreements. Analyze contract clauses for risk, compliance gaps, and completeness. Be precise about missing protections. Output valid JSON only.`;

    const clauseSummaries = contractData.clauses.map(c => `${c.title}: ${c.content.slice(0, 200)}`).join('\n');

    const userPrompt = `Analyze these contract clauses:
Vendor: ${contractData.vendorName}
Contract Type: ${contractData.contractType}
Required Clauses: ${contractData.requiredClauses.join(', ')}
Clauses:
${clauseSummaries}

Respond with JSON:
{
  "summary": "concise analysis",
  "keyClausesIdentified": [{"clause": "name", "category": "type", "riskLevel": "level", "note": "note"}],
  "missingClauses": ["missing1"],
  "recommendations": ["rec1"]
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1536 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'analyzeContractClauses', result.usage);

    return {
      summary: parsed.summary || fallback.summary,
      keyClausesIdentified: parsed.keyClausesIdentified || fallback.keyClausesIdentified,
      missingClauses: parsed.missingClauses || fallback.missingClauses,
      recommendations: parsed.recommendations || fallback.recommendations,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[vendor-ai] analyzeContractClauses failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Compare multiple vendors based on assessment data.
 *
 * MP-10 SS8.1: Vendor comparison.
 */
export async function compareVendors(
  tenantId: string,
  vendors: Array<{
    vendorName: string;
    riskScore: number;
    assessmentScores: Record<string, number>;
    slaCompliance: number;
    pricing: string;
    category: string;
  }>,
): Promise<VendorComparisonResult> {
  const scoreSummary: Record<string, number> = {};
  const strengthsByVendor: Record<string, string[]> = {};
  const weaknessesByVendor: Record<string, string[]> = {};

  for (const v of vendors) {
    const avgScore = Object.values(v.assessmentScores).length > 0
      ? Math.round(Object.values(v.assessmentScores).reduce((s, sc) => s + sc, 0) / Object.values(v.assessmentScores).length)
      : 0;
    scoreSummary[v.vendorName] = avgScore;
    strengthsByVendor[v.vendorName] = [];
    weaknessesByVendor[v.vendorName] = [];

    if (v.riskScore <= 30) strengthsByVendor[v.vendorName].push('Low risk score');
    else if (v.riskScore >= 70) weaknessesByVendor[v.vendorName].push('High risk score');
    if (v.slaCompliance >= 95) strengthsByVendor[v.vendorName].push('Strong SLA compliance');
    else if (v.slaCompliance < 80) weaknessesByVendor[v.vendorName].push('Low SLA compliance');
  }

  const bestVendor = Object.entries(scoreSummary).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const fallback: VendorComparisonResult = {
    comparison: `Compared ${vendors.length} vendors. Highest scoring: ${bestVendor}.`,
    strengthsByVendor,
    weaknessesByVendor,
    recommendation: `${bestVendor} ranks highest based on composite assessment scores.`,
    scoreSummary,
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are a vendor management advisor. Compare vendors objectively based on risk, compliance, and performance data. Be balanced and data-driven. Output valid JSON only.`;

    const userPrompt = `Compare these vendors:
${JSON.stringify(vendors, null, 2)}

Respond with JSON:
{
  "comparison": "overview comparison",
  "strengthsByVendor": {"vendorName": ["strength1"]},
  "weaknessesByVendor": {"vendorName": ["weakness1"]},
  "recommendation": "recommendation",
  "scoreSummary": {"vendorName": 85}
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1536 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'compareVendors', result.usage);

    return {
      comparison: parsed.comparison || fallback.comparison,
      strengthsByVendor: parsed.strengthsByVendor || fallback.strengthsByVendor,
      weaknessesByVendor: parsed.weaknessesByVendor || fallback.weaknessesByVendor,
      recommendation: parsed.recommendation || fallback.recommendation,
      scoreSummary: parsed.scoreSummary || fallback.scoreSummary,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[vendor-ai] compareVendors failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Analyze vendor questionnaire responses for risk indicators.
 *
 * MP-10 SS8.1: Questionnaire analysis.
 */
export async function analyzeQuestionnaireResponses(
  tenantId: string,
  data: {
    vendorName: string;
    questionnaireName: string;
    responses: { question: string; answer: string; category: string }[];
    expectedAnswers?: Record<string, string>;
  },
): Promise<QuestionnaireAnalysisResult> {
  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  for (const r of data.responses) {
    if (!r.answer || r.answer.trim().length < 5) {
      redFlags.push(`Incomplete answer for: ${r.question.slice(0, 80)}`);
    }
    if (r.answer.toLowerCase().includes('not applicable') || r.answer.toLowerCase().includes('n/a')) {
      redFlags.push(`N/A response for ${r.category}: ${r.question.slice(0, 60)}`);
    }
  }

  if (data.responses.filter(r => r.answer && r.answer.trim().length >= 20).length > data.responses.length * 0.8) {
    greenFlags.push('Comprehensive responses (>80% detailed answers)');
  }

  const fallback: QuestionnaireAnalysisResult = {
    summary: `Questionnaire "${data.questionnaireName}" for ${data.vendorName}: ${data.responses.length} responses analyzed. ${redFlags.length} red flags, ${greenFlags.length} green flags.`,
    redFlags,
    greenFlags,
    suggestedFollowUp: redFlags.length > 0 ? ['Request clarification on incomplete responses'] : [],
    riskIndicators: redFlags.map(rf => ({ indicator: rf, severity: 'medium', evidence: 'Questionnaire response analysis' })),
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are a vendor due diligence questionnaire analyst. Analyze responses for risk indicators, compliance gaps, and areas requiring follow-up. Be specific about concerns. Output valid JSON only.`;

    const userPrompt = `Analyze these questionnaire responses:
Vendor: ${data.vendorName}
Questionnaire: ${data.questionnaireName}
Responses: ${JSON.stringify(data.responses.slice(0, 30))}

Respond with JSON:
{
  "summary": "analysis summary",
  "redFlags": ["flag1"],
  "greenFlags": ["flag1"],
  "suggestedFollowUp": ["question1"],
  "riskIndicators": [{"indicator": "name", "severity": "level", "evidence": "detail"}]
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1536 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'analyzeQuestionnaireResponses', result.usage);

    return {
      summary: parsed.summary || fallback.summary,
      redFlags: parsed.redFlags || fallback.redFlags,
      greenFlags: parsed.greenFlags || fallback.greenFlags,
      suggestedFollowUp: parsed.suggestedFollowUp || fallback.suggestedFollowUp,
      riskIndicators: parsed.riskIndicators || fallback.riskIndicators,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[vendor-ai] analyzeQuestionnaireResponses failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Generate a monitoring narrative for continuous vendor oversight.
 *
 * MP-10 SS8.1: Monitoring narratives.
 */
export async function generateMonitoringNarrative(
  tenantId: string,
  monitoringData: {
    vendorName: string;
    riskTier: string;
    recentSignals: { signalType: string; severity: string; date: string; detail: string }[];
    slaMetrics: { metric: string; target: number; actual: number }[];
    trendDirection: 'improving' | 'declining' | 'stable';
  },
): Promise<MonitoringNarrativeResult> {
  const alertItems = monitoringData.recentSignals
    .filter(s => s.severity === 'critical' || s.severity === 'high')
    .map(s => `${s.signalType}: ${s.detail}`);

  const slaBreaches = monitoringData.slaMetrics.filter(m => m.actual < m.target);

  const fallback: MonitoringNarrativeResult = {
    narrative: `${monitoringData.vendorName} (${monitoringData.riskTier} risk) monitoring update: ${monitoringData.recentSignals.length} signals detected, ${slaBreaches.length} SLA breaches, trend ${monitoringData.trendDirection}.`,
    trendAssessment: `Vendor performance trend is ${monitoringData.trendDirection}.`,
    alertItems,
    recommendedActions: alertItems.length > 0
      ? ['Review critical/high signals immediately', 'Schedule vendor review meeting']
      : ['Continue routine monitoring'],
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are a vendor continuous monitoring analyst. Generate clear monitoring narratives highlighting risks, trends, and required actions. Be actionable and concise. Output valid JSON only.`;

    const userPrompt = `Generate a monitoring narrative:
Vendor: ${monitoringData.vendorName}
Risk Tier: ${monitoringData.riskTier}
Recent Signals: ${JSON.stringify(monitoringData.recentSignals)}
SLA Metrics: ${JSON.stringify(monitoringData.slaMetrics)}
Trend: ${monitoringData.trendDirection}

Respond with JSON:
{
  "narrative": "monitoring summary",
  "trendAssessment": "trend analysis",
  "alertItems": ["alert1"],
  "recommendedActions": ["action1"]
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'generateMonitoringNarrative', result.usage);

    return {
      narrative: parsed.narrative || fallback.narrative,
      trendAssessment: parsed.trendAssessment || fallback.trendAssessment,
      alertItems: parsed.alertItems || fallback.alertItems,
      recommendedActions: parsed.recommendedActions || fallback.recommendedActions,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[vendor-ai] generateMonitoringNarrative failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}
