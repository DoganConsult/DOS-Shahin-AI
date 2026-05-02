/**
 * DORA AI Service — AI-powered regulatory analysis using Claude.
 *
 * MP-25 §8: Allowed AI participation:
 *   - Regulatory summary support
 *   - Gap narration
 *   - Evidence sufficiency hints
 *
 * MP-25 §8.2: Restricted AI behavior:
 *   - No autonomous protected approvals
 *   - No hidden regulatory posture overrides
 *
 * Uses the centralized Claude client from the AI module.
 * All AI operations are logged for audit trail (Law 12).
 *
 * @owner dora
 * @module dora
 */

import { logger } from '../ports/logger.port';
import { emitDoraEvent } from './dora-event.service';
import { safeQuery } from "@dos/db";

// ── AI Response Types ──────────────────────────────────────────────────
export interface RegulatoryAnalysisResult {
  summary: string;
  keyRequirements: string[];
  complianceImplications: string[];
  recommendedActions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface GapNarrationResult {
  narrative: string;
  prioritizedGaps: { gap: string; priority: 'critical' | 'high' | 'medium' | 'low'; reasoning: string }[];
  remediationSuggestions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface EvidenceSufficiencyResult {
  assessment: string;
  sufficiencyScore: number;
  missingEvidence: string[];
  suggestions: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

/**
 * Get the Claude client lazily to avoid circular imports.
 * Returns null if AI is not configured.
 */
async function getClaude(): Promise<{
  createChatCompletion: typeof import('../../../config/claude-client').createChatCompletion;
  CLAUDE_MODEL: string;
} | null> {
  try {
    const mod = await import('../../../config/claude-client.js');
    if (!mod.getClaudeClient()) return null;
    return { createChatCompletion: mod.createChatCompletion, CLAUDE_MODEL: mod.CLAUDE_MODEL };
  } catch {
    logger.warn('[dora-ai] Claude client not available');
    return null;
  }
}

/**
 * Generate a regulatory summary for a DORA article or obligation.
 * Provides plain-language explanation of regulatory requirements.
 *
 * MP-25 §8.1: Regulatory summary support.
 */
export async function generateRegulatorySummary(
  tenantId: string,
  context: {
    articleReference: string;
    title: string;
    description?: string;
    currentStatus?: string;
    relatedControls?: string[];
  },
): Promise<RegulatoryAnalysisResult | null> {
  const claude = await getClaude();
  if (!claude) {
    logger.info('[dora-ai] AI unavailable, skipping regulatory summary');
    return null;
  }

  const systemPrompt = `You are a DORA (Digital Operational Resilience Act) regulatory expert.
Provide concise, actionable regulatory analysis for financial entities subject to DORA.
Focus on practical compliance requirements and their implications.
Always structure your response as JSON with the following fields:
- summary: string (2-3 paragraph overview)
- keyRequirements: string[] (up to 5 key requirements)
- complianceImplications: string[] (up to 5 implications)
- recommendedActions: string[] (up to 5 recommended actions)`;

  const userMessage = `Analyze the following DORA regulatory context:

Article Reference: ${context.articleReference}
Title: ${context.title}
${context.description ? `Description: ${context.description}` : ''}
${context.currentStatus ? `Current Status: ${context.currentStatus}` : ''}
${context.relatedControls?.length ? `Related Controls: ${context.relatedControls.join(', ')}` : ''}

Provide a regulatory summary with key requirements, compliance implications, and recommended actions.
Respond in JSON format only.`;

  try {
    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userMessage }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 2048 },
    );

    if (!result) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // If JSON parse fails, return raw content as summary
      parsed = {
        summary: result.content,
        keyRequirements: [],
        complianceImplications: [],
        recommendedActions: [],
      };
    }

    const analysisResult: RegulatoryAnalysisResult = {

      summary: parsed.summary || result.content,

      keyRequirements: parsed.keyRequirements || [],

      complianceImplications: parsed.complianceImplications || [],

      recommendedActions: parsed.recommendedActions || [],
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };

    // Audit log AI usage (Law 12)
    await emitDoraEvent(tenantId, 'dora.ai_analysis_completed', 'regulatory_summary', context.articleReference, {
      analysisType: 'regulatory_summary',
      tokensUsed: result.usage,
      modelUsed: claude.CLAUDE_MODEL,
    });

    logger.info('[dora-ai] Regulatory summary generated', {
      tenantId,
      article: context.articleReference,
      tokensUsed: result.usage,
    });

