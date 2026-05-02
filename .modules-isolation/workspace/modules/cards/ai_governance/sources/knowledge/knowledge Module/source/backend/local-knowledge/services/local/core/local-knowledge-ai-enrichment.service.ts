// ============================================
// Shahin-Ai — Local Knowledge AI Enrichment Service
// R3.3B Phase C: AI-assisted enrichment (secondary to deterministic truth)
// ============================================

import { enhancedChatCompletion } from '../../../../ai/services/gateway/llm.service.js';
import { logger } from '../../../ports/logger.port.js';
import { safeQuery } from "@dos/db";

export interface AIEnrichmentResult {
  summary?: string;
  tags?: string[];
  entities?: Array<{ type: string; value: string; confidence?: number }>;
  topics?: string[];
  clauses?: Array<{ text: string; type: string }>;
  lessonDraft?: string;
  confidence?: number;
  modelUsed?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enriches document content with AI (secondary, clearly marked)
 * This is NOT used for compliance truth - only for enrichment, summarization, classification
 */
export async function enrichDocument(
  tenantId: string,
  content: Buffer | string,
  deterministicData: any,
): Promise<AIEnrichmentResult> {
  const text = typeof content === 'string' ? content : content.toString('utf-8');
  const textPreview = text.substring(0, 10000); // limit for AI calls (increased from 5000)

  try {
    // Build enrichment prompt based on document type
    const documentType = deterministicData.documentType || 'document';
    const systemPrompt = `You are a document enrichment assistant for a GRC (Governance, Risk, Compliance) platform. 
Your task is to analyze document content and extract:
1. A concise summary (2-3 sentences)
2. Relevant tags (5-10 keywords)
3. Key entities (organizations, people, dates, regulations)
4. Main topics/themes
5. If applicable, draft a brief lesson or insight

IMPORTANT: This enrichment is secondary to deterministic metadata. Mark all AI-generated content clearly.
Return your analysis as JSON with fields: summary, tags (array), entities (array of {type, value, confidence}), topics (array).`;

    const userPrompt = `Analyze this ${documentType} document:

Title: ${deterministicData.title || 'Untitled'}
Category: ${deterministicData.category || 'N/A'}
Status: ${deterministicData.status || 'N/A'}

Content preview:
${textPreview}

Provide enrichment in JSON format.`;

    // Call LLM service
    const llmResult = await enhancedChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        tenantId,
        agentId: 'local-knowledge-enricher',
      }
    );

    // Parse LLM response (expecting JSON)
    let parsedEnrichment: any = {};
    try {
      // Try to extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = llmResult.content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       llmResult.content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsedEnrichment = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback: try to parse entire response as JSON
        parsedEnrichment = JSON.parse(llmResult.content);
      }
    } catch (parseErr) {
      // If JSON parsing fails, extract summary from text response
      logger.warn('[LocalKnowledgeAIEnrichment] Failed to parse LLM response as JSON', {
        tenantId,
        error: (parseErr as Error).message,
        responsePreview: llmResult.content.substring(0, 200),
      });
      parsedEnrichment = {
        summary: llmResult.content.substring(0, 500),
        tags: generatePlaceholderTags(deterministicData),
      };
    }

    // Build enrichment result
    const enrichment: AIEnrichmentResult = {
      summary: parsedEnrichment.summary || generatePlaceholderSummary(deterministicData),
      tags: parsedEnrichment.tags || generatePlaceholderTags(deterministicData),
      entities: parsedEnrichment.entities || [],
      topics: parsedEnrichment.topics || [],
      clauses: parsedEnrichment.clauses || [],
      lessonDraft: parsedEnrichment.lessonDraft || parsedEnrichment.lesson,
      confidence: 0.7, // Lower confidence for AI-generated content
      modelUsed: llmResult.model || llmResult.provider || 'any',
      metadata: {
        enrichmentMethod: 'ai_assisted',
        markedAsSecondary: true,
        deterministicDataUsed: true,
        provider: llmResult.provider,
        latencyMs: llmResult.latencyMs,
        tokensUsed: llmResult.tokensUsed,
      },
    };

    logger.info('[LocalKnowledgeAIEnrichment] Enrichment completed', {
      tenantId,
      hasSummary: !!enrichment.summary,
      tagCount: enrichment.tags?.length || 0,
      entityCount: enrichment.entities?.length || 0,
      model: enrichment.modelUsed,
      provider: llmResult.provider,
    });

    return enrichment;
  } catch (err) {
    logger.warn('[LocalKnowledgeAIEnrichment] Enrichment failed', {
      tenantId,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    // Return minimal enrichment on failure - never fail the ingestion
    return {
      summary: generatePlaceholderSummary(deterministicData),
      tags: generatePlaceholderTags(deterministicData),
      confidence: 0.0,
      modelUsed: 'none',
      metadata: { enrichmentFailed: true, error: (err as Error).message },
    };
  }
}

function generatePlaceholderSummary(data: unknown): string {

  if (data.documentType === 'policy') {

    return `Policy document: ${data.title || 'Untitled'}. ${data.category ? `Category: ${data.category}.` : ''} ${data.status ? `Status: ${data.status}.` : ''}`;
  }

  if (data.documentType === 'committee_minutes') {

    return `Committee minutes: ${data.committeeName || 'Unknown committee'}. ${data.meetingDate ? `Meeting date: ${data.meetingDate}.` : ''} ${data.decisions?.length ? `${data.decisions.length} decisions recorded.` : ''}`;
  }

  if (data.documentType === 'audit_report') {

    return `Audit report: ${data.reportTitle || 'Untitled'}. ${data.findings?.length ? `${data.findings.length} findings.` : ''} ${data.severity ? `Severity: ${data.severity}.` : ''}`;
  }
  return 'Document content extracted and available for review.';
}

function generatePlaceholderTags(data: unknown): string[] {
  const tags: string[] = [];

  if (data.documentType) tags.push(data.documentType);

  if (data.category) tags.push(data.category);

  if (data.status) tags.push(data.status);

  if (data.severity) tags.push(data.severity);
  return tags;
}
