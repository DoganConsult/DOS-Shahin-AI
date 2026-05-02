export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export async function callClaude(prompt: string | Record<string, unknown>): Promise<string> { return '{}'; }
export async function claudeJSON<T = unknown>(prompt: string | Record<string, unknown>): Promise<T> {
  const result = await callClaude(prompt);
  try { return JSON.parse(result); } catch { return {} as T; }
}
