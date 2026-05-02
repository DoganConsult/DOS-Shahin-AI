import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '../../../ports/ai.port';
import type { LLMMessage, LLMCompletionResult } from './provider.interface';
import { safeQuery } from "@dos/db";

export async function callClaude(
  messages: LLMMessage[],
  model: string,
  maxTokens: number,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  const { getClaudeClient } = await import('../../../../../config/claude-client');
  const client = getClaudeClient();

  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
  const apiMessages = chatMessages.length > 0
    ? chatMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    : [{ role: 'user' as const, content: '(no user message)' }];

  const resp = await client.messages.create({
    model: model || CLAUDE_MODEL,
    max_tokens: maxTokens || CLAUDE_MAX_TOKENS,
    temperature: 0.3,
    system: systemPrompt || undefined,
    messages: apiMessages,
  });

  const block = resp.content[0];
  return {
    content: block.type === 'text' ? block.text : JSON.stringify(block),
    provider: 'claude',
    model: model || CLAUDE_MODEL,
    tokensUsed: (resp.usage?.input_tokens || 0) + (resp.usage?.output_tokens || 0),
  };
}
