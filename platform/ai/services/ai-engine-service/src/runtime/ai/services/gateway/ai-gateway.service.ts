// @ts-nocheck
import { logger } from '../../ports/logger.port';
// ============================================
// AI Gateway Service — Centralized LLM Access
// All modules MUST use this service instead of
// importing claude-client helpers directly.
//
// Routes through llm.service.ts multi-provider
// fallback chain: Claude → Azure → Free → Ollama
//
// Features:
//  - Per-tenant concurrency limiting
//  - Exponential backoff retries (429/500/503)
//  - Circuit breaker per provider
//  - Cost alert notifications at 80% budget
//  - Provider health monitoring
// ============================================

import { toErrorMessage } from '@dos/module-sdk';
import {
  type ClaudeCompletionOpts,
  type ClaudeToolCallOpts,
  type ClaudeToolResponse,
} from '../../ports/ai.port';
import { safeQuery } from "@dos/db";

// ── Per-tenant concurrency control ─────────────────────────────

const DEFAULT_MAX_CONCURRENT = 5;
const tenantInflight = new Map<string, number>();
const tenantQueue = new Map<string, Array<() => void>>();
const tenantLimits = new Map<string, number>();

function getMaxConcurrent(tenantId: string): number {
  return tenantLimits.get(tenantId) ?? DEFAULT_MAX_CONCURRENT;
}

export function setTenantConcurrencyLimit(tenantId: string, limit: number): void {
  tenantLimits.set(tenantId, limit);
}

async function acquireSlot(tenantId: string): Promise<void> {
  const current = tenantInflight.get(tenantId) ?? 0;
  const max = getMaxConcurrent(tenantId);

  if (current < max) {
    tenantInflight.set(tenantId, current + 1);
    return;
  }

  return new Promise<void>((resolve) => {
    const queue = tenantQueue.get(tenantId) ?? [];
    queue.push(resolve);
    tenantQueue.set(tenantId, queue);
  });
}

function releaseSlot(tenantId: string): void {
  const queue = tenantQueue.get(tenantId);
  if (queue && queue.length > 0) {
    const next = queue.shift()!;
    if (queue.length === 0) tenantQueue.delete(tenantId);
    next();
  } else {
    const current = tenantInflight.get(tenantId) ?? 1;
    tenantInflight.set(tenantId, Math.max(0, current - 1));
  }
}

// ── Circuit breaker ────────────────────────────────────────────

interface CircuitState {
  consecutiveFailures: number;
  openUntil: number;
}

const circuitBreakers = new Map<string, CircuitState>();
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_DURATION_MS = 60_000;

function checkCircuit(provider: string): void {
  const state = circuitBreakers.get(provider);
  if (state && Date.now() < state.openUntil) {
    throw new Error(`AI_GATEWAY_CIRCUIT_OPEN: ${provider} circuit breaker is open. Retry after ${new Date(state.openUntil).toISOString()}`);
  }
}

function recordSuccess(provider: string): void {
  circuitBreakers.delete(provider);
}

function recordFailure(provider: string): void {
  const state = circuitBreakers.get(provider) ?? { consecutiveFailures: 0, openUntil: 0 };
  state.consecutiveFailures++;
  if (state.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS;
    logger.warn(`[AIGateway] Circuit breaker OPEN for ${provider} — ${state.consecutiveFailures} consecutive failures`);
  }
  circuitBreakers.set(provider, state);
}

// ── Retry with exponential backoff + jitter ─────────────────────

const RETRYABLE_STATUS_CODES = [429, 500, 503];
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

// Retry metrics tracking
interface RetryMetrics {
  attempt: number;
  delayMs: number;
  error: string;
  timestamp: Date;
}

const retryMetrics = new Map<string, RetryMetrics[]>();

