// @ts-nocheck
import { logger } from '../../ports/logger.port.js';
/**
 * AGRC-OS — Agent Cycle Orchestrator
 *
 * Runs all agents for a single tenant using dependency-aware execution waves.
 * Handles multi-agent wave execution, cross-agent conflict detection,
 * discovery correlation, and cycle summary persistence.
 *
 * Extracted from agent-runner.service.ts for maintainability.
 */
import { initCycleContext, closeCycleContext, correlateDiscoveries, computeExecutionWaves, persistCycleSummary, detectConflicts, recordAgentConflicts, getCycleId, } from './agent-cooperation.service.js';
import { eventBus } from '../../ports/events.port.js';
import { getTenantPlatformMode } from '../../ports/platform.port.js';
import { getAgentIds } from './agent-rbac-registry.js';
import { toErrorMessage } from '@dos/module-sdk';
import { runAgent } from '../agents/core/agent-runner.service.js';
// ── Run all agents for a single tenant (parallel wave execution) ──────────
/**
 * Run all agents using dependency-aware execution waves.
 * Agents within the same wave run in parallel (Promise.allSettled).
 * After all waves, cross-agent discoveries are correlated and
 * the cycle summary is persisted.
 */
export async function runAllAgents(tenantId) {
    const results = [];
    const platformMode = await getTenantPlatformMode(tenantId);
    logger.info(`[AgentRunner] tenant ${tenantId} — mode: ${platformMode}`);
    initCycleContext(tenantId);
    try {
        const waves = computeExecutionWaves();
        for (const wave of waves) {
            const wavePromises = wave.agents
                .filter(id => getAgentIds().includes(id))
                .map(id => runAgent(tenantId, id).catch(err => ({
                agentId: id, tenantId, actionsProposed: 0, actionsExecuted: 0,
                summary: `Wave error: ${toErrorMessage(err)}`, durationMs: 0,
            })));
            const settled = await Promise.allSettled(wavePromises);
            for (const s of settled) {
                if (s.status === 'fulfilled')
                    results.push(s.value);
            }
        }
        // Cross-agent correlation pass
        const correlations = await correlateDiscoveries(tenantId);
        // Feature 17: Multi-agent conflict detection
        const conflicts = detectConflicts(tenantId);
        if (conflicts.length > 0) {
            await recordAgentConflicts(tenantId, getCycleId(tenantId), conflicts);
            logger.info(`[AgentRunner] tenant ${tenantId} — detected ${conflicts.length} agent conflicts`);
        }
        const totalActions = results.reduce((s, r) => s + r.actionsExecuted, 0);
        if (totalActions > 0 || correlations.length > 0) {
            logger.info(`[AgentRunner] tenant ${tenantId} — ${totalActions} actions, ${correlations.length} correlations across ${waves.length} waves`);
            eventBus.publish({
                eventType: 'cycle.completed',
                tenantId,
                severity: 'info',
                payload: {
                    agentResults: results.length,
                    correlations: correlations.length,
                    totalActions,
                    waves: waves.length,
                },
            });
        }
        await persistCycleSummary(tenantId).catch(e => logger.warn(`[AgentRunner] persistCycleSummary failed: ${(e instanceof Error ? e.message : String(e))}`));
    }
    finally {
        closeCycleContext(tenantId);
    }
    return results;
}
//# sourceMappingURL=agent-cycle-orchestrator.service.js.map