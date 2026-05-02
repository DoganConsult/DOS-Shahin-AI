/**
 * Governance AI — Narrative Engine Service
 * AGRC-OS Enterprise AI-Powered Narrative Generation
 *
 * Generates human-readable summaries of governance, risk, and compliance posture:
 * - Context-aware narrative generation (risk, compliance, governance, executive)
 * - Bilingual output (English + Arabic) for KSA regulatory alignment
 * - Board-level and risk-focused specialized narratives
 * - Feedback collection and quality tracking
 * - 1-hour cache for generated narratives
 *
 * Uses Claude AI for professional GRC-language narrative generation.
 */

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { claudeJSON } from '../../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type NarrativeContext = 'risk' | 'compliance' | 'governance' | 'executive';
export type NarrativeTone = 'executive' | 'board' | 'technical' | 'summary';

export interface NarrativeResult {
  narrative_id: string;
  narrative: string;
  narrative_ar?: string;
  language: string;
  context: NarrativeContext;
  tone: NarrativeTone;
  metrics: NarrativeMetric[];
  recommendations: string[];
  generatedAt: string;
  cached: boolean;
}

interface NarrativeMetric {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  context?: string;
}

export interface FeedbackResult {
  feedbackId: string;
}

export interface FeedbackStats {
  avgRating: number;
  totalFeedback: number;
  topIssues: Array<{ issue: string; count: number }>;
  byType: Array<{ feedback_type: string; count: number }>;
  ratingDistribution: Record<number, number>;
}

// ═══════════════════════════════════════════════════════════════
// In-memory narrative cache (1-hour TTL)
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 3600_000; // 1 hour
const narrativeCache = new Map<string, { result: NarrativeResult; ts: number }>();

function getCacheKey(tenantId: string, context: string, extra?: string): string {
  return `${tenantId}:${context}:${extra || ''}`;
}

function getCached(key: string): NarrativeResult | null {
  const entry = narrativeCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return { ...entry.result, cached: true };
  }
  if (entry) narrativeCache.delete(key);
  return null;
}

function setCache(key: string, result: NarrativeResult): void {
  // Evict old entries if cache grows too large (max 500 entries)
  if (narrativeCache.size > 500) {
    const entries: Array<[string, { result: NarrativeResult; ts: number }]> = [];
    narrativeCache.forEach((v, k) => entries.push([k, v]));
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const toEvict = entries.slice(0, 100);
    for (let i = 0; i < toEvict.length; i++) narrativeCache.delete(toEvict[i][0]);
  }
  narrativeCache.set(key, { result, ts: Date.now() });
}

// ═══════════════════════════════════════════════════════════════
// Main: Generate Narrative Summary
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a human-readable narrative summary for the given context type.
 * Gathers metrics from tenant DB, generates bilingual narrative via Claude AI,
 * and caches the result for 1 hour.
 */