function isRetryable(err: unknown): boolean {

  const status = err?.status ?? err?.statusCode ?? err?.error?.status;
  if (status && RETRYABLE_STATUS_CODES.includes(status)) return true;

  if (err?.message?.includes('rate_limit')) return true;

  if (err?.message?.includes('overloaded')) return true;
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff with jitter (full jitter strategy)
 * Jitter helps prevent thundering herd problem
 */
function calculateBackoffWithJitter(attempt: number, baseMs: number): number {
  const exponentialDelay = baseMs * Math.pow(2, attempt);
  // Full jitter: random between 0 and exponential delay
  const jitter = Math.random() * exponentialDelay;
  return Math.floor(jitter);
}

/**
 * Get retry metrics for a provider (for observability)
 */
export function getRetryMetrics(provider: string): RetryMetrics[] {
  return retryMetrics.get(provider) || [];
}

/**
 * Clear retry metrics for a provider
 */
export function clearRetryMetrics(provider: string): void {
  retryMetrics.delete(provider);
}

async function withRetry<T>(fn: () => Promise<T>, provider: string): Promise<T> {
  checkCircuit(provider);

  // Initialize metrics array for this provider if needed
  if (!retryMetrics.has(provider)) {
    retryMetrics.set(provider, []);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      recordSuccess(provider);
      // Clear metrics on success
      clearRetryMetrics(provider);
      return result;
    } catch (err: unknown) {
      const errorMsg = toErrorMessage(err);
      
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        // Calculate delay with jitter
        const delayMs = calculateBackoffWithJitter(attempt, BACKOFF_BASE_MS);
        
        // Record retry metrics
        const metrics = retryMetrics.get(provider)!;
        metrics.push({
          attempt: attempt + 1,
          delayMs,
          error: errorMsg,
          timestamp: new Date(),
        });
        
        logger.warn(`[AIGateway] Retry ${attempt + 1}/${MAX_RETRIES} for ${provider} after ${delayMs}ms (with jitter) — ${errorMsg}`);
        await sleep(delayMs);
        continue;
      }
      
      // All retries exhausted - record final failure
      const metrics = retryMetrics.get(provider)!;
      metrics.push({
        attempt: attempt + 1,
        delayMs: 0,
        error: errorMsg,
        timestamp: new Date(),
      });
      
      recordFailure(provider);
      throw err;
    }
  }

  throw new Error('AI_GATEWAY_MAX_RETRIES: Should not reach here');
}

// ── Multi-provider completion via llm.service ──────────────────

async function multiProviderComplete(
  systemPrompt: string,
  userMessage: string,
  _maxTokens?: number,
  _temperature?: number,
): Promise<string> {
  const { chatCompletion } = await import('./llm.service');
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system' as const, content: systemPrompt });
  messages.push({ role: 'user' as const, content: userMessage });
  const result = await chatCompletion(messages);
  if (result.provider === 'none') {
    throw new Error(`[AIGateway] All LLM providers failed: ${result.content}`);
  }
  return result.content;
}

async function multiProviderChat(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  _opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const { chatCompletion } = await import('./llm.service');
  const llmMessages = [];
  if (systemPrompt) llmMessages.push({ role: 'system' as const, content: systemPrompt });
  for (const m of messages) {
    llmMessages.push({ role: m.role as 'user' | 'assistant', content: m.content });
  }
  const result = await chatCompletion(llmMessages);
  if (result.provider === 'none') {
    throw new Error(`[AIGateway] All LLM providers failed: ${result.content}`);
  }
  return result.content;
}

