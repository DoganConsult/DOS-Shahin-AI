import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { AgentsRegistrySchemaV2 } from '../../packages/dos-contracts/src/platform/agents-registry.schema';

describe('platform agent registry (agents.registry.json)', () => {
  it('matches schema v2 and includes A01–A12', () => {
    const registryPath = path.resolve(__dirname, '..', '..', 'platform', 'registries', 'agents.registry.json');
    const raw = fs.readFileSync(registryPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const res = AgentsRegistrySchemaV2.safeParse(parsed);
    expect(res.success).toBe(true);
    if (!res.success) return;

    const agentCodes = res.data.agents.map((a) => a.agentCode);
    expect(new Set(agentCodes).size).toBe(agentCodes.length);
    expect(agentCodes.sort()).toEqual(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12']);
  });
});

