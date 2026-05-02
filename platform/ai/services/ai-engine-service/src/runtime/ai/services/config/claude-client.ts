/**
 * Claude Client — Anthropic Claude API configuration and client factory.
 *
 * Provides model configuration and a singleton client instance for
 * all AI/LLM operations in the platform.
 */

import { logger } from '../../ports/logger.port';
import { safeQuery } from "@dos/db";
import { getOrCreateBreaker, CircuitBreakerOpenError } from '@dos/platform-core/resilience';

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);

let clientInstance: Record<string, unknown> | null = null;

// HB-3 — Anthropic API circuit breaker. Opens after 5 consecutive failures
// within recoveryTimeMs (60s). When OPEN, every Claude call is rejected
// instantly with CircuitBreakerOpenError, so a cascading outage cannot
// burn engine threads or rack up retries against an already-down upstream.
// HALF_OPEN admits one probe; if it succeeds the breaker closes.
const claudeBreaker = getOrCreateBreaker({
  name: 'anthropic-claude-api',
  failureThreshold: 5,
  recoveryTimeMs: 60_000,
  halfOpenMaxProbes: 1,
  onStateChange: (from, to, name) => {
    logger.warn(`[Claude breaker] state ${from} → ${to}`, { name });
  },
});

/**
 * Get or create the Anthropic Claude client singleton.
 * Returns null if the API key is not configured.
 */
export function getClaudeClient(): Record<string, unknown> | null {
  if (clientInstance) return clientInstance;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn('[Claude] ANTHROPIC_API_KEY not set — AI features disabled');
    return null;
  }

  try {
    // Dynamic import to avoid hard dependency on @anthropic-ai/sdk
    const Anthropic = require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk');
    clientInstance = new Anthropic({ apiKey });
    logger.info('[Claude] Client initialized', { model: CLAUDE_MODEL, maxTokens: CLAUDE_MAX_TOKENS });
    return clientInstance;
  } catch (err) {
    logger.warn('[Claude] Failed to initialize client — @anthropic-ai/sdk may not be installed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Create a chat completion with the Claude API.
 * Returns null if the client is unavailable.
 */
export async function createChatCompletion(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: {
    model?: string;
    maxTokens?: number;
    system?: string;
    temperature?: number;
  } = {},
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } } | null> {
  const client = getClaudeClient();
  if (!client) return null;

  try {
    // HB-3: every Claude call goes through the circuit breaker. When the
    // breaker is OPEN the inner closure never executes — we fail fast
    // and the caller (handler / agent runner) can downgrade gracefully.
    const response = await claudeBreaker.execute(async () =>

      client.messages.create({
        model: options.model || CLAUDE_MODEL,
        max_tokens: options.maxTokens || CLAUDE_MAX_TOKENS,
        system: options.system,
        temperature: options.temperature ?? 0.3,
        messages,
      })
    ) as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };

    return {
      content: response.content?.[0]?.text ?? '',
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof CircuitBreakerOpenError) {
      logger.warn('[Claude] breaker OPEN — rejecting call without hitting Anthropic', {
        breaker: 'anthropic-claude-api',
      });
      return null;
    }
    logger.error('[Claude] API call failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
