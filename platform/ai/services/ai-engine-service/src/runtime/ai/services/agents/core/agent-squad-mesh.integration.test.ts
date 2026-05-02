// ================================================================
// Agent Squad Mesh — Integration Tests
// Validates: tool injection, delegation wiring, guards, and
// parent-child result handoff through the real code paths.
//
// NOTE: The delegation service (delegateToAgent, logBlockedDelegation)
// is tested in its own co-located test file:
//   delegation/agent-to-agent-delegation.service.test.ts
// This test file focuses on the tool registry, handler guards,
// orchestrator flow, and copilot output contract.
// ================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [{ delegation_id: 'test-uuid' }] }),
  tenantSchema: vi.fn().mockReturnValue('t_test'),
  recordAudit: vi.fn().mockResolvedValue({}),
  callClaude: vi.fn(),
  publishEvent: vi.fn().mockResolvedValue({}),
  getAgentCatalogIds: vi.fn().mockReturnValue([
    'A01', 'A02', 'A03', 'A04', 'A05', 'A06',
    'A07', 'A08', 'A09', 'A10', 'A11', 'A12',
  ]),
  analyzeDocumentWithRAG: vi.fn().mockResolvedValue({ text: 'doc result' }),
  delegateToAgent: vi.fn().mockResolvedValue({
    delegationId: 'del-123',
    executionResult: { raw_text: 'Delegated result', discoveries: [] },
    status: 'completed',
  }),
  logBlockedDelegation: vi.fn().mockResolvedValue(undefined),
  stubToolBuilder: () => [
    {
      name: 'stub_domain_tool',
      description: 'A stub tool for testing',
      input_schema: { type: 'object' as const, properties: { q: { type: 'string' } }, required: ['q'] },
      handler: async () => ({ result: 'stub' }),
    },
  ],
}));

vi.mock('../../../ports/database.port', () => ({
  safeQuery: mocks.safeQuery,
  tenantSchema: mocks.tenantSchema,
}));

vi.mock('@dos/db', () => ({
  safeQuery: mocks.safeQuery,
  tenantSchema: mocks.tenantSchema,
}));

vi.mock('../../../ports/platform.port', () => ({
  getAgentCatalogIds: mocks.getAgentCatalogIds,
  recordAgentPerformance: vi.fn(),
  buildDependencyGraph: vi.fn(),
}));

vi.mock('../../../ports/events.port', () => ({
  emitEvent: mocks.publishEvent,
  eventBus: { publish: mocks.publishEvent, subscribe: vi.fn() },
}));

// Mock the delegation service — its own test file validates internals
vi.mock('../../delegation/agent-to-agent-delegation.service', () => ({
  delegateToAgent: mocks.delegateToAgent,
  logBlockedDelegation: mocks.logBlockedDelegation,
}));

vi.mock('../../../config/claude-client', () => ({
  callClaude: mocks.callClaude,
}));

vi.mock('../../../ports/ai.port', () => ({
  buildToolResults: vi.fn(),
  loadAgentDef: vi.fn().mockReturnValue({ name: 'TestAgent', systemPrompt: 'You are a test agent.' }),
  ClaudeToolDef: {},
}));

vi.mock('../../rag/ai-rag-service', () => ({
  analyzeDocumentWithRAG: mocks.analyzeDocumentWithRAG,
}));

vi.mock('../../agent-cooperation.service.js', () => ({
  registerDiscovery: vi.fn(),
  getPendingHandoffs: vi.fn().mockResolvedValue([]),
  completeHandoff: vi.fn(),
}));

// Mock the audit trail used by the executor
vi.mock('../../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: mocks.recordAudit,
}));

// Mock MCP service (D5: real module routing)
vi.mock('../../../../../domain/mcp/services/mcp.service', () => ({
  getTools: vi.fn().mockResolvedValue([]),
  logExecution: vi.fn().mockResolvedValue({ logId: 'mock-log' }),
}));

