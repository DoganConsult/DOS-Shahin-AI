import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — AI Narrative Generation
// Uses the AI gateway to produce bilingual
// narrative content for submission sections
// ============================================

import { getAiPort } from "../../ports/ai.port";
import { toErrorMessage } from "@dos/module-sdk";
import { safeQuery } from "@dos/db";

/**
 * Generate AI narrative for a section using the AI gateway.
 * Replaces {placeholder} tokens in the prompt template with context values,
 * then calls the LLM to produce bilingual (EN/AR) content.
 */
export async function generateAINarrative(
  tenantId: string,
  promptTemplate: string,
  context: Record<string, unknown>
): Promise<{ contentEn: string; contentAr: string }> {
  // Replace placeholders in prompt template
  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }

  try {
    const result = await getAiPort().gatewayJSON<{
      contentEn: string;
      contentAr: string;
    }>({
      systemPrompt: `You are a GRC expert specializing in regulatory submissions for KSA organizations.
Generate professional, accurate, and compliant narrative content for regulatory submissions.
Always provide bilingual content (English and Arabic).
Be factual, avoid speculation, and focus on compliance achievements and risk management.`,
      userMessage: prompt,
      temperature: 0.4,
      maxTokens: 2000,
      tenantId,
    });

    return {
      contentEn: result.contentEn || "",
      contentAr: result.contentAr || "",
    };
  } catch (err) {
    logger.error(`[RegulatorySubmission] AI generation failed:`, toErrorMessage(err));
    // Step-8 placeholder removal: do NOT fabricate narrative content on
    // failure. Propagate a typed error so the submission orchestrator
    // can flag the section as "AI unavailable" rather than insert fake
    // bilingual placeholder text into a regulator-bound document.
    throw Object.assign(new Error('AI narrative generation failed'), {
      statusCode: 502,
      code: 'AI_NARRATIVE_FAILED',
      cause: toErrorMessage(err),
    });
  }
}
