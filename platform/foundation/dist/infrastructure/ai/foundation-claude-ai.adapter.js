"use strict";
/**
 * Foundation — AI-Powered Intelligence Service
 *
 * Provides Claude-powered analysis, recommendations, and natural language
 * summaries for the Foundation module. All AI operations are auditable (Law 12),
 * have graceful fallbacks when AI is unavailable, and respect DAuth boundaries.
 *
 * @owner Foundation module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnalysis = generateAnalysis;
exports.classifyEntity = classifyEntity;
exports.generateExecutiveSummary = generateExecutiveSummary;
exports.detectGapsAndRecommend = detectGapsAndRecommend;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
const events_port_1 = require("../../ports/events.port");
const platform_port_1 = require("../../ports/platform.port");
const resilience_port_1 = require("../../ports/resilience.port");
// ── AI Client Access ───────────────────────────────────────────────
async function callAI(systemPrompt, userPrompt, tenantId) {
    try {
        const { createChatCompletion } = await import('../../ports/ai.port.js');
        const result = await createChatCompletion([{ role: 'user', content: userPrompt }], { system: systemPrompt, temperature: 0.3 });
        if (result?.content) {
            await (0, events_port_1.emitEvent)({
                event_type: 'foundation.ai.analysis_completed',
                tenantId, userId: platform_port_1.SYSTEM_JOB_ACTOR, module: 'foundation',
                event: 'foundation.ai.analysis_completed',
                entityType: 'ai_analysis', entityId: `ai-${Date.now()}`,
                data: { tokensUsed: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0) },
            }).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS));
            return result.content;
        }
        return null;
    }
    catch (err) {
        logger_port_1.logger.warn('[Foundation-AI] Claude unavailable, using fallback', {
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}
// ── Analysis Functions ─────────────────────────────────────────────
/**
 * Generate an AI-powered summary and analysis for the module's current state.
 */
async function generateAnalysis(tenantId, context) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const fallback = {
        summary: 'AI analysis unavailable. Review data manually.',
        insights: [],
        recommendations: [],
        confidence: 0,
        generatedAt: new Date().toISOString(),
    };
    // Gather context data from DB
    const { rows: stats } = await (0, database_port_1.safeQuery)(`SELECT
       COUNT(*)::int AS total_records,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS recent
     FROM "${schema}".audit_trail
     WHERE module = $1`, ['foundation']).catch(() => ({ rows: [{ total_records: 0, active: 0, recent: 0 }] }));
    const systemPrompt = `You are an enterprise GRC analyst specializing in Foundation management.
Analyze the provided data and return a JSON object with:
- summary: A 2-3 sentence executive summary
- insights: Array of 3-5 key findings
- recommendations: Array of 2-4 actionable recommendations
- confidence: Number 0-100 indicating analysis confidence
Return ONLY valid JSON, no markdown.`;
    const userPrompt = `Analyze the Foundation module status for this tenant:
${JSON.stringify({ stats: stats[0], context }, null, 2)}`;
    const aiResponse = await callAI(systemPrompt, userPrompt, tenantId);
    if (!aiResponse)
        return fallback;
    try {
        const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
            summary: parsed.summary || fallback.summary,
            insights: Array.isArray(parsed.insights) ? parsed.insights : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
            generatedAt: new Date().toISOString(),
        };
    }
    catch {
        return { ...fallback, summary: aiResponse.slice(0, 500) };
    }
}
/**
 * AI-powered classification for module entities.
 */
async function classifyEntity(tenantId, entityData) {
    const fallback = {
        category: 'unclassified',
        subcategory: null,
        confidence: 0,
        reasoning: 'AI classification unavailable',
    };
    const systemPrompt = `You are a GRC classification expert for Foundation.
Classify the entity and return JSON with: category, subcategory (or null), confidence (0-100), reasoning.
Return ONLY valid JSON.`;
    const aiResponse = await callAI(systemPrompt, JSON.stringify(entityData), tenantId);
    if (!aiResponse)
        return fallback;
    try {
        const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    }
    catch {
        return fallback;
    }
}
/**
 * Generate natural language executive summary for dashboards.
 */
async function generateExecutiveSummary(tenantId, dashboardData) {
    const systemPrompt = `You are an executive GRC advisor. Write a concise 3-4 sentence summary of the Foundation module status suitable for a board-level audience. Be specific with numbers. No jargon.`;
    const result = await callAI(systemPrompt, JSON.stringify(dashboardData), tenantId);
    return result || `Foundation module has ${Object.keys(dashboardData).length} tracked metrics. Manual review recommended.`;
}
/**
 * AI-powered gap detection and recommendation engine.
 */
async function detectGapsAndRecommend(tenantId, currentState, targetState) {
    const fallback = { gaps: [], recommendations: [], priority: 'medium' };
    const systemPrompt = `You are a GRC gap analysis expert for Foundation. Compare current state vs target state. Return JSON with: gaps (string[]), recommendations (string[]), priority (low/medium/high/critical). Return ONLY valid JSON.`;
    const result = await callAI(systemPrompt, JSON.stringify({ currentState, targetState }), tenantId);
    if (!result)
        return fallback;
    try {
        const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    }
    catch {
        return fallback;
    }
}
//# sourceMappingURL=foundation-claude-ai.adapter.js.map