// Stub all agent tool builders
vi.mock('@shahin-ai/product/ai/tools/a01-onboarding-tools', () => ({ buildA01Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a02-identity-access-tools', () => ({ buildA02Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a03-framework-tools', () => ({ buildA03Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a04-control-tools', () => ({ buildA04Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a05-evidence-tools', () => ({ buildA05Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a06-gap-remediation-tools', () => ({ buildA06Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a07-risk-tools', () => ({ buildA07Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a08-policy-tools', () => ({ buildA08Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a09-vendor-tools', () => ({ buildA09Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a10-audit-tools', () => ({ buildA10Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a11-bcp-tools', () => ({ buildA11Tools: mocks.stubToolBuilder }));
vi.mock('@shahin-ai/product/ai/tools/a12-training-tools', () => ({ buildA12Tools: mocks.stubToolBuilder }));

// ── Imports (after mocks) ────────────────────────────────────────
import { initAgentToolsRegistry } from './agent-tools-registry.service';
import { getToolsForAgent, runAgentWithTools } from './agent-tool-executor.service';

// ================================================================
// TEST SUITE 1: Tool Injection Coverage
// ================================================================

describe('Tool Injection — delegate_to_agent available to all 12 agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initAgentToolsRegistry();
  });

  const allAgents = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];

  it('1. initAgentToolsRegistry populates tools for all 12 agents', () => {
    for (const agentId of allAgents) {
      const tools = getToolsForAgent(agentId);
      expect(tools.length).toBeGreaterThan(0);
    }
  });

  it('2. Every agent has delegate_to_agent tool', () => {
    for (const agentId of allAgents) {
      const tools = getToolsForAgent(agentId);
      const delegateTool = tools.find(t => t.name === 'delegate_to_agent');
      expect(delegateTool, `Agent ${agentId} missing delegate_to_agent`).toBeDefined();
    }
  });

  it('3. Every agent has query_mcp_server tool', () => {
    for (const agentId of allAgents) {
      const tools = getToolsForAgent(agentId);
      const mcpTool = tools.find(t => t.name === 'query_mcp_server');
      expect(mcpTool, `Agent ${agentId} missing query_mcp_server`).toBeDefined();
    }
  });

  it('4. Every agent has analyze_document_contents tool', () => {
    for (const agentId of allAgents) {
      const tools = getToolsForAgent(agentId);
      const ragTool = tools.find(t => t.name === 'analyze_document_contents');
      expect(ragTool, `Agent ${agentId} missing analyze_document_contents`).toBeDefined();
    }
  });

  it('5. Every agent retains domain-specific tools alongside universal tools', () => {
    for (const agentId of allAgents) {
      const tools = getToolsForAgent(agentId);
      const domainTool = tools.find(t => t.name === 'stub_domain_tool');
      expect(domainTool, `Agent ${agentId} missing domain tool`).toBeDefined();
      // At minimum: 1 domain + 3 universal (delegate, mcp, rag) = 4
      expect(tools.length).toBeGreaterThanOrEqual(4);
    }
  });
});

// ================================================================
// TEST SUITE 2: Circular Dependency Guard (handler-level)
// ================================================================

describe('Circular Dependency Guard — blocks re-delegation to visited agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initAgentToolsRegistry();
  });

  it('6. Self-delegation A07→A07 is blocked by permission gate', async () => {
    const tools = getToolsForAgent('A07');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    const result = await delegateTool.handler('tenant-1', {
      targetAgentId: 'A07',
      taskType: 'test',
      taskDescription: 'self-delegate',
      priority: 'medium',
      expectedOutcome: 'should fail',
    }, { visitedAgents: [] });

    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('cannot delegate to itself');
    expect(mocks.delegateToAgent).not.toHaveBeenCalled();
  });

  it('6b. Invalid agent ID is rejected', async () => {
    const tools = getToolsForAgent('A01');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    const result = await delegateTool.handler('tenant-1', {
      targetAgentId: 'A99',
      taskType: 'test',
      taskDescription: 'invalid target',
      priority: 'medium',
      expectedOutcome: 'should fail',
    }, { visitedAgents: [] });

    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('Invalid target agent');
    expect(mocks.delegateToAgent).not.toHaveBeenCalled();
  });

  it('7. Ping-pong A01→A07→A01 is blocked on second visit', async () => {
    const tools = getToolsForAgent('A07');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    const result = await delegateTool.handler('tenant-1', {
      targetAgentId: 'A01',
      taskType: 'test',
      taskDescription: 'ping-pong',
      priority: 'medium',
      expectedOutcome: 'should fail',
    }, { visitedAgents: ['A01', 'A07'] });

    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('Circular dependency detected');
    expect(mocks.delegateToAgent).not.toHaveBeenCalled();
  });
});

// ================================================================
// TEST SUITE 3: Max Depth Guard (handler-level)
// ================================================================

describe('Max Depth Guard — blocks delegation chains deeper than 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initAgentToolsRegistry();
  });

  it('8. Delegation at depth 5 is blocked', async () => {
    const tools = getToolsForAgent('A01');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    const result = await delegateTool.handler('tenant-1', {
      targetAgentId: 'A07',
      taskType: 'deep',
      taskDescription: 'too deep',
      priority: 'medium',
      expectedOutcome: 'blocked',
    }, { visitedAgents: ['A01', 'A02', 'A03', 'A04', 'A05'] });

    expect(result).toHaveProperty('error');
    expect((result as any).error).toContain('Maximum delegation depth');
    expect(mocks.logBlockedDelegation).toHaveBeenCalledWith(
      'tenant-1', 'A01', 'A07', 'max_depth_exceeded'
    );
    expect(mocks.delegateToAgent).not.toHaveBeenCalled();
  });

  it('9. Delegation at depth 4 is allowed (< 5 limit)', async () => {
    const tools = getToolsForAgent('A01');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    const result = await delegateTool.handler('tenant-1', {
      targetAgentId: 'A07',
      taskType: 'deep',
      taskDescription: 'just under limit',
      priority: 'medium',
      expectedOutcome: 'allowed',
    }, { visitedAgents: ['A01', 'A02', 'A03', 'A04'] });

    // Should NOT be blocked — delegateToAgent should be called
    expect(result).not.toHaveProperty('error');
    expect(mocks.delegateToAgent).toHaveBeenCalledWith(
      'tenant-1', 'A01', 'A07',
      expect.objectContaining({ taskType: 'deep' }),
      expect.anything()
    );
  });

  it('10. Delegation context passes visitedAgents to delegateToAgent', async () => {
    const tools = getToolsForAgent('A03');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    await delegateTool.handler('tenant-1', {
      targetAgentId: 'A08',
      taskType: 'policy_review',
      taskDescription: 'Review compliance policies',
      priority: 'high',
      expectedOutcome: 'Policy review report',
    }, { visitedAgents: ['A03'] });

    expect(mocks.delegateToAgent).toHaveBeenCalledWith(
      'tenant-1', 'A03', 'A08',
      expect.objectContaining({
        context: { visitedAgents: ['A03'] },
      }),
      expect.anything()
    );
  });
});

