/**
 * llm-cache.service — minimal in-engine implementation.
 *
 * @owner AI
 * Provides a no-op cache surface so callers compile and degrade safely until
 * the canonical Redis/Config-OS-backed cache lands. Returns null on get,
 * accepts and discards on set.
 */

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CachedLLMResponse {
  content: string;
  provider: string;
  model: string;
}

export async function getCachedLLMResponse(
  _messages: LLMChatMessage[],
  _agentId: string,
): Promise<CachedLLMResponse | null> {
  return null;
}

export async function setCachedLLMResponse(
  _messages: LLMChatMessage[],
  _agentId: string,
  _response: CachedLLMResponse,
): Promise<void> {
  return;
}
