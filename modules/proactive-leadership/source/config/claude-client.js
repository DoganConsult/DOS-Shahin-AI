"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_MAX_TOKENS = exports.CLAUDE_MODEL = void 0;
exports.getClaudeClient = getClaudeClient;
exports.createChatCompletion = createChatCompletion;
exports.claudeComplete = createChatCompletion;
exports.claudeJSON = claudeJSON;
const observability_1 = require("@dos/platform-core/observability");
exports.CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
exports.CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);
let _client = null;
let _initialized = false;
/**
 * Get or create the singleton Anthropic client.
 * Returns null if the SDK is not available or the API key is not set.
 */
function getClaudeClient() {
    if (_initialized)
        return _client;
    _initialized = true;
    if (!process.env.ANTHROPIC_API_KEY && !process.env.AZURE_OPENAI_API_KEY) {
        observability_1.logger.debug('[claude-client] No API key configured — AI features will use rule-based fallback');
        return null;
    }
    try {
        // Dynamic require to avoid hard dependency
        const Anthropic = require('@anthropic-ai/sdk').default;
        _client = new Anthropic();
        observability_1.logger.info('[claude-client] Anthropic client initialized for onboarding module');
        return _client;
    }
    catch {
        observability_1.logger.debug('[claude-client] @anthropic-ai/sdk not installed — AI features disabled');
        return null;
    }
}
/**
 * Create a chat completion using the Claude API.
 * Returns null if the client is unavailable.
 */
async function createChatCompletion(messages, options = {}) {
    const client = getClaudeClient();
    if (!client)
        return null;
    try {
        const response = await client.messages.create({
            model: options.model || exports.CLAUDE_MODEL,
            max_tokens: options.maxTokens || exports.CLAUDE_MAX_TOKENS,
            temperature: options.temperature ?? 0.3,
            system: options.system || 'You are a GRC expert assistant. Respond with valid JSON only.',
            messages: messages.map(m => ({ role: m.role, content: m.content })),
        });
        const text = response.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('');
        return {
            content: text,
            usage: {
                inputTokens: response.usage?.input_tokens ?? 0,
                outputTokens: response.usage?.output_tokens ?? 0,
            },
        };
    }
    catch (err) {
        observability_1.logger.error('[claude-client] Chat completion failed', {
            error: err instanceof Error ? err.message : String(err),
            model: options.model || exports.CLAUDE_MODEL,
        });
        return null;
    }
}
/**
 * Claude JSON extraction helper — returns a parsed JSON object from the Claude
 * response content. Returns null when the client is unavailable or the response
 * is not valid JSON. Matches the `claudeJSON` signature consumed by module
 * ai.port.ts re-exports.
 */
async function claudeJSON(prompt, options = {}) {
    const result = await createChatCompletion([{ role: 'user', content: prompt }], options);
    if (!result)
        return null;
    try {
        let jsonStr = result.content;
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch)
            jsonStr = codeBlockMatch[1].trim();
        return JSON.parse(jsonStr);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=claude-client.js.map