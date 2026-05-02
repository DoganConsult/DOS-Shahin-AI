// ============================================
// AI Hub Agent Performance Metrics — Property-Based Tests
// Feature: grc-frontend-integration, Property 10: Agent performance metrics display all agents
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/ai-hub/ai-hub.pbt.ts

import * as fc from 'fast-check';
import {
  extractAgentMetrics,
  AgentPerformanceRecord,
} from './agent-metrics.utils';

// ============================================
// Arbitraries
// ============================================

const agentIdArb = fc.stringMatching(/^[A-Z][0-9]{2}$/);

const performanceRecordArb = (agentId: string): fc.Arbitrary<AgentPerformanceRecord> =>
  fc.record({
    agent_id: fc.constant(agentId),
    tool_name: fc.string({ minLength: 1, maxLength: 20 }),
    duration_ms: fc.integer({ min: 1, max: 60000 }),
    success: fc.boolean(),
    executed_at: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(t => new Date(t).toISOString()),
  });

const recordsArb: fc.Arbitrary<AgentPerformanceRecord[]> = fc
  .array(agentIdArb, { minLength: 1, maxLength: 10 })
  .chain(agentIds =>
    fc.tuple(
      ...agentIds.map(id => fc.array(performanceRecordArb(id), { minLength: 1, maxLength: 10 }))
    )
  )
  .map(arrays => arrays.flat());

// ============================================
// Property 10: Agent performance metrics display all agents
// **Validates: Requirements 11.1**
//
// For any set of agent performance records, extractAgentMetrics returns
// metrics (success rate, average duration, total executions) for every
// distinct agent ID in the dataset.
// ============================================

console.log('--- Property 10: Agent performance metrics display all agents ---');

// 10a: Every distinct agent_id in the input has a corresponding metrics entry
fc.assert(
  fc.property(recordsArb, (records) => {
    const metrics = extractAgentMetrics(records);
    const inputAgentIds = new Set(records.map(r => r.agent_id));
    const outputAgentIds = new Set(metrics.map(m => m.agentId));
    // Every input agent must appear in output
    for (const id of inputAgentIds) {
      if (!outputAgentIds.has(id)) return false;
    }
    // No extra agents in output
    for (const id of outputAgentIds) {
      if (!inputAgentIds.has(id)) return false;
    }
    return true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10a: every distinct agent_id has a metrics entry (bijection)');

// 10b: totalExecutions for each agent equals the count of records for that agent
fc.assert(
  fc.property(recordsArb, (records) => {
    const metrics = extractAgentMetrics(records);
    return metrics.every(m => {
      const count = records.filter(r => r.agent_id === m.agentId).length;
      return m.totalExecutions === count;
    });
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10b: totalExecutions matches record count per agent');

// 10c: successRate is between 0 and 100 inclusive
fc.assert(
  fc.property(recordsArb, (records) => {
    const metrics = extractAgentMetrics(records);
    return metrics.every(m => m.successRate >= 0 && m.successRate <= 100);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10c: successRate is in [0, 100]');

// 10d: avgResponseTime is non-negative
fc.assert(
  fc.property(recordsArb, (records) => {
    const metrics = extractAgentMetrics(records);
    return metrics.every(m => m.avgResponseTime >= 0);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10d: avgResponseTime is non-negative');

// 10e: Empty input returns empty output
fc.assert(
  fc.property(fc.constant([] as AgentPerformanceRecord[]), (records: AgentPerformanceRecord[]) => {
    return extractAgentMetrics(records).length === 0;
  }),
  { numRuns: 1 }
);
console.log('  ✓ 10e: empty input returns empty output');

// 10f: Output is sorted by agentId ascending
fc.assert(
  fc.property(recordsArb, (records) => {
    const metrics = extractAgentMetrics(records);
    for (let i = 1; i < metrics.length; i++) {
      if (metrics[i].agentId.localeCompare(metrics[i - 1].agentId) < 0) return false;
    }
    return true;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10f: output is sorted by agentId ascending');

console.log('Property 10: PASSED\n');