export async function generateNarrativeSummary(
  tenantId: string,
  context?: NarrativeContext
): Promise<NarrativeResult> {
  const ctx = context || 'governance';
  const cacheKey = getCacheKey(tenantId, ctx);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const metrics: NarrativeMetric[] = [];
  const dataContext: Record<string, unknown> = {};

  // Gather metrics based on context type
  try {
    switch (ctx) {
      case 'risk':
        await gatherRiskMetrics(schema, tenantId, metrics, dataContext);
        break;
      case 'compliance':
        await gatherComplianceMetrics(schema, tenantId, metrics, dataContext);
        break;
      case 'executive':
        await gatherExecutiveMetrics(schema, tenantId, metrics, dataContext);
        break;
      case 'governance':
      default:
        await gatherGovernanceMetrics(schema, tenantId, metrics, dataContext);
        break;
    }
  } catch (e: unknown) {
    // Partial data is acceptable; AI will note gaps
    dataContext._gatherError = toErrorMessage(e);
  }

  // Generate narrative via Claude AI
  const narrativeId = `nar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let narrative = '';
  let narrativeAr = '';
  let recommendations: string[] = [];

  const tone: NarrativeTone = ctx === 'executive' ? 'board' : ctx === 'risk' ? 'technical' : 'executive';

  try {
    const aiResult = await claudeJSON<{
      narrative_en: string;
      narrative_ar: string;
      recommendations: string[];
    }>({
      systemPrompt: buildNarrativeSystemPrompt(ctx, tone),
      userMessage: `Generate a GRC narrative summary for context "${ctx}".\n\nMetrics:\n${JSON.stringify(metrics)}\n\nData context:\n${JSON.stringify(dataContext)}`,
      maxTokens: 2048,
      temperature: 0.3,
      tenantId,
      agentId: 'governance-ai-narrative-engine',
      decisionType: 'narrative_generation',
    });

    narrative = aiResult.narrative_en || '';
    narrativeAr = aiResult.narrative_ar || '';
    recommendations = Array.isArray(aiResult.recommendations) ? aiResult.recommendations : [];
  } catch {
    // Fallback: build a rule-based narrative from collected metrics
    narrative = buildFallbackNarrative(ctx, metrics, dataContext);
    narrativeAr = '';
    recommendations = buildFallbackRecommendations(ctx, dataContext);
  }

  // Persist narrative to DB for history and feedback association
  await safeQuery(`
    INSERT INTO "${schema}".governance_ai_narratives
      (tenant_id, narrative_id, context_type, tone, narrative_en, narrative_ar,
       metrics_json, recommendations_json, generated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `, [
    tenantId, narrativeId, ctx, tone, narrative, narrativeAr,
    JSON.stringify(metrics), JSON.stringify(recommendations),
  ]).catch(catchHandler(EC.FALLBACK_QUERY, {
    operation: 'persist governance AI narrative',
    tenantId,

    narrativeId,
  }));

  const result: NarrativeResult = {
    narrative_id: narrativeId,
    narrative,
    narrative_ar: narrativeAr || undefined,
    language: narrativeAr ? 'en+ar' : 'en',
    context: ctx,
    tone,
    metrics,
    recommendations,
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  setCache(cacheKey, result);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Submit Feedback
// ═══════════════════════════════════════════════════════════════

/**
 * Record user feedback on a generated narrative.
 * Stores rating (1-5), comment, and correction suggestions as training signals.
 */
export async function submitFeedback(
  tenantId: string,
  narrativeId: string,
  userId: string,
  feedback: { rating?: number; comment?: string; correction?: string; feedback_type?: string }
): Promise<FeedbackResult> {
  const schema = tenantSchema(tenantId);
  const rating = Math.min(5, Math.max(1, feedback.rating || 3));
  const feedbackType = feedback.feedback_type || (rating <= 2 ? 'negative' : rating >= 4 ? 'positive' : 'neutral');

  const res = await safeQuery(`
    INSERT INTO "${schema}".governance_ai_feedback
      (tenant_id, source_type, source_id, feedback_type, feedback_text, user_id, rating,
       correction_suggestion, created_at)
    VALUES ($1, 'narrative', $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id
  `, [
    tenantId, narrativeId, feedbackType,
    feedback.comment || '', userId, rating,
    feedback.correction || null,
  ]);

  return { feedbackId: res.rows[0]?.id || `fb-${Date.now()}` };
}

// ═══════════════════════════════════════════════════════════════
// Feedback Stats
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate feedback metrics: average rating, total count, common correction themes.
 */
export async function getFeedbackStats(tenantId: string): Promise<FeedbackStats> {
  const schema = tenantSchema(tenantId);

  const [statsRes, byTypeRes, topIssuesRes, distRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ avg_rating: 0, total: 0 }]), safeQuery(`
      SELECT
        ROUND(AVG(COALESCE(rating, 3))::numeric, 2) AS avg_rating,
        COUNT(*)::int AS total
      FROM "${schema}".governance_ai_feedback
      WHERE tenant_id = $1
    `, [tenantId]), { tenantId: tenantId, operation: 'query governance_ai_feedback' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT feedback_type, COUNT(*)::int AS count
      FROM "${schema}".governance_ai_feedback
      WHERE tenant_id = $1
      GROUP BY feedback_type
      ORDER BY count DESC
    `, [tenantId]), { tenantId: tenantId, operation: 'query governance_ai_feedback' }),

    // Extract common correction themes from negative feedback
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT
        COALESCE(correction_suggestion, feedback_text) AS issue,
        COUNT(*)::int AS count
      FROM "${schema}".governance_ai_feedback
      WHERE tenant_id = $1 AND rating <= 2
        AND (correction_suggestion IS NOT NULL OR feedback_text IS NOT NULL)
      GROUP BY COALESCE(correction_suggestion, feedback_text)
      ORDER BY count DESC
      LIMIT 10
    `, [tenantId]), { tenantId: tenantId, operation: 'query governance_ai_feedback' }),

    // Rating distribution
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT COALESCE(rating, 3) AS rating, COUNT(*)::int AS count
      FROM "${schema}".governance_ai_feedback
      WHERE tenant_id = $1
      GROUP BY COALESCE(rating, 3)
      ORDER BY rating
    `, [tenantId]), { tenantId: tenantId, operation: 'query governance_ai_feedback' }),
  ]);

  const ratingDist: Record<number, number> = {};

  for (const r of distRes.rows) ratingDist[r.rating] = r.count;

  return {

    avgRating: parseFloat(statsRes.rows[0]?.avg_rating) || 0,
    totalFeedback: statsRes.rows[0]?.total || 0,
    topIssues: topIssuesRes.rows.map((r: GenericRow) => ({ issue: (r.issue || '').slice(0, 200), count: r.count })),

    byType: byTypeRes.rows,
    ratingDistribution: ratingDist,
  };
}

