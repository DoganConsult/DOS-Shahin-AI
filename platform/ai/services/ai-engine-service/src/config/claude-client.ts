// @ts-nocheck
/**
 * Claude AI client configuration — delegates to the production client.
 *
 * IMPORTANT: This file exists as the legacy import path. Many routes and services
 * import from here (../../../../config/claude-client). All real implementations
 * live in runtime/ai/config/claude-client.ts which reads ANTHROPIC_API_KEY.
 *
 * This file re-exports from the production client to avoid null/stub failures.
 */

import {
  getClaudeClient as _getClaudeClient,
  callClaude as _callClaude,
  callClaudeJSON as _callClaudeJSON,
  CLAUDE_MODELS,
  resetClient,
  type ClaudeRequestOptions,
  type ClaudeResponse,
  type ClaudeToolDef,
  type ToolUseCall,
  type ToolResultBlock,
  type ToolMessage,
  type ClaudeToolResponse,
} from '../runtime/ai/config/claude-client';

// Re-export production client
export { getClaudeClient, resetClient } from '../runtime/ai/config/claude-client';
export type { ClaudeRequestOptions, ClaudeResponse, ClaudeToolDef, ToolUseCall, ToolResultBlock, ToolMessage, ClaudeToolResponse };

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);

export interface ClaudeCompletionOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  tenantId?: string;
  agentId?: string;
  decisionType?: string;
}

export interface ClaudeToolCallOpts extends ClaudeCompletionOpts {
  tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
}

/**
 * Send a prompt to Claude and parse the response as JSON.
 * Delegates to the production client at runtime/ai/config/claude-client.ts.
 *
 * Supports two call signatures:
 *   claudeJSON("prompt text", { model, maxTokens })  — legacy string form
 *   claudeJSON({ systemPrompt, userMessage, ... })    — object form (used by enhanced/squad routes)
 */
export async function claudeJSON<T = unknown>(
  promptOrOpts: string | (ClaudeCompletionOpts & { systemPrompt?: string; userMessage?: string }),
  opts: ClaudeCompletionOpts = {},
): Promise<T> {
  if (typeof promptOrOpts === 'string') {
    return _callClaudeJSON<T>({
      userMessage: promptOrOpts,
      model: (opts.model || CLAUDE_MODEL) as any,
      maxTokens: opts.maxTokens || CLAUDE_MAX_TOKENS,
      temperature: opts.temperature ?? 0,
      systemPrompt: opts.system || 'You are a helpful AI assistant. Respond with valid JSON only.',
    });
  }
  // Object form — pass through to production client
  return _callClaudeJSON<T>({
    userMessage: promptOrOpts.userMessage || '',
    systemPrompt: promptOrOpts.systemPrompt || promptOrOpts.system || 'You are a helpful AI assistant. Respond with valid JSON only.',
    model: (promptOrOpts.model || CLAUDE_MODEL) as any,
    maxTokens: promptOrOpts.maxTokens || CLAUDE_MAX_TOKENS,
    temperature: promptOrOpts.temperature ?? 0,
  });
}

/**
 * Call Claude with full options. Delegates to production client.
 */
export async function callClaude(
  optsOrPrompt: string | Record<string, unknown>,
): Promise<any> {
  if (typeof optsOrPrompt === 'string') {
    const resp = await _callClaude({ userMessage: optsOrPrompt });
    return resp.content;
  }
  const resp = await _callClaude({
    userMessage: (optsOrPrompt as any).userMessage || (optsOrPrompt as any).prompt || JSON.stringify(optsOrPrompt),
    model: (optsOrPrompt as any).model,
    maxTokens: (optsOrPrompt as any).maxTokens || (optsOrPrompt as any).max_tokens,
    temperature: (optsOrPrompt as any).temperature,
    systemPrompt: (optsOrPrompt as any).system || (optsOrPrompt as any).systemPrompt,
    tools: (optsOrPrompt as any).tools,
    messages: (optsOrPrompt as any).messages,
  });
  return resp;
}

/**
 * Claude chat — delegates to production client.
 */
export async function claudeChat(
  messages: { role: string; content: string }[],
  opts?: Record<string, unknown>,
): Promise<string> {
  const resp = await _callClaude({
    messages: messages as any,
    model: ((opts?.model as string) || CLAUDE_MODEL) as any,
    maxTokens: (opts?.maxTokens as number) || CLAUDE_MAX_TOKENS,
    temperature: (opts?.temperature as number) ?? 0.3,
    systemPrompt: opts?.system as string,
  });
  return resp.content;
}

/**
 * Claude with tool_use — delegates to production callClaude with tools.
 */
export async function claudeWithTools(opts: {
  systemPrompt: string;
  messages: { role: string; content: any }[];
  tools: { name: string; description: string; input_schema: Record<string, unknown> }[];
  model?: string;
  maxTokens?: number;
}): Promise<ClaudeToolResponse> {
  const resp = await _callClaude({
    systemPrompt: opts.systemPrompt,
    messages: opts.messages as any,
    tools: opts.tools as any,
    model: (opts.model || CLAUDE_MODEL) as any,
    maxTokens: opts.maxTokens || CLAUDE_MAX_TOKENS,
  });
  return {
    stopReason: resp.stopReason || 'end_turn',
    textBlocks: resp.content ? [resp.content] : [],
    toolCalls: resp.toolCalls || [],
    rawContent: resp.rawBlocks || [],
    usage: { inputTokens: resp.inputTokens || 0, outputTokens: resp.outputTokens || 0 },
  };
}

export { loadAgentDef, buildToolResults } from '../runtime/ai/config/claude-client';
