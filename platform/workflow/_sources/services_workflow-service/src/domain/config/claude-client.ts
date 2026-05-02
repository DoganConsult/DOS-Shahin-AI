/**
 * workflow-service / config / claude-client
 *
 * Thin Claude (Anthropic) client used by Temporal audit/analysis
 * activities. Delegates to the official `@anthropic-ai/sdk` with a
 * singleton pattern + JSON extraction helper. Fails loud in production
 * when `ANTHROPIC_API_KEY` is absent — no silent noop.
 */
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@dos/platform-core/observability';

export const CLAUDE_MODEL: string = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS: number = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);

export class ClaudeClientError extends Error {
  override readonly name = 'ClaudeClientError';
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
  }
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeClientError(
      'ANTHROPIC_API_KEY not configured — Claude client cannot be created',
    );
  }
  _client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 0 });
  return _client;
}

export interface ClaudeCallOptions {
  systemPrompt?: string;
  userMessage?: string;
  messages?: Anthropic.MessageParam[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const client = getClient();
  const messages: Anthropic.MessageParam[] = opts.messages ? [...opts.messages] : [];
  if (opts.userMessage) messages.push({ role: 'user', content: opts.userMessage });
  const response = await client.messages.create({
    model: opts.model ?? CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? CLAUDE_MAX_TOKENS,
    temperature: opts.temperature ?? 0.3,
    system: opts.systemPrompt,
    messages,
  });
  const textBlock = (response.content as Anthropic.ContentBlock[]).find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  return textBlock?.text ?? '';
}

/**
 * Parse Claude's text response as JSON, stripping markdown code fences
 * when present. Throws `ClaudeClientError` when the response is not
 * well-formed JSON — callers handle fallback at their own layer.
 */
export async function claudeJSON<T = unknown>(opts: ClaudeCallOptions): Promise<T> {
  const raw = await callClaude(opts);
  let jsonStr = raw.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    logger.warn('[ClaudeClient] JSON parse failed', {
      preview: jsonStr.slice(0, 200),
      error: (err as { message?: string })?.message,
    });
    throw new ClaudeClientError('Claude response was not valid JSON', err);
  }
}
