import { describe, it, expect } from 'vitest';

import { loadAgentDef, buildToolResults } from '../../services/ai-engine-service/src/runtime/ai/config/claude-client';
import { getAgentIds } from '../../services/ai-engine-service/src/runtime/ai/services/orchestration/agent-rbac-registry';

describe('AI engine agent activation surface', () => {
  it('exposes built-in A01–A12 agent IDs', () => {
    expect(getAgentIds()).toEqual([
      'A01', 'A02', 'A03', 'A04', 'A05', 'A06',
      'A07', 'A08', 'A09', 'A10', 'A11', 'A12',
    ]);
  });

  it('loads A01–A12 agent definitions with system prompts', () => {
    const ids = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];
    for (const id of ids) {
      const def = loadAgentDef(id);
      expect(def).toBeTruthy();
      expect(def?.id).toBe(id);
      expect(typeof def?.name).toBe('string');
      expect(typeof def?.systemPrompt).toBe('string');
      expect(def?.systemPrompt.length).toBeGreaterThan(10);
    }
  });

  it('buildToolResults maps tool outputs into tool_result blocks', () => {
    const blocks = buildToolResults([
      { toolCallId: 't1', output: { ok: true }, isError: false },
      { tool_use_id: 't2', content: 'fail', is_error: true },
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'tool_result', tool_use_id: 't1', is_error: false });
    expect(typeof blocks[0].content).toBe('string');
    expect(blocks[1]).toMatchObject({ type: 'tool_result', tool_use_id: 't2', is_error: true });
  });
});
