// @ts-nocheck
// ============================================
// AGRC-OS — Agent Handoff Management
// Handoff creation, retrieval, completion, and
// cooperation rule evaluation for auto-routing.
// ============================================

import { eventBus } from '../../ports/events.port';
import { enqueueHandoff, getHandoffBatch } from '../../ports/platform.port';
import type { AgentHandoff, AgentDiscovery, SharedAgentContext } from './types';
import { activeCycleContexts } from './cycle-context';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { safeQuery } from "@dos/db";

// ── Cooperation Rules ────────────────────────────────────────────────────────

export const COOPERATION_RULES: Array<{
  trigger: { agentId: string; discoveryType: string; minSeverity: string };
  handoffTo: string;
  handoffType: AgentHandoff['handoffType'];
  action: string;
}> = [
  // Risk flagged by A07 -> A06 creates remediation plan
  { trigger: { agentId: 'A07', discoveryType: 'risk', minSeverity: 'high' },
    handoffTo: 'A06', handoffType: 'remediation_chain', action: 'Create remediation for high risk' },
  // Gap found by A06 -> A05 requests evidence
  { trigger: { agentId: 'A06', discoveryType: 'gap', minSeverity: 'medium' },
    handoffTo: 'A05', handoffType: 'finding', action: 'Request missing evidence for gap' },
  // Control stale (A04) -> A05 requests fresh evidence
  { trigger: { agentId: 'A04', discoveryType: 'anomaly', minSeverity: 'medium' },
    handoffTo: 'A05', handoffType: 'validation_request', action: 'Validate control evidence freshness' },
  // Policy violation (A08) -> A07 escalates risk
  { trigger: { agentId: 'A08', discoveryType: 'violation', minSeverity: 'high' },
    handoffTo: 'A07', handoffType: 'escalation', action: 'Assess risk impact of policy violation' },
  // Vendor risk (A09) -> A07 registers risk
  { trigger: { agentId: 'A09', discoveryType: 'risk', minSeverity: 'high' },
    handoffTo: 'A07', handoffType: 'finding', action: 'Register vendor-originated risk' },
  // Vendor compliance gap (A09) -> A06 creates remediation
  { trigger: { agentId: 'A09', discoveryType: 'gap', minSeverity: 'medium' },
    handoffTo: 'A06', handoffType: 'remediation_chain', action: 'Create remediation for vendor compliance gap' },
  // Vendor cert/evidence (A09) -> A05 auto-satisfies evidence
  { trigger: { agentId: 'A09', discoveryType: 'evidence', minSeverity: 'low' },
    handoffTo: 'A05', handoffType: 'validation_request', action: 'Auto-satisfy control evidence from vendor certificate' },
  // Vendor shared-responsibility (A09) -> A03 framework sync
  { trigger: { agentId: 'A09', discoveryType: 'mapping', minSeverity: 'low' },
    handoffTo: 'A03', handoffType: 'context_enrichment', action: 'Sync vendor shared-responsibility to framework controls' },
  // Vendor finding (A09) -> A10 audit finding
  { trigger: { agentId: 'A09', discoveryType: 'finding', minSeverity: 'medium' },
    handoffTo: 'A10', handoffType: 'finding', action: 'Create audit finding from vendor assessment' },
  // Any critical finding -> A10 prepares audit trail
  { trigger: { agentId: 'A07', discoveryType: 'risk', minSeverity: 'critical' },
    handoffTo: 'A10', handoffType: 'context_enrichment', action: 'Prepare audit trail for critical risk' },
  // Framework gap (A03) -> A04 creates control draft
  { trigger: { agentId: 'A03', discoveryType: 'gap', minSeverity: 'medium' },
    handoffTo: 'A04', handoffType: 'remediation_chain', action: 'Draft control for unmapped framework requirement' },
  // BCP risk detected (A11) -> A07 registers risk
  { trigger: { agentId: 'A11', discoveryType: 'risk', minSeverity: 'high' },
    handoffTo: 'A07', handoffType: 'finding', action: 'Register BCP continuity risk in risk register' },
  // BCP exercise failure (A11) -> A10 audit trail
  { trigger: { agentId: 'A11', discoveryType: 'finding', minSeverity: 'medium' },
    handoffTo: 'A10', handoffType: 'finding', action: 'Create audit finding from BCP exercise failure' },
  // BCP RTO/RPO drift (A11) -> A06 creates remediation
  { trigger: { agentId: 'A11', discoveryType: 'anomaly', minSeverity: 'medium' },
    handoffTo: 'A06', handoffType: 'remediation_chain', action: 'Create remediation plan for RTO/RPO drift' },
  // Training gap (A12) -> A06 creates remediation
  { trigger: { agentId: 'A12', discoveryType: 'gap', minSeverity: 'medium' },
    handoffTo: 'A06', handoffType: 'remediation_chain', action: 'Create remediation for training compliance gap' },
  // Training non-compliance (A12) -> A10 audit finding
  { trigger: { agentId: 'A12', discoveryType: 'finding', minSeverity: 'high' },
    handoffTo: 'A10', handoffType: 'finding', action: 'Create audit finding for training non-compliance' },
  // Evidence gap (A05) -> A06 remediation
  { trigger: { agentId: 'A05', discoveryType: 'gap', minSeverity: 'medium' },
    handoffTo: 'A06', handoffType: 'remediation_chain', action: 'Create remediation for missing evidence' },
  // Onboarding incomplete (A01) -> A02 provision missing roles
  { trigger: { agentId: 'A01', discoveryType: 'gap', minSeverity: 'medium' },
    handoffTo: 'A02', handoffType: 'context_enrichment', action: 'Provision missing roles identified during onboarding' },
  // Incident escalation (A06) -> A08 policy review
  { trigger: { agentId: 'A06', discoveryType: 'violation', minSeverity: 'high' },
    handoffTo: 'A08', handoffType: 'escalation', action: 'Trigger policy review for repeated compliance violation' },
];

// ── Handoff Creation ───────────────────────────────────────────────────────

export function createHandoff(
  tenantId: string,
  fromAgent: string,
  toAgent: string,
  handoffType: AgentHandoff['handoffType'],
  priority: AgentHandoff['priority'],
  payload: AgentHandoff['payload'],
): AgentHandoff {
  const handoff: AgentHandoff = {
    id: `ho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    fromAgent, toAgent, tenantId, handoffType, priority,
    payload, status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const ctx = activeCycleContexts.get(tenantId);
  if (ctx) ctx.handoffs.push(handoff);

  // Enqueue to priority queue (Requirements: 5.2 Optimized Handoff Protocol)
  enqueueHandoff(tenantId, handoff);

  import('../../../../openclaw/a2a/agent-message-queue.js').then(({ sendAgentMessage }) =>
    sendAgentMessage(tenantId, fromAgent, toAgent, `[Handoff:${handoffType}] ${payload?.requestedAction || payload?.finding || 'Agent handoff'}`, { handoffId: handoff.id, handoffType, priority, ...payload })
  ).catch(catchHandler(EC.EVENT_BUS));

  return handoff;
}

/**
 * Get pending handoffs for a specific agent (consumed during that agent's run).
 * Requirements: 5.2 Optimized Handoff Protocol - supports batching
 */
export async function getPendingHandoffs(tenantId: string, agentId: string, useBatching: boolean = false): Promise<AgentHandoff[]> {
  // If batching is enabled, get a batch from the priority queue
  if (useBatching) {
    const batch = await getHandoffBatch(tenantId, agentId, 10); // max 10 per batch
    return batch.handoffs;
  }

  // Legacy: get from cycle context
  const ctx = activeCycleContexts.get(tenantId);
  if (!ctx) return [];
  return ctx.handoffs.filter(h => h.toAgent === agentId && h.status === 'pending');
}

/**
 * Mark a handoff as completed with result.
 */
export function completeHandoff(tenantId: string, handoffId: string, result: Record<string, unknown>): void {
  const ctx = activeCycleContexts.get(tenantId);
  if (!ctx) return;
  const h = ctx.handoffs.find(ho => ho.id === handoffId);
  if (h) {
    h.status = 'completed';
    h.completedAt = new Date().toISOString();
    h.result = result;
  }
}

// ── Internal: Cooperation Rule Evaluation ──────────────────────────────────

/**
 * Evaluate cooperation rules when a discovery is registered.
 * Automatically creates handoffs based on matching rules.
 */
export function _evaluateCooperationRules(tenantId: string, discovery: AgentDiscovery, _ctx: SharedAgentContext): void {
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const discoveryRank = severityRank[discovery.severity] || 0;

  for (const rule of COOPERATION_RULES) {
    if (rule.trigger.agentId !== discovery.agentId) continue;
    if (rule.trigger.discoveryType !== discovery.type) continue;

    const minRank = severityRank[rule.trigger.minSeverity] || 0;
    if (discoveryRank < minRank) continue;

    const handoff = createHandoff(
      tenantId, discovery.agentId, rule.handoffTo,
      rule.handoffType,
      discovery.severity as AgentHandoff['priority'],
      {
        entityType: discovery.entityType,
        entityId: discovery.entityId,
        finding: discovery.title,
        context: { details: discovery.details, sourceAgent: discovery.agentId },
        requestedAction: rule.action,
      },
    );

    // Gap 3: Also persist to DB for cross-PM2 instance visibility
    import('../../../agrc-engine/services/agrc-os-integration.service.js').then(({ persistHandoff }) =>
      persistHandoff(tenantId, discovery.agentId, rule.handoffTo, rule.handoffType,
        discovery.severity, { finding: discovery.title, requestedAction: rule.action,
          entityType: discovery.entityType, entityId: discovery.entityId })
    ).catch(catchHandler(EC.AGENT_ACTION, {}));

    swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'agent.handoff_created' as string,
          tenantId, sourceService: `agent-${discovery.agentId}`,
          severity: discovery.severity === 'critical' ? 'critical' : 'info',
          payload: { handoffId: handoff.id, from: discovery.agentId, to: rule.handoffTo, type: rule.handoffType },
        } as any)), { tenantId, operation: 'eventBus:agent.handoff_created' });
  }
}