    return analysisResult;
  } catch (err) {
    logger.error('[dora-ai] Regulatory summary failed', {
      tenantId,
      article: context.articleReference,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Generate a gap narration for uncovered DORA articles.
 * Provides prioritized analysis of compliance gaps with remediation suggestions.
 *
 * MP-25 §8.1: Gap narration.
 */
export async function generateGapNarration(
  tenantId: string,
  context: {
    uncoveredArticles: string[];
    lowCoveragePillars: { pillar: string; coveragePercent: number }[];
    currentReadinessScore: number;
    obligationStats: { total: number; active: number; overdue: number };
  },
): Promise<GapNarrationResult | null> {
  const claude = await getClaude();
  if (!claude) {
    logger.info('[dora-ai] AI unavailable, skipping gap narration');
    return null;
  }

  const systemPrompt = `You are a DORA compliance gap analyst.
Analyze the provided compliance gaps and produce a prioritized narrative.
Focus on business impact and practical remediation steps.
Respond in JSON with:
- narrative: string (executive-level gap analysis narrative)
- prioritizedGaps: array of {gap: string, priority: "critical"|"high"|"medium"|"low", reasoning: string}
- remediationSuggestions: string[] (actionable steps)`;

  const userMessage = `Analyze the following DORA compliance gaps:

Uncovered Articles: ${context.uncoveredArticles.join(', ')}
Low Coverage Pillars: ${context.lowCoveragePillars.map(p => `${p.pillar}: ${p.coveragePercent}%`).join(', ')}
Current Readiness Score: ${context.currentReadinessScore}/100
Obligations: ${context.obligationStats.total} total, ${context.obligationStats.active} active, ${context.obligationStats.overdue} overdue

Provide a prioritized gap analysis with remediation suggestions.
Respond in JSON format only.`;

  try {
    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userMessage }],
      { system: systemPrompt, temperature: 0.3, maxTokens: 3072 },
    );

    if (!result) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      parsed = {
        narrative: result.content,
        prioritizedGaps: [],
        remediationSuggestions: [],
      };
    }

    const narrationResult: GapNarrationResult = {

      narrative: parsed.narrative || result.content,

      prioritizedGaps: parsed.prioritizedGaps || [],

      remediationSuggestions: parsed.remediationSuggestions || [],
      confidence: 0.75,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };

    await emitDoraEvent(tenantId, 'dora.ai_analysis_completed', 'gap_narration', 'gap_analysis', {
      analysisType: 'gap_narration',
      gapCount: context.uncoveredArticles.length,
      tokensUsed: result.usage,
      modelUsed: claude.CLAUDE_MODEL,
    });

    logger.info('[dora-ai] Gap narration generated', {
      tenantId,
      gapCount: context.uncoveredArticles.length,
      tokensUsed: result.usage,
    });

    return narrationResult;
  } catch (err) {
    logger.error('[dora-ai] Gap narration failed', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Assess evidence sufficiency for a DORA obligation or control.
 * Provides hints about missing evidence and suggestions for improvement.
 *
 * MP-25 §8.1: Evidence sufficiency hints.
 */
export async function assessEvidenceSufficiency(
  tenantId: string,
  context: {
    obligationTitle: string;
    articleReference: string;
    pillar: string;
    currentEvidence: { title: string; type: string; lastUpdated?: string }[];
    controlDescription?: string;
  },
): Promise<EvidenceSufficiencyResult | null> {
  const claude = await getClaude();
  if (!claude) {
    logger.info('[dora-ai] AI unavailable, skipping evidence assessment');
    return null;
  }

  const systemPrompt = `You are a DORA evidence sufficiency assessor.
Evaluate whether the provided evidence is sufficient for DORA compliance.
Consider completeness, recency, and relevance of evidence artifacts.
Respond in JSON with:
- assessment: string (overall assessment paragraph)
- sufficiencyScore: number (0-100)
- missingEvidence: string[] (evidence types that should be added)
- suggestions: string[] (improvement suggestions)`;

  const userMessage = `Assess evidence sufficiency for this DORA obligation:

Obligation: ${context.obligationTitle}
Article: ${context.articleReference}
Pillar: ${context.pillar}
${context.controlDescription ? `Control: ${context.controlDescription}` : ''}

Current Evidence (${context.currentEvidence.length} items):
${context.currentEvidence.map(e => `- ${e.title} (Type: ${e.type}${e.lastUpdated ? `, Updated: ${e.lastUpdated}` : ''})`).join('\n')}

Assess whether this evidence is sufficient for DORA compliance.
Respond in JSON format only.`;

  try {
    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userMessage }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 2048 },
    );

    if (!result) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      parsed = {
        assessment: result.content,
        sufficiencyScore: 0,
        missingEvidence: [],
        suggestions: [],
      };
    }

    const sufficiencyResult: EvidenceSufficiencyResult = {

      assessment: parsed.assessment || result.content,

      sufficiencyScore: parsed.sufficiencyScore ?? 0,

      missingEvidence: parsed.missingEvidence || [],

      suggestions: parsed.suggestions || [],
      confidence: 0.7,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };

    await emitDoraEvent(tenantId, 'dora.ai_analysis_completed', 'evidence_assessment', context.articleReference, {
      analysisType: 'evidence_sufficiency',
      obligationTitle: context.obligationTitle,
      evidenceCount: context.currentEvidence.length,
      sufficiencyScore: sufficiencyResult.sufficiencyScore,
      tokensUsed: result.usage,
      modelUsed: claude.CLAUDE_MODEL,
    });

    logger.info('[dora-ai] Evidence sufficiency assessed', {
      tenantId,
      article: context.articleReference,
      sufficiencyScore: sufficiencyResult.sufficiencyScore,
      tokensUsed: result.usage,
    });

    return sufficiencyResult;
  } catch (err) {
    logger.error('[dora-ai] Evidence sufficiency assessment failed', {
      tenantId,
      article: context.articleReference,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
