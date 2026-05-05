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
import { callClaude as _callClaude, callClaudeJSON as _callClaudeJSON, } from '../runtime/ai/config/claude-client';
// Re-export production client
export { getClaudeClient, resetClient } from '../runtime/ai/config/claude-client';
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);
/**
 * Send a prompt to Claude and parse the response as JSON.
 * Delegates to the production client at runtime/ai/config/claude-client.ts.
 *
 * Supports two call signatures:
 *   claudeJSON("prompt text", { model, maxTokens })  — legacy string form
 *   claudeJSON({ systemPrompt, userMessage, ... })    — object form (used by enhanced/squad routes)
 */
export async function claudeJSON(promptOrOpts, opts = {}) {
    if (typeof promptOrOpts === 'string') {
        return _callClaudeJSON({
            userMessage: promptOrOpts,
            model: (opts.model || CLAUDE_MODEL),
            maxTokens: opts.maxTokens || CLAUDE_MAX_TOKENS,
            temperature: opts.temperature ?? 0,
            systemPrompt: opts.system || 'You are a helpful AI assistant. Respond with valid JSON only.',
        });
    }
    // Object form — pass through to production client
    return _callClaudeJSON({
        userMessage: promptOrOpts.userMessage || '',
        systemPrompt: promptOrOpts.systemPrompt || promptOrOpts.system || 'You are a helpful AI assistant. Respond with valid JSON only.',
        model: (promptOrOpts.model || CLAUDE_MODEL),
        maxTokens: promptOrOpts.maxTokens || CLAUDE_MAX_TOKENS,
        temperature: promptOrOpts.temperature ?? 0,
    });
}
/**
 * Call Claude with full options. Delegates to production client.
 */
export async function callClaude(optsOrPrompt) {
    if (typeof optsOrPrompt === 'string') {
        const resp = await _callClaude({ userMessage: optsOrPrompt });
        return resp.content;
    }
    const resp = await _callClaude({
        userMessage: optsOrPrompt.userMessage || optsOrPrompt.prompt || JSON.stringify(optsOrPrompt),
        model: optsOrPrompt.model,
        maxTokens: optsOrPrompt.maxTokens || optsOrPrompt.max_tokens,
        temperature: optsOrPrompt.temperature,
        systemPrompt: optsOrPrompt.system || optsOrPrompt.systemPrompt,
        tools: optsOrPrompt.tools,
        messages: optsOrPrompt.messages,
    });
    return resp;
}
/**
 * Claude chat — delegates to production client.
 */
export async function claudeChat(messages, opts) {
    const resp = await _callClaude({
        messages: messages,
        model: (opts?.model || CLAUDE_MODEL),
        maxTokens: opts?.maxTokens || CLAUDE_MAX_TOKENS,
        temperature: opts?.temperature ?? 0.3,
        systemPrompt: opts?.system,
    });
    return resp.content;
}
/**
 * Claude with tool_use — delegates to production callClaude with tools.
 */
export async function claudeWithTools(opts) {
    const resp = await _callClaude({
        systemPrompt: opts.systemPrompt,
        messages: opts.messages,
        tools: opts.tools,
        model: (opts.model || CLAUDE_MODEL),
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
//# sourceMappingURL=claude-client.js.map