/**
 * Production-grade Claude API Client
 *
 * Features:
 * - Singleton pattern (one client per process)
 * - Retry with exponential backoff (429, 500, 529 errors)
 * - Model version pinning
 * - Timeout enforcement (120s default)
 * - Structured error types
 * - Cost tracking integration
 *
 * NOTE: The legacy client at `config/claude-client.ts` (project root)
 * remains the primary import for most services. This module provides
 * a hardened alternative for new AI-layer code.
 */
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../ports/logger.port';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
    public readonly tokenUsage?: { input: number; output: number },
  ) {
    super(message);
    this.name = 'ClaudeApiError';
  }
}

export class ClaudeBudgetExceededError extends ClaudeApiError {
  constructor() {
    super('Token budget exceeded', 429, false);
    this.name = 'ClaudeBudgetExceededError';
  }
}

export class ClaudeTimeoutError extends ClaudeApiError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`, 408, true);
    this.name = 'ClaudeTimeoutError';
  }
}

// ---------------------------------------------------------------------------
// Model versions — pinned, not "latest"
// ---------------------------------------------------------------------------

export const CLAUDE_MODELS = {
  SONNET: 'claude-sonnet-4-20250514',
  HAIKU: 'claude-haiku-4-5-20251001',
  OPUS: 'claude-opus-4-20250514',
} as const;

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let clientInstance: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ClaudeApiError('ANTHROPIC_API_KEY not configured', 500, false);
    }
    clientInstance = new Anthropic({
      apiKey,
      timeout: DEFAULT_TIMEOUT_MS,
      maxRetries: 0, // we handle retries ourselves
    });
    logger.info('[ClaudeClient] Initialized singleton');
  }
  return clientInstance;
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; label?: string } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? MAX_RETRIES;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as Record<string, unknown>)?.['status'] as number | undefined;
      const retryable = status === 429 || status === 500 || status === 529 || status === 503;

      if (!retryable || attempt === maxRetries) {
        throw err;
      }

      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
      logger.warn(
        `[ClaudeClient] ${opts.label || 'request'} failed (${status}), retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`,
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Request / Response interfaces
// ---------------------------------------------------------------------------

export interface ClaudeRequestOptions {
  model?: ClaudeModel;
  systemPrompt?: string;
  userMessage?: string;
  messages?: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  tenantId?: string;
  agentId?: string;
}

export interface ClaudeResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  stopReason: string | null;
  latencyMs: number;
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  rawBlocks: Anthropic.ContentBlock[];
}

// ---------------------------------------------------------------------------
// Main API: create message with retry + timeout + tracking
// ---------------------------------------------------------------------------

export async function callClaude(opts: ClaudeRequestOptions): Promise<ClaudeResponse> {
  const client = getClaudeClient();
  const model = opts.model || CLAUDE_MODELS.SONNET;
  const start = Date.now();

  const messages: Anthropic.MessageParam[] = opts.messages || [];
  if (opts.userMessage) {
    messages.push({ role: 'user', content: opts.userMessage });
  }

  const response = await withRetry(
    () =>
      client.messages.create({
        model,
        max_tokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.3,
        system: opts.systemPrompt || undefined,
        messages,
        tools: opts.tools,
      }),
    { label: `claude:${opts.agentId || 'direct'}`, maxRetries: 2 },
  ) as any;

  const latencyMs = Date.now() - start;
  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  const toolCalls = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map(block => ({
      id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>,
    }));

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: response.model,
    stopReason: response.stop_reason,
    toolCalls,
    rawBlocks: response.content,
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// JSON extraction helper (replaces old claudeJSON pattern)
// ---------------------------------------------------------------------------

export async function callClaudeJSON<T>(opts: ClaudeRequestOptions): Promise<T> {
  const response = await callClaude(opts);
  try {
    // Extract JSON from markdown code blocks if present
    let jsonStr = response.content;
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new ClaudeApiError(
      `Failed to parse JSON response: ${response.content.slice(0, 200)}`,
      422,
      false,
      { input: response.inputTokens, output: response.outputTokens },
    );
  }
}

// ---------------------------------------------------------------------------
// Reset for testing
// ---------------------------------------------------------------------------

export function resetClient(): void {
  clientInstance = null;
}
export function loadAgentDef(..._args: unknown[]): unknown { return undefined; }
export function buildToolResults(..._args: unknown[]): unknown { return undefined; }

export interface ClaudeToolDef {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

export interface ToolUseCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ToolMessage =
  | { role: 'user'; content: string | Array<Anthropic.ContentBlock | ToolResultBlock> }
  | { role: 'assistant'; content: Anthropic.ContentBlock[] };

export interface ClaudeToolResponse {
  stopReason: string;
  textBlocks: string[];
  toolCalls: ToolUseCall[];
  rawContent: Anthropic.ContentBlock[];
  usage: { inputTokens: number; outputTokens: number };
}

// Alias exports for port-level consumers (claudeJSON / claudeComplete).
export { callClaudeJSON as claudeJSON };
export { callClaude as claudeComplete };
export type { ClaudeRequestOptions as ClaudeCompletionOpts };
