/**
 * Agent Cooperation Service — Re-export barrel (flat path)
 *
 * The canonical agent cooperation implementation lives in the
 * agent-cooperation/ directory. This file re-exports all public
 * functions for backward compatibility with consumers that import
 * from the flat path (e.g., orchestrator.graph.ts,
 * single-agent.graph.ts, agent.activities.ts).
 */
// Cycle context lifecycle
export { initCycleContext, closeCycleContext, getCycleId, getCycleContext, registerDiscovery, } from '../agent-cooperation/cycle-context.js';
// Execution planning and persistence
export { computeExecutionWaves, persistCycleSummary, } from '../agent-cooperation/execution-planner.js';
// Cross-agent correlation
export { correlateDiscoveries, runFullCorrelation, } from '../agent-cooperation/correlation.js';
// Conflict detection
export { hasOpenConflict, detectConflicts, recordAgentConflicts, detectDiscoveryConflicts, resolveConflicts, persistConflictRecords, } from '../agent-cooperation/conflict-detection.js';
// Handoffs
export { createHandoff, getPendingHandoffs, completeHandoff, } from '../agent-cooperation/handoff.js';
// Dependency graph
export { AGENT_DEPENDENCY_GRAPH, getAgentDependencyConfig, } from '../agent-cooperation/dependency-graph.js';
//# sourceMappingURL=agent-cooperation.service.js.map