// ================================================================
// TEST SUITE 4: Happy Path — Full orchestrator flow via runAgentWithTools
// ================================================================

describe('Happy Path — Full orchestrator delegation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initAgentToolsRegistry();
  });

  it('11. runAgentWithTools executes tools and returns structured result', async () => {
    mocks.callClaude
      .mockResolvedValueOnce({
        inputTokens: 100, outputTokens: 50, stopReason: 'tool_use',
        rawBlocks: [{ type: 'tool_use', id: 'tc1', name: 'stub_domain_tool', input: { q: 'test' } }],
        toolCalls: [{ id: 'tc1', name: 'stub_domain_tool', input: { q: 'test' } }],
        content: '',
      })
      .mockResolvedValueOnce({
        inputTokens: 80, outputTokens: 40, stopReason: 'end_turn',
        rawBlocks: [], toolCalls: [], content: 'Analysis complete. No issues found.',
      });

    const result = await runAgentWithTools('tenant-1', 'A01', { userId: 'user-1' }, 'Check status');

    expect(result.agentId).toBe('A01');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.finalText).toBe('Analysis complete. No issues found.');
    expect(result.toolResults.length).toBe(1);
    expect(result.toolResults[0].toolName).toBe('stub_domain_tool');
    expect(result.toolResults[0].isError).toBe(false);
    expect(result.totalInputTokens).toBe(180);
    expect(result.totalOutputTokens).toBe(90);
    expect(result.stopReason).toBe('end_turn');
  });

  it('12. runAgentWithTools propagates visitedAgents through tool opts', async () => {
    let capturedOpts: any = null;

    const tools = getToolsForAgent('A01');
    const stubTool = tools.find(t => t.name === 'stub_domain_tool')!;
    const originalHandler = stubTool.handler;
    stubTool.handler = async (_tenantId, _input, opts) => {
      capturedOpts = opts;
      return { result: 'ok' };
    };

    mocks.callClaude
      .mockResolvedValueOnce({
        inputTokens: 10, outputTokens: 10, stopReason: 'tool_use',
        rawBlocks: [{ type: 'tool_use', id: 'tc1', name: 'stub_domain_tool', input: { q: 'x' } }],
        toolCalls: [{ id: 'tc1', name: 'stub_domain_tool', input: { q: 'x' } }],
        content: '',
      })
      .mockResolvedValueOnce({
        inputTokens: 10, outputTokens: 10, stopReason: 'end_turn',
        rawBlocks: [], toolCalls: [], content: 'Done',
      });

    await runAgentWithTools('t1', 'A01', {}, 'test', { visitedAgents: ['A03'] });

    expect(capturedOpts).toBeDefined();
    expect(capturedOpts.visitedAgents).toContain('A03');
    expect(capturedOpts.visitedAgents).toContain('A01');

    stubTool.handler = originalHandler;
  });

  it('13. runAgentWithTools invokes delegate_to_agent through Claude tool loop', async () => {
    // Simulate Claude choosing to delegate
    mocks.callClaude
      .mockResolvedValueOnce({
        inputTokens: 100, outputTokens: 50, stopReason: 'tool_use',
        rawBlocks: [{ type: 'tool_use', id: 'tc-del', name: 'delegate_to_agent', input: {
          targetAgentId: 'A07', taskType: 'risk_scan', taskDescription: 'Scan for risks',
          priority: 'high', expectedOutcome: 'Risk report',
        }}],
        toolCalls: [{ id: 'tc-del', name: 'delegate_to_agent', input: {
          targetAgentId: 'A07', taskType: 'risk_scan', taskDescription: 'Scan for risks',
          priority: 'high', expectedOutcome: 'Risk report',
        }}],
        content: '',
      })
      .mockResolvedValueOnce({
        inputTokens: 80, outputTokens: 40, stopReason: 'end_turn',
        rawBlocks: [], toolCalls: [],
        content: 'I delegated the risk scan to Agent A07. The scan found no critical risks.',
      });

    const result = await runAgentWithTools('tenant-1', 'A03', {}, 'Check risks');

    // delegateToAgent should have been called by the handler
    expect(mocks.delegateToAgent).toHaveBeenCalledWith(
      'tenant-1', 'A03', 'A07',
      expect.objectContaining({ taskType: 'risk_scan' }),
      expect.anything() // opts with userId
    );

    // Final text should be Claude's summarization
    expect(result.finalText).toContain('delegated the risk scan');
    expect(result.toolResults.length).toBe(1);
    expect(result.toolResults[0].toolName).toBe('delegate_to_agent');
    expect(result.toolResults[0].isError).toBe(false);
  });

  it('14. Tool execution failure is recorded truthfully', async () => {
    mocks.callClaude
      .mockResolvedValueOnce({
        inputTokens: 10, outputTokens: 10, stopReason: 'tool_use',
        rawBlocks: [{ type: 'tool_use', id: 'tc1', name: 'nonexistent_tool', input: {} }],
        toolCalls: [{ id: 'tc1', name: 'nonexistent_tool', input: {} }],
        content: '',
      })
      .mockResolvedValueOnce({
        inputTokens: 10, outputTokens: 10, stopReason: 'end_turn',
        rawBlocks: [], toolCalls: [], content: 'Tool was not found.',
      });

    const result = await runAgentWithTools('tenant-1', 'A01', {}, 'test');

    expect(result.toolResults[0].isError).toBe(true);
    expect(result.toolResults[0].output).toHaveProperty('error');
    expect(result.toolResults[0].output.error).toContain('not found');
  });
});

