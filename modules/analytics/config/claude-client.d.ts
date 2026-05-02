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
export declare const CLAUDE_MODEL: string;
export declare const CLAUDE_MAX_TOKENS: number;
/**
 * Get or create the singleton Anthropic client.
 * Returns null if the SDK is not available or the API key is not set.
 */
export declare function getClaudeClient(): any;
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
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}
/**
 * Create a chat completion using the Claude API.
 * Returns null if the client is unavailable.
 */
export declare function createChatCompletion(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult | null>;
/**
 * Claude JSON extraction helper — returns a parsed JSON object from the Claude
 * response content. Returns null when the client is unavailable or the response
 * is not valid JSON. Matches the `claudeJSON` signature consumed by module
 * ai.port.ts re-exports.
 */
export declare function claudeJSON<T = unknown>(prompt: string, options?: CompletionOptions): Promise<T | null>;
export { createChatCompletion as claudeComplete };
