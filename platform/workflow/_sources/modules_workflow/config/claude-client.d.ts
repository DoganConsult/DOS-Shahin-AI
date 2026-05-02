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
export declare class ClaudeApiError extends Error {
    readonly statusCode: number;
    readonly retryable: boolean;
    readonly tokenUsage?: {
        input: number;
        output: number;
    };
    constructor(message: string, statusCode: number, retryable: boolean, tokenUsage?: {
        input: number;
        output: number;
    });
}
export declare class ClaudeBudgetExceededError extends ClaudeApiError {
    constructor();
}
export declare class ClaudeTimeoutError extends ClaudeApiError {
    constructor(timeoutMs: number);
}
export declare const CLAUDE_MODELS: {
    readonly SONNET: "claude-sonnet-4-20250514";
    readonly HAIKU: "claude-haiku-4-5-20251001";
    readonly OPUS: "claude-opus-4-20250514";
};
export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];
export declare function getClaudeClient(): Anthropic;
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
    toolCalls: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
    }>;
    rawBlocks: Anthropic.ContentBlock[];
}
export declare function callClaude(opts: ClaudeRequestOptions): Promise<ClaudeResponse>;
export declare function callClaudeJSON<T>(opts: ClaudeRequestOptions): Promise<T>;
export declare function resetClient(): void;
export declare function loadAgentDef(..._args: unknown[]): unknown;
export declare function buildToolResults(..._args: unknown[]): unknown;
export interface ClaudeToolDef {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
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
export type ToolMessage = {
    role: 'user';
    content: string | Array<Anthropic.ContentBlock | ToolResultBlock>;
} | {
    role: 'assistant';
    content: Anthropic.ContentBlock[];
};
export interface ClaudeToolResponse {
    stopReason: string;
    textBlocks: string[];
    toolCalls: ToolUseCall[];
    rawContent: Anthropic.ContentBlock[];
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}
export { callClaudeJSON as claudeJSON };
export { callClaude as claudeComplete };
export type { ClaudeRequestOptions as ClaudeCompletionOpts };
