import { describe, expect, it, vi } from 'vitest';

vi.mock('../../ports/ai.port', () => ({
  CLAUDE_MODEL: 'claude-test',
  CLAUDE_MAX_TOKENS: 10,
  getClaudeClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello' }],
        usage: { input_tokens: 1, output_tokens: 2 },
      }),
    },
  }),
}));

vi.mock('../gateway/ai-gateway.service', () => ({
  gatewayAcquireSlot: vi.fn().mockResolvedValue(undefined),
  gatewayReleaseSlot: vi.fn(),
}));

import { streamClaudeResponse } from './llm-stream.service';

describe('llm-stream.service', () => {
  it('streams a non-streaming Claude client response as SSE events', async () => {
    let buffer = '';
    let ended = false;
    const res: any = {
      writeHead: vi.fn(),
      flushHeaders: vi.fn(),
      write: (chunk: string) => { buffer += chunk; },
      end: () => { ended = true; },
    };

    const result = await streamClaudeResponse(
      [{ role: 'user', content: 'hi' }],
      res,
      { tenantId: 't1', agentId: 'a1' },
    );

    expect(result.totalTokens).toBe(3);
    expect(buffer).toContain('event: start');
    expect(buffer).toContain('event: token');
    expect(buffer).toContain('event: usage');
    expect(buffer).toContain('event: done');
    expect(ended).toBe(true);
  });
});