// ═══════════════════════════════════════════════════════════════
// Board Narrative
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a board-level narrative with KPIs suitable for board pack inclusion.
 * Includes governance health, top risks, compliance posture, and action items.
 */
export async function generateBoardNarrative(tenantId: string): Promise<NarrativeResult> {
  const cacheKey = getCacheKey(tenantId, 'board');
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const metrics: NarrativeMetric[] = [];
  const dataContext: Record<string, unknown> = {};

  // Gather board-level KPIs from multiple domains
  await Promise.all([
    gatherGovernanceMetrics(schema, tenantId, metrics, dataContext),
    gatherRiskMetrics(schema, tenantId, metrics, dataContext),
    gatherComplianceMetrics(schema, tenantId, metrics, dataContext),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Board attention items
  const boardItems = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, open_items: 0, critical_items: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'open')::int AS open_items,
           COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical_items
    FROM "${schema}".board_attention_items
    WHERE tenant_id = $1 AND status != 'closed'
  `, [tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' });

  const bi = boardItems.rows[0] || {};
  metrics.push(

    { label: 'Board Attention Items', value: bi.total || 0, context: 'open items requiring board action' },

    { label: 'Critical Board Items', value: bi.critical_items || 0, context: 'items at critical severity' },
  );
  dataContext.board_attention = bi;

  const narrativeId = `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let narrative = '';
  let narrativeAr = '';
  let recommendations: string[] = [];

  try {
    const aiResult = await claudeJSON<{
      narrative_en: string;
      narrative_ar: string;
      recommendations: string[];
    }>({
      systemPrompt: `You are a GRC board report narrative generator for an enterprise in Saudi Arabia.
Generate a professional board-level summary suitable for inclusion in a board pack.

Requirements:
- Tone: formal, concise, strategic — written for board members and C-suite executives
- Structure: Opening statement, key metrics overview, risk highlights, compliance posture, recommended actions
- Include specific numbers and trends from the provided metrics
- Bilingual: provide both English and Arabic versions
- Arabic should be professional Modern Standard Arabic suitable for Saudi board presentations
- Maximum 500 words per language
- Focus on material issues that require board attention or decision

Respond with JSON: { "narrative_en": string, "narrative_ar": string, "recommendations": string[] }`,
      userMessage: `Generate board narrative.\n\nKPIs:\n${JSON.stringify(metrics)}\n\nContext:\n${JSON.stringify(dataContext)}`,
      maxTokens: 2048,
      temperature: 0.3,
      tenantId,
      agentId: 'governance-ai-board-narrative',
      decisionType: 'board_narrative_generation',
    });

    narrative = aiResult.narrative_en || '';
    narrativeAr = aiResult.narrative_ar || '';
    recommendations = Array.isArray(aiResult.recommendations) ? aiResult.recommendations : [];
  } catch {
    narrative = buildFallbackNarrative('executive', metrics, dataContext);
    recommendations = buildFallbackRecommendations('executive', dataContext);
  }

  // Persist board narrative
  await safeQuery(`
    INSERT INTO "${schema}".governance_ai_narratives
      (tenant_id, narrative_id, context_type, tone, narrative_en, narrative_ar,
       metrics_json, recommendations_json, generated_at)
    VALUES ($1, $2, 'board', 'board', $3, $4, $5, $6, NOW())
  `, [
    tenantId, narrativeId, narrative, narrativeAr,
    JSON.stringify(metrics), JSON.stringify(recommendations),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  const result: NarrativeResult = {
    narrative_id: narrativeId,
    narrative,
    narrative_ar: narrativeAr || undefined,
    language: narrativeAr ? 'en+ar' : 'en',
    context: 'executive',
    tone: 'board',
    metrics,
    recommendations,
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  setCache(cacheKey, result);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Risk Narrative
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a risk-focused narrative, optionally scoped to a specific risk.
 * Includes risk score trends, control effectiveness, mitigation status.
 */
export async function generateRiskNarrative(
  tenantId: string,
  riskId?: string
): Promise<NarrativeResult> {
  const cacheKey = getCacheKey(tenantId, 'risk', riskId || 'all');
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const schema = tenantSchema(tenantId);
  const metrics: NarrativeMetric[] = [];
  const dataContext: Record<string, unknown> = {};

  if (riskId) {
    // Single risk deep-dive
    const riskRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT * FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL
    `, [riskId]), { tenantId: tenantId, operation: 'query risks' });

    const risk = riskRes.rows[0];
    if (risk) {
      dataContext.risk = {
        risk_id: risk.risk_id, title: risk.title, risk_category: risk.risk_category,
        inherent_score: risk.inherent_score, residual_score: risk.residual_score,
        risk_level: risk.risk_level, owner: risk.owner, status: risk.status,
      };
      metrics.push(

        { label: 'Inherent Risk Score', value: risk.inherent_score || 0 },
        { label: 'Residual Risk Score', value: risk.residual_score || 0 },
        { label: 'Risk Level', value: risk.risk_level || 'any' },
      );

      // Related controls for this risk
      const controlsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
        SELECT c.control_id, c.title, c.test_status, c.effectiveness
        FROM "${schema}".controls c
        WHERE c.risk_id = $1 AND c.deleted_at IS NULL
      `, [riskId]), { tenantId: tenantId, operation: 'query controls' });

      dataContext.linked_controls = controlsRes.rows;
      metrics.push({ label: 'Linked Controls', value: controlsRes.rows.length });
    }
  } else {
    // All-risks overview
    await gatherRiskMetrics(schema, tenantId, metrics, dataContext);
  }

  const narrativeId = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let narrative = '';
  let narrativeAr = '';
  let recommendations: string[] = [];

  try {
    const aiResult = await claudeJSON<{
      narrative_en: string;
      narrative_ar: string;
      recommendations: string[];
    }>({
      systemPrompt: `You are an enterprise risk management narrative generator for a Saudi Arabian organization.
Generate a professional risk-focused narrative.

Requirements:
- Tone: technical and analytical — written for risk managers and practitioners
- Include quantitative analysis of risk scores, control effectiveness, and mitigation progress
- If a specific risk is provided, give a deep-dive analysis; otherwise, provide a portfolio overview
- Bilingual: provide both English and Arabic versions
- Arabic should use professional risk management terminology
- Maximum 400 words per language
- Highlight trends, emerging risks, and areas requiring immediate attention

Respond with JSON: { "narrative_en": string, "narrative_ar": string, "recommendations": string[] }`,
      userMessage: `Generate risk narrative${riskId ? ` for risk ${riskId}` : ' (portfolio overview)'}.\n\nMetrics:\n${JSON.stringify(metrics)}\n\nContext:\n${JSON.stringify(dataContext)}`,
      maxTokens: 2048,
      temperature: 0.3,
      tenantId,
      agentId: 'governance-ai-risk-narrative',
      decisionType: 'risk_narrative_generation',
    });

    narrative = aiResult.narrative_en || '';
    narrativeAr = aiResult.narrative_ar || '';
    recommendations = Array.isArray(aiResult.recommendations) ? aiResult.recommendations : [];
  } catch {
    narrative = buildFallbackNarrative('risk', metrics, dataContext);
    recommendations = buildFallbackRecommendations('risk', dataContext);
  }

  // Persist
  await safeQuery(`
    INSERT INTO "${schema}".governance_ai_narratives
      (tenant_id, narrative_id, context_type, tone, narrative_en, narrative_ar,
       metrics_json, recommendations_json, generated_at)
    VALUES ($1, $2, 'risk', 'technical', $3, $4, $5, $6, NOW())
  `, [
    tenantId, narrativeId, narrative, narrativeAr,
    JSON.stringify(metrics), JSON.stringify(recommendations),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  const result: NarrativeResult = {
    narrative_id: narrativeId,
    narrative,
    narrative_ar: narrativeAr || undefined,
    language: narrativeAr ? 'en+ar' : 'en',
    context: 'risk',
    tone: 'technical',
    metrics,
    recommendations,
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  setCache(cacheKey, result);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Data Gatherers — Query tenant DB for narrative context
// ═══════════════════════════════════════════════════════════════

async function gatherGovernanceMetrics(
  schema: string, tenantId: string,
  metrics: NarrativeMetric[], ctx: Record<string, unknown>
): Promise<void> {
  // Active governance signals
  const signalStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'new')::int AS new_signals,
      COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
      COUNT(*) FILTER (WHERE board_attention_flag = TRUE)::int AS board_flagged
    FROM "${schema}".governance_signals
    WHERE tenant_id = $1 AND status NOT IN ('resolved', 'archived')
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_signals' });

  const ss = signalStats.rows[0] || {};
  metrics.push(

    { label: 'Active Signals', value: ss.total || 0 },

    { label: 'Critical Signals', value: ss.critical || 0 },

    { label: 'Board-Flagged Signals', value: ss.board_flagged || 0 },
  );
  ctx.signals = ss;

  // Governance action items backlog
  const actionStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'closed', 'cancelled'))::int AS open_items,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
    FROM "${schema}".governance_action_items
    WHERE deleted_at IS NULL AND tenant_id = $1
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_action_items' });

  const as_ = actionStats.rows[0] || {};
  metrics.push(

    { label: 'Open Action Items', value: as_.open_items || 0 },

    { label: 'Completed Action Items', value: as_.completed || 0 },
  );
  ctx.action_items = as_;

  // AI recommendations status
  const recStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT accepted_status, COUNT(*)::int AS count
    FROM "${schema}".governance_recommendations
    WHERE tenant_id = $1
    GROUP BY accepted_status
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_recommendations' });

  const recMap: Record<string, number> = {};

  for (const r of recStats.rows) recMap[r.accepted_status] = r.count;
  ctx.recommendations = recMap;
  if (Object.keys(recMap).length > 0) {
    metrics.push({ label: 'AI Recommendations', value: `${recMap.accepted || 0} accepted / ${recMap.rejected || 0} rejected` });
  }
}

async function gatherRiskMetrics(
  schema: string, tenantId: string,
  metrics: NarrativeMetric[], ctx: Record<string, unknown>
): Promise<void> {
  const riskStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE risk_level IN ('critical', 'very_high'))::int AS critical_risks,
      COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high_risks,
      COUNT(*) FILTER (WHERE risk_level = 'medium')::int AS medium_risks,
      COUNT(*) FILTER (WHERE risk_level = 'low')::int AS low_risks,
      ROUND(AVG(inherent_score)::numeric, 1) AS avg_inherent,
      ROUND(AVG(residual_score)::numeric, 1) AS avg_residual
    FROM "${schema}".risks
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
  `), { tenantId: tenantId, operation: 'query risks' });

  const rs = riskStats.rows[0] || {};
  metrics.push(

    { label: 'Total Active Risks', value: rs.total || 0 },

    { label: 'Critical/Very High Risks', value: rs.critical_risks || 0 },

    { label: 'High Risks', value: rs.high_risks || 0 },

    { label: 'Avg Inherent Score', value: parseFloat(rs.avg_inherent) || 0 },

    { label: 'Avg Residual Score', value: parseFloat(rs.avg_residual) || 0 },
  );
  ctx.risks = rs;

  // Top 5 risks by inherent score
  const topRisks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT risk_id, title, inherent_score, residual_score, risk_level
    FROM "${schema}".risks
    WHERE deleted_at IS NULL AND status NOT IN ('closed', 'archived')
    ORDER BY inherent_score DESC NULLS LAST
    LIMIT 5
  `), { tenantId: tenantId, operation: 'query risks' });

  ctx.top_risks = topRisks.rows;
}