// ================================================================
// TEST SUITE 5: Delegation handler → delegateToAgent integration
// ================================================================

describe('Delegation handler calls delegateToAgent with correct args', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initAgentToolsRegistry();
  });

  it('15. Handler passes priority and expectedOutcome through to service', async () => {
    const tools = getToolsForAgent('A01');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    await delegateTool.handler('tenant-1', {
      targetAgentId: 'A07',
      taskType: 'risk_assessment',
      taskDescription: 'Assess project risks',
      priority: 'critical',
      expectedOutcome: 'Full risk matrix',
    }, { visitedAgents: [] });

    expect(mocks.delegateToAgent).toHaveBeenCalledWith(
      'tenant-1',
      'A01',
      'A07',
      expect.objectContaining({
        taskType: 'risk_assessment',
        taskDescription: 'Assess project risks',
        priority: 'critical',
        expectedOutcome: 'Full risk matrix',
        context: { visitedAgents: [] },
      }),
      expect.anything()
    );
  });

  it('16. Handler returns delegation result to parent agent', async () => {
    mocks.delegateToAgent.mockResolvedValueOnce({
      delegationId: 'del-456',
      executionResult: { raw_text: 'Policy reviewed successfully', discoveries: [{ type: 'finding' }] },
      status: 'completed',
    });

    const tools = getToolsForAgent('A03');
    const delegateTool = tools.find(t => t.name === 'delegate_to_agent')!;

    const result = await delegateTool.handler('tenant-1', {
      targetAgentId: 'A08',
      taskType: 'policy_review',
      taskDescription: 'Review policy',
      priority: 'medium',
      expectedOutcome: 'Review report',
    }, { visitedAgents: [] });

    expect(result).toEqual({
      success: true,
      delegationId: 'del-456',
      target_agent_output: expect.objectContaining({ raw_text: 'Policy reviewed successfully' }),
    });
  });
});
