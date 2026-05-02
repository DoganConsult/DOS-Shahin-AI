import type { LLMMessage } from '../gateway/llm-providers';

type Cached = { content: string; provider: string; model?: string };

const _cache = new Map<string, Cached>();

function keyFor(messages: LLMMessage[], agentId: string): string {
  const last = messages[messages.length - 1]?.content ?? '';
  return `${agentId}::${last}`;
}

export async function getCachedLLMResponse(messages: LLMMessage[], agentId: string): Promise<Cached | null> {
  return _cache.get(keyFor(messages, agentId)) ?? null;
}

export async function setCachedLLMResponse(messages: LLMMessage[], agentId: string, value: Cached): Promise<void> {
  _cache.set(keyFor(messages, agentId), value);
}