async function gatherComplianceMetrics(
  schema: string, tenantId: string,
  metrics: NarrativeMetric[], ctx: Record<string, unknown>
): Promise<void> {
  // Control status distribution
  const controlStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE test_status = 'passed')::int AS passed,
      COUNT(*) FILTER (WHERE test_status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE test_status IS NULL OR test_status = 'not_tested')::int AS untested
    FROM "${schema}".controls
    WHERE deleted_at IS NULL
  `), { tenantId: tenantId, operation: 'query controls' });

  const cs = controlStats.rows[0] || {};

  const effectivenessRate = cs.total > 0 ? Math.round(((cs.passed || 0) / cs.total) * 100) : 0;
  metrics.push(

    { label: 'Total Controls', value: cs.total || 0 },

    { label: 'Control Effectiveness', value: `${effectivenessRate}%`, context: `${cs.passed || 0} passed / ${cs.failed || 0} failed` },

    { label: 'Untested Controls', value: cs.untested || 0 },
  );
  ctx.controls = { ...cs, effectiveness_rate: effectivenessRate };

  // Framework coverage
  const frameworkStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT f.framework_code, f.name_en,
           COUNT(c.control_id)::int AS control_count,
           COUNT(c.control_id) FILTER (WHERE c.test_status = 'passed')::int AS passed_count
    FROM "${schema}".frameworks f
    LEFT JOIN "${schema}".controls c ON c.framework_id = f.framework_id AND c.deleted_at IS NULL
    WHERE f.deleted_at IS NULL
    GROUP BY f.framework_code, f.name_en
  `), { tenantId: tenantId, operation: 'query frameworks' });

  ctx.frameworks = frameworkStats.rows.map((f: GenericRow) => ({
    ...f,
    compliance_rate: f.control_count > 0 ? Math.round((f.passed_count / f.control_count) * 100) : 0,
  }));

  // Evidence coverage
  const evidenceStats = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{}]), safeQuery(`
    SELECT
      COUNT(*)::int AS total_tasks,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'approved'))::int AS overdue
    FROM "${schema}".evidence_tasks
    WHERE deleted_at IS NULL
  `), { tenantId: tenantId, operation: 'query evidence_tasks' });

  const es = evidenceStats.rows[0] || {};
  metrics.push(

    { label: 'Evidence Tasks', value: `${es.completed || 0}/${es.total_tasks || 0} completed` },

    { label: 'Overdue Evidence', value: es.overdue || 0 },
  );
  ctx.evidence = es;
}

