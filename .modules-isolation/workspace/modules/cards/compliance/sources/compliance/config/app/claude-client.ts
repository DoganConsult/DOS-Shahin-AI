/**
 * Claude Client Bridge for the Onboarding Module.
 *
 * Re-exports from the ai-engine-service's Claude client.
 * The onboarding AI service imports from this path — this bridge
 * ensures the module can access Claude without a hard dependency
 * on the ai-engine-service internal structure.
 *
 * If the Anthropic SDK is not installed or ANTHROPIC_API_KEY is not set,
 * getClaudeClient() returns null and the AI service falls back to rule-based logic.
 */

import { logger } from '@dos/platform-core/observability';

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);

let _client: any = null;
let _initialized = false;

/**
 * Get or create the singleton Anthropic client.
 * Returns null if the SDK is not available or the API key is not set.
 */
export function getClaudeClient(): any {
  if (_initialized) return _client;
  _initialized = true;

  if (!process.env.ANTHROPIC_API_KEY && !process.env.AZURE_OPENAI_API_KEY) {
    logger.debug('[claude-client] No API key configured — AI features will use rule-based fallback');
    return null;
  }

  try {
    // Dynamic require to avoid hard dependency
    const Anthropic = require('@anthropic-ai/sdk').default;
    _client = new Anthropic();
    logger.info('[claude-client] Anthropic client initialized for onboarding module');
    return _client;
  } catch {
    logger.debug('[claude-client] @anthropic-ai/sdk not installed — AI features disabled');
    return null;
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface CompletionResult {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Create a chat completion using the Claude API.
 * Returns null if the client is unavailable.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<CompletionResult | null> {
  const client = getClaudeClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: options.model || CLAUDE_MODEL,
      max_tokens: options.maxTokens || CLAUDE_MAX_TOKENS,
      temperature: options.temperature ?? 0.3,
      system: options.system || 'You are a GRC expert assistant. Respond with valid JSON only.',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    return {
      content: text,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    logger.error('[claude-client] Chat completion failed', {
      error: err instanceof Error ? err.message : String(err),
      model: options.model || CLAUDE_MODEL,
    });
    return null;
  }
}