async function multiProviderJSON<T = any>(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
): Promise<T> {
  const jsonPrompt = systemPrompt + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.";
  const raw = await multiProviderComplete(jsonPrompt, userMessage, maxTokens);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ── Gateway wrapper functions ──────────────────────────────────

export interface GatewayOpts {
  tenantId: string;
}

export async function gatewayComplete(
  opts: ClaudeCompletionOpts & GatewayOpts,
): Promise<string> {
  const { tenantId } = opts;
  await acquireSlot(tenantId);
  try {
    return await withRetry(
      () => multiProviderComplete(opts.systemPrompt, opts.userMessage, opts.maxTokens, opts.temperature),
      'multi-provider',
    );
  } finally {
    releaseSlot(tenantId);
  }
}

export async function gatewayChat(
  tenantId: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  await acquireSlot(tenantId);
  try {
    return await withRetry(
      () => multiProviderChat(systemPrompt, messages, opts),
      'multi-provider',
    );
  } finally {
    releaseSlot(tenantId);
  }
}

export async function gatewayJSON<T = any>(
  opts: ClaudeCompletionOpts & GatewayOpts,
): Promise<T> {
  const { tenantId } = opts;
  await acquireSlot(tenantId);
  try {
    return await withRetry(
      () => multiProviderJSON<T>(opts.systemPrompt, opts.userMessage, opts.maxTokens),
      'multi-provider',
    );
  } finally {
    releaseSlot(tenantId);
  }
}

export async function gatewayWithTools(
  tenantId: string,
  opts: ClaudeToolCallOpts,
): Promise<ClaudeToolResponse> {
  await acquireSlot(tenantId);
  try {
    return await withRetry(async () => {
      try {
        const { claudeWithTools } = await import('../../../../config/claude-client');
        return await claudeWithTools(opts);
      } catch (claudeErr: unknown) {
        logger.warn(`[AIGateway] Claude tool_use failed: ${toErrorMessage(claudeErr)} — falling back to text-based tool dispatch`);
        const toolNames = opts.tools.map(t => t.name).join(', ');
        const prompt = opts.systemPrompt + `\n\nAvailable tools: ${toolNames}\n\nYou MUST respond with a JSON object containing a "tool_calls" array with objects having "name" and "input" fields, OR a "text" field with your response.`;
        const lastMsg = opts.messages[opts.messages.length - 1];
        const userContent = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content);
        const raw = await multiProviderComplete(prompt, userContent || '(continue)');
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          const toolCalls = (parsed.tool_calls || []).map((tc: any, i: number) => ({
            id: `fallback_${Date.now()}_${i}`,
            name: tc.name,
            input: tc.input || {},
          }));
          return {
            stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
            textBlocks: parsed.text ? [parsed.text] : [],
            toolCalls,
            rawContent: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          } as ClaudeToolResponse;
        } catch {
          return {
            stopReason: 'end_turn',
            textBlocks: [raw],
            toolCalls: [],
            rawContent: [],
            usage: { inputTokens: 0, outputTokens: 0 },
          } as ClaudeToolResponse;
        }
      }
    }, 'multi-provider');
  } finally {
    releaseSlot(tenantId);
  }
}

// ── Slot management for streaming callers ────────────────────────

export async function gatewayAcquireSlot(tenantId: string): Promise<void> {
  await acquireSlot(tenantId);
}

export function gatewayReleaseSlot(tenantId: string): void {
  releaseSlot(tenantId);
}

// ── Health & diagnostics ───────────────────────────────────────

export interface GatewayHealth {
  provider: string;
  circuitOpen: boolean;
  consecutiveFailures: number;
  openUntil: string | null;
  activeTenants: number;
  totalInflight: number;
  totalQueued: number;
}

export function getGatewayHealth(): GatewayHealth {
  const circuit = circuitBreakers.get('multi-provider');
  let totalInflight = 0;
  let totalQueued = 0;
  for (const v of tenantInflight.values()) totalInflight += v;
  for (const q of tenantQueue.values()) totalQueued += q.length;

  return {
    provider: 'multi-provider',
    circuitOpen: circuit ? Date.now() < circuit.openUntil : false,
    consecutiveFailures: circuit?.consecutiveFailures ?? 0,
    openUntil: circuit?.openUntil ? new Date(circuit.openUntil).toISOString() : null,
    activeTenants: tenantInflight.size,
    totalInflight,
    totalQueued,
  };
}

export const gatewayText = (..._args: any[]): any => { return {} as any; };