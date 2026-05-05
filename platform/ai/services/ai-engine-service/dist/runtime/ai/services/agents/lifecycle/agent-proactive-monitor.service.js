// @ts-nocheck
import { logger } from '../../../ports/logger.port';
// ============================================
// Agent Proactive Monitoring Service (Facade)
// Continuously monitors tenant data and triggers
// agents based on predictive signals and thresholds,
// not just schedules. Enables proactive, predictive
// agent execution.
//
// Sub-modules:
//   - proactive-signal-evaluators.service.ts  (cross-cutting signal functions + configs)
//   - agent-trigger-evaluators.service.ts     (per-agent A01-A12 evaluators)
// ============================================
import { safeQuery } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service';
import { toErrorMessage } from '@dos/module-sdk';
import { AGENT_TRIGGER_EVALUATORS } from './agent-trigger-evaluators.service';
import { AGENT_MONITORING_CONFIGS } from '../../../../governance-os/services/misc/proactive-signal-evaluators.service';
import { swallow, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
// ── Re-export everything from sub-modules ────────────────────────────────────
// All public types (ProactiveTrigger, AgentMonitoringConfig) and functions
// (evaluateComplianceTrend, evaluateRiskEscalation, evaluateEvidenceExpiry,
// evaluateSLAViolations, AGENT_MONITORING_CONFIGS, AGENT_TRIGGER_EVALUATORS)
// are accessible via this facade for backward compatibility.
export * from '../../../../governance-os/services/misc/proactive-signal-evaluators.service';
export * from './agent-trigger-evaluators.service';
// ── Monitoring state per tenant per agent ─────────────────────────────────────
const monitoringState = new Map();
// ── Main Monitoring Loop ──────────────────────────────────────────────────────
/**
 * Monitors a single tenant for proactive agent triggers
 */
export async function monitorTenant(tenantId) {
    const triggers = [];
    const agentsTriggered = new Set();
    // Rate limit: don't poll same tenant too frequently
    const stateKey = tenantId;
    const state = monitoringState.get(stateKey) || { lastPoll: 0, lastTrigger: 0, consecutiveTriggers: 0 };
    const now = Date.now();
    const minPollInterval = 5 * 60 * 1000; // 5 minutes minimum
    if (now - state.lastPoll < minPollInterval) {
        return { triggers: [], agentsTriggered: [] };
    }
    state.lastPoll = now;
    monitoringState.set(stateKey, state);
    // Evaluate triggers for each agent
    for (const [agentId, evaluator] of Object.entries(AGENT_TRIGGER_EVALUATORS)) {
        const config = AGENT_MONITORING_CONFIGS[agentId];
        if (!config || !config.enabled)
            continue;
        try {
            const agentTriggers = await evaluator(tenantId);
            for (const trigger of agentTriggers) {
                // Check if we should trigger (avoid spam)
                const _triggerKey = `${tenantId}:${agentId}:${trigger.signalType}`;
                const lastTriggerTime = state.lastTrigger;
                const cooldown = trigger.urgency === 'critical' ? 0 : 15 * 60 * 1000; // 15 min cooldown for non-critical
                if (now - lastTriggerTime < cooldown && state.consecutiveTriggers > 3) {
                    continue; // Skip if too many consecutive triggers
                }
                triggers.push(trigger);
                agentsTriggered.add(agentId);
                // Update state
                state.lastTrigger = now;
                state.consecutiveTriggers = triggers.length;
                monitoringState.set(stateKey, state);
                // Publish event to trigger agent execution
                await swallow(EC.EVENT_BUS, eventBus.publish({
                    eventType: 'agent.proactive_trigger',
                    tenantId,
                    sourceService: 'agent-proactive-monitor',
                    entityType: 'agent',
                    entityId: agentId,
                    severity: trigger.urgency === 'critical' ? 'critical' : trigger.urgency === 'high' ? 'warning' : 'info',
                    payload: {
                        triggerType: trigger.triggerType,
                        signalType: trigger.signalType,
                        reason: trigger.reason,
                        predictedValue: trigger.predictedValue,
                        confidence: trigger.confidence,
                    },
                }), { tenantId, operation: 'eventBus:agent.proactive_trigger' });
                // Audit log
                await recordAudit({
                    tenantId,
                    userId: `agent-proactive-monitor`,
                    module: 'agent_monitoring',
                    action: 'create',
                    entityType: 'proactive_trigger',
                    entityId: `${agentId}-${trigger.signalType}`,
                    afterState: {
                        agentId,
                        triggerType: trigger.triggerType,
                        signalType: trigger.signalType,
                        urgency: trigger.urgency,
                        reason: trigger.reason,
                    },
                }).catch(catchHandler(EC.EVENT_BUS, {}));
            }
        }
        catch (err) {
            logger.warn(`[ProactiveMonitor] Failed to evaluate ${agentId} for tenant ${tenantId}: ${toErrorMessage(err)}`);
        }
    }
    // Reset consecutive counter if no triggers
    if (triggers.length === 0) {
        state.consecutiveTriggers = 0;
        monitoringState.set(stateKey, state);
    }
    return {
        triggers,
        agentsTriggered: Array.from(agentsTriggered),
    };
}
/**
 * Continuous monitoring loop (runs in background)
 * Polls all active tenants periodically
 */
export async function startProactiveMonitoring() {
    logger.info('[ProactiveMonitor] Starting proactive monitoring service');
    // Get all active tenants
    const getActiveTenants = async () => {
        try {
            const result = await safeQuery(`SELECT tenant_id FROM tenants WHERE deleted_at IS NULL AND status = 'active'`);
            return result.rows;
        }
        catch {
            return [];
        }
    };
    // Main loop
    const pollInterval = 10 * 60 * 1000; // 10 minutes default
    setInterval(async () => {
        try {
            const tenants = await getActiveTenants();
            logger.info(`[ProactiveMonitor] Polling ${tenants.length} tenants for proactive triggers`);
            for (const tenant of tenants) {
                try {
                    const { triggers, agentsTriggered } = await monitorTenant(tenant.tenant_id);
                    if (triggers.length > 0) {
                        logger.info(`[ProactiveMonitor] Tenant ${tenant.tenant_id}: ${triggers.length} triggers, ` +
                            `agents: ${agentsTriggered.join(', ')}`);
                    }
                }
                catch (err) {
                    logger.warn(`[ProactiveMonitor] Failed to monitor tenant ${tenant.tenant_id}: ${toErrorMessage(err)}`);
                }
            }
        }
        catch (err) {
            logger.error(`[ProactiveMonitor] Monitoring loop error: ${toErrorMessage(err)}`);
        }
    }, pollInterval);
    logger.info(`[ProactiveMonitor] Monitoring loop started (${pollInterval / 1000}s interval)`);
}
/**
 * Manually trigger monitoring for a specific tenant (for testing/admin)
 */
export async function triggerMonitoringForTenant(tenantId) {
    const { triggers } = await monitorTenant(tenantId);
    return triggers;
}
//# sourceMappingURL=agent-proactive-monitor.service.js.map