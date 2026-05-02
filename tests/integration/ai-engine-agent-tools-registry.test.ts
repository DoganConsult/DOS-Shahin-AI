import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const PRODUCT_TOOLS_DIR = path.join(ROOT, 'packages', 'shahin-product', 'src', 'ai', 'tools');

function extractToolNamesFromSourceFile(fileName: string): string[] {
  const filePath = path.join(PRODUCT_TOOLS_DIR, fileName);
  const src = fs.readFileSync(filePath, 'utf8');
  const names: string[] = [];
  for (const m of src.matchAll(/name:\s*'([^']+)'/g)) names.push(m[1]);
  for (const m of src.matchAll(/name:\s*"([^"]+)"/g)) names.push(m[1]);
  return names;
}

function buildToolsFromSource(fileName: string): Array<{ name: string; description: string; input_schema: any; handler: any }> {
  const names = extractToolNamesFromSourceFile(fileName);
  return names.map((name) => ({
    name,
    description: name,
    input_schema: { type: 'object', properties: {}, required: [] },
    handler: async () => ({ ok: true }),
  }));
}

vi.mock('@shahin-ai/product/ai/tools/a01-onboarding-tools', () => ({ buildA01Tools: () => buildToolsFromSource('a01-onboarding-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a02-identity-access-tools', () => ({ buildA02Tools: () => buildToolsFromSource('a02-identity-access-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a03-framework-tools', () => ({ buildA03Tools: () => buildToolsFromSource('a03-framework-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a04-control-tools', () => ({ buildA04Tools: () => buildToolsFromSource('a04-control-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a05-evidence-tools', () => ({ buildA05Tools: () => buildToolsFromSource('a05-evidence-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a06-gap-remediation-tools', () => ({ buildA06Tools: () => buildToolsFromSource('a06-gap-remediation-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a07-risk-tools', () => ({ buildA07Tools: () => buildToolsFromSource('a07-risk-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a08-policy-tools', () => ({ buildA08Tools: () => buildToolsFromSource('a08-policy-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a09-vendor-tools', () => ({ buildA09Tools: () => buildToolsFromSource('a09-vendor-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a10-audit-tools', () => ({ buildA10Tools: () => buildToolsFromSource('a10-audit-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a11-bcp-tools', () => ({ buildA11Tools: () => buildToolsFromSource('a11-bcp-tools.ts') }), { virtual: true });
vi.mock('@shahin-ai/product/ai/tools/a12-training-tools', () => ({ buildA12Tools: () => buildToolsFromSource('a12-training-tools.ts') }), { virtual: true });

vi.mock('../../services/ai-engine-service/src/runtime/ai/ports/platform.port', () => ({
  getAgentCatalogIds: () => ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'],
}));

const INJECTED_TOOL_NAMES = [
  'delegate_to_agent',
  'query_mcp_server',
  'analyze_document_contents',
];

function names(tools: Array<{ name: string }>): string[] {
  return tools.map((t) => t.name);
}

describe('ai-engine tool registry (A01–A12)', () => {
  it('registers the exact tool list per agent', async () => {
    const { initAgentToolsRegistry } = await import(
      '../../services/ai-engine-service/src/runtime/ai/services/agents/core/agent-tools-registry.service'
    );
    const { getToolsForAgent } = await import(
      '../../services/ai-engine-service/src/runtime/ai/services/agents/core/agent-tool-executor.service'
    );

    initAgentToolsRegistry();

    const expectedByAgent: Record<string, string[]> = {
      A01: [...extractToolNamesFromSourceFile('a01-onboarding-tools.ts'), ...INJECTED_TOOL_NAMES],
      A02: [...extractToolNamesFromSourceFile('a02-identity-access-tools.ts'), ...INJECTED_TOOL_NAMES],
      A03: [...extractToolNamesFromSourceFile('a03-framework-tools.ts'), ...INJECTED_TOOL_NAMES],
      A04: [...extractToolNamesFromSourceFile('a04-control-tools.ts'), ...INJECTED_TOOL_NAMES],
      A05: [...extractToolNamesFromSourceFile('a05-evidence-tools.ts'), ...INJECTED_TOOL_NAMES],
      A06: [...extractToolNamesFromSourceFile('a06-gap-remediation-tools.ts'), ...INJECTED_TOOL_NAMES],
      A07: [...extractToolNamesFromSourceFile('a07-risk-tools.ts'), ...INJECTED_TOOL_NAMES],
      A08: [...extractToolNamesFromSourceFile('a08-policy-tools.ts'), ...INJECTED_TOOL_NAMES],
      A09: [...extractToolNamesFromSourceFile('a09-vendor-tools.ts'), ...INJECTED_TOOL_NAMES],
      A10: [...extractToolNamesFromSourceFile('a10-audit-tools.ts'), ...INJECTED_TOOL_NAMES],
      A11: [...extractToolNamesFromSourceFile('a11-bcp-tools.ts'), ...INJECTED_TOOL_NAMES],
      A12: [...extractToolNamesFromSourceFile('a12-training-tools.ts'), ...INJECTED_TOOL_NAMES],
    };

    for (const agentId of Object.keys(expectedByAgent)) {
      expect(names(getToolsForAgent(agentId))).toEqual(expectedByAgent[agentId]);
    }
  });
});