async function gatherExecutiveMetrics(
  schema: string, tenantId: string,
  metrics: NarrativeMetric[], ctx: Record<string, unknown>
): Promise<void> {
  // Aggregate from all domains
  await Promise.all([
    gatherGovernanceMetrics(schema, tenantId, metrics, ctx),
    gatherRiskMetrics(schema, tenantId, metrics, ctx),
    gatherComplianceMetrics(schema, tenantId, metrics, ctx),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Executive and board attention items
  const [boardRes, execRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`
      SELECT COUNT(*)::int AS c FROM "${schema}".board_attention_items
      WHERE tenant_id = $1 AND status != 'closed'
    `, [tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(`
      SELECT COUNT(*)::int AS c FROM "${schema}".executive_attention_items
      WHERE tenant_id = $1 AND status != 'closed'
    `, [tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' }),
  ]);

  metrics.push(
    { label: 'Board Attention Items', value: boardRes.rows[0]?.c || 0 },
    { label: 'Executive Attention Items', value: execRes.rows[0]?.c || 0 },
  );
  ctx.board_items = boardRes.rows[0]?.c || 0;
  ctx.exec_items = execRes.rows[0]?.c || 0;
}

// ═══════════════════════════════════════════════════════════════
// AI Prompt Builders
// ═══════════════════════════════════════════════════════════════

function buildNarrativeSystemPrompt(context: NarrativeContext, tone: NarrativeTone): string {
  const toneGuide: Record<NarrativeTone, string> = {
    board: 'Write for board members and C-suite executives. Be concise, strategic, and formal.',
    executive: 'Write for senior leadership. Be professional, data-driven, and action-oriented.',
    technical: 'Write for GRC practitioners and risk managers. Include detailed metrics and technical analysis.',
    summary: 'Write a brief, high-level summary suitable for dashboards and quick reviews.',
  };

  const contextGuide: Record<NarrativeContext, string> = {
    governance: 'Focus on governance health: signals, action items, escalations, committee effectiveness, and AI recommendations.',
    risk: 'Focus on risk posture: risk scores, trends, control effectiveness, mitigation progress, and emerging threats.',
    compliance: 'Focus on compliance status: control testing, framework coverage, evidence collection, and regulatory alignment.',
    executive: 'Provide a holistic executive overview covering governance, risk, and compliance with board-level KPIs.',
  };

  return `You are an enterprise GRC narrative generator for an organization in Saudi Arabia.
Generate a professional ${context} narrative summary.

${toneGuide[tone]}
${contextGuide[context]}

Requirements:
- Use professional GRC language appropriate for the audience
- Include specific numbers and percentages from the provided metrics
- Highlight trends and areas requiring attention
- Bilingual output: English and Arabic (Modern Standard Arabic)
- Arabic should use professional regulatory/governance terminology
- Maximum 400 words per language
- Include 3-5 actionable recommendations

Respond with JSON: { "narrative_en": string, "narrative_ar": string, "recommendations": string[] }`;
}

// ═══════════════════════════════════════════════════════════════
// Fallback Builders (when AI is unavailable)
// ═══════════════════════════════════════════════════════════════

function buildFallbackNarrative(context: NarrativeContext, metrics: NarrativeMetric[], dataCtx: Record<string, unknown>): string {
  const parts: string[] = [];

  parts.push(`Governance ${context.charAt(0).toUpperCase() + context.slice(1)} Summary`);
  parts.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  parts.push('');

  if (dataCtx.signals) {
    const s = dataCtx.signals;

    parts.push(`Active Governance Signals: ${s.total || 0} total (${s.critical || 0} critical, ${s.high || 0} high).`);

    if (s.board_flagged > 0) parts.push(`${s.board_flagged} signals flagged for board attention.`);
  }

  if (dataCtx.risks) {
    const r = dataCtx.risks;

    parts.push(`Risk Portfolio: ${r.total || 0} active risks (${r.critical_risks || 0} critical/very high, ${r.high_risks || 0} high).`);

    if (r.avg_inherent) parts.push(`Average inherent score: ${r.avg_inherent}, residual: ${r.avg_residual}.`);
  }

  if (dataCtx.controls) {
    const c = dataCtx.controls;

    parts.push(`Control Effectiveness: ${c.effectiveness_rate || 0}% (${c.passed || 0}/${c.total || 0} passed, ${c.failed || 0} failed).`);
  }

  if (dataCtx.evidence) {
    const e = dataCtx.evidence;

    parts.push(`Evidence Collection: ${e.completed || 0}/${e.total_tasks || 0} tasks completed, ${e.overdue || 0} overdue.`);
  }

  if (dataCtx.board_items) parts.push(`Board attention items: ${dataCtx.board_items} open.`);
  if (dataCtx.exec_items) parts.push(`Executive attention items: ${dataCtx.exec_items} open.`);

  // Include individual metrics not covered by domain data
  for (const m of metrics) {
    if (!parts.some(p => p.includes(m.label))) {
      parts.push(`${m.label}: ${m.value}${m.context ? ` (${m.context})` : ''}`);
    }
  }

  return parts.join('\n');
}

function buildFallbackRecommendations(context: NarrativeContext, dataCtx: Record<string, unknown>): string[] {
  const recs: string[] = [];

  if (dataCtx.signals?.critical > 0) {

    recs.push(`Address ${dataCtx.signals.critical} critical governance signals as priority.`);
  }

  if (dataCtx.controls?.failed > 0) {

    recs.push(`Investigate and remediate ${dataCtx.controls.failed} failed controls.`);
  }

  if (dataCtx.evidence?.overdue > 0) {

    recs.push(`Follow up on ${dataCtx.evidence.overdue} overdue evidence tasks.`);
  }

  if (dataCtx.risks?.critical_risks > 0) {

    recs.push(`Review ${dataCtx.risks.critical_risks} critical/very high risks with risk owners.`);
  }
  if (recs.length === 0) {
    recs.push('Continue monitoring governance posture and maintain current control effectiveness.');
  }

  return recs;
}
