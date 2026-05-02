export declare const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export declare function callClaude(prompt: string | Record<string, unknown>): Promise<string>;
export declare function claudeJSON<T = unknown>(prompt: string | Record<string, unknown>): Promise<T>;
