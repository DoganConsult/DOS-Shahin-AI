// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { evaluateAndTrigger, type TriggerModuleType } from '../workflow/ai-workflow-trigger.service';
import { logger } from '../../ports/logger.port';
import { getContext, type ContextDimension } from '../../../governance-os/services/governance/governance-context-engine.service';
import { isModuleActive } from '../../../governance-os/services/misc/module-operating-state.service';
import { getModuleTriggerMapping } from '../../../governance-os/services/governance/governance-os-config.service';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

export interface AgentContextAssignment {
  assignmentId: string;
  tenantId: string;
  agentId: string;
  moduleCode: string;
  activationCondition: Record<string, unknown>;
  priority: number;
  playbookConfig: Record<string, unknown>;
  triggerEvents: string[];
  scheduleCron: string | null;
  isActive: boolean;
  lastFiredAt: string | null;
  fireCount: number;
}

export interface AgentFireResult {
  agentId: string;
  moduleCode: string;
  fired: boolean;
  reason: string;
}

// MODULE_TO_TRIGGER is now loaded from database via getModuleTriggerMapping()

export async function getAgentAssignments(
  tenantId: string,
  moduleCode?: string,
): Promise<AgentContextAssignment[]> {
  const schema = tenantSchema(tenantId);
  try {
    let sql = `SELECT * FROM "${schema}".agent_context_assignments WHERE tenant_id = $1 AND is_active = TRUE`;
    const params: unknown[] = [tenantId];
    if (moduleCode) {
      sql += ' AND module_code = $2';
      params.push(moduleCode);
    }
    sql += ' ORDER BY priority';
    const res = await safeQuery(sql, params);
    return res.rows.map(mapRow);
  } catch (err) {
    logger.error('[AgentBridge] Failed to get agent assignments', {
      tenantId,
      moduleCode,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    return [];
  }
}

export async function assignAgentToModule(
  tenantId: string,
  agentId: string,
  moduleCode: string,
  config: {
    activationCondition?: Record<string, unknown>;
    priority?: number;
    playbookConfig?: Record<string, unknown>;
    triggerEvents?: string[];
    scheduleCron?: string;
  } = {},
): Promise<AgentContextAssignment | null> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `INSERT INTO "${schema}".agent_context_assignments
         (tenant_id, agent_id, module_code, activation_condition, priority, playbook_config, trigger_events, schedule_cron)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, agent_id, module_code) DO UPDATE SET
         activation_condition = COALESCE($4, agent_context_assignments.activation_condition),
         priority = COALESCE($5, agent_context_assignments.priority),
         playbook_config = COALESCE($6, agent_context_assignments.playbook_config),
         trigger_events = COALESCE($7, agent_context_assignments.trigger_events),
         schedule_cron = $8,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId, agentId, moduleCode,
        JSON.stringify(config.activationCondition || {}),
        config.priority || 50,
        JSON.stringify(config.playbookConfig || {}),
        config.triggerEvents || [],
        config.scheduleCron || null,
      ],
    );
    return res.rows.length ? mapRow(res.rows[0]) : null;
  } catch (err) {
    logger.warn('[AgentBridge] assign failed', { agentId, moduleCode, error: (err as Error).message });
    return null;
  }
}

export async function evaluateAndFireAgents(
  tenantId: string,
  moduleCode: string,
  eventType: string,
  entityId?: string,
): Promise<AgentFireResult[]> {
  const results: AgentFireResult[] = [];

  const moduleActive = await isModuleActive(tenantId, moduleCode);
  if (!moduleActive) {
    return [{ agentId: '*', moduleCode, fired: false, reason: 'module_inactive' }];
  }

  const assignments = await getAgentAssignments(tenantId, moduleCode);
  if (!assignments.length) {
    return [{ agentId: '*', moduleCode, fired: false, reason: 'no_assignments' }];
  }

  const contextDimensions: ContextDimension[] = ['business_profile', 'module_operating', 'pain_priority'];
  const contextFacts: Record<string, unknown> = {};
  for (const dim of contextDimensions) {
    const ctx = await getContext(tenantId, dim);
    if (ctx) {

      contextFacts[dim] = ctx.data;
    }
  }

  for (const assignment of assignments) {
    if (assignment.triggerEvents.length && !assignment.triggerEvents.includes(eventType)) {
      results.push({ agentId: assignment.agentId, moduleCode, fired: false, reason: 'event_not_matched' });
      continue;
    }

    let conditionMet: boolean;
    try {

      const { evaluateConditionTree, evaluateTemporalWindow, checkRateLimit } = await import('../../../../platform/dos/config/registry/advanced-activation-conditions.service');
      const conditionTree = (assignment as any).conditionTree;
      const temporalWindow = (assignment as any).temporalWindow;

      if (conditionTree) {
        conditionMet = evaluateConditionTree(conditionTree, contextFacts);
      } else {
        conditionMet = evaluateActivationCondition(assignment.activationCondition, contextFacts);
      }

      if (conditionMet && temporalWindow) {
        conditionMet = evaluateTemporalWindow(temporalWindow);
      }

      if (conditionMet && temporalWindow?.rateLimit) {
        conditionMet = checkRateLimit(
          `${tenantId}:${assignment.agentId}:${moduleCode}`,
          temporalWindow.rateLimit,
        );
      }
    } catch {
      conditionMet = evaluateActivationCondition(assignment.activationCondition, contextFacts);
    }

    if (!conditionMet) {
      results.push({ agentId: assignment.agentId, moduleCode, fired: false, reason: 'condition_not_met' });
      continue;
    }

    try {
      const mapping = await getModuleTriggerMapping(tenantId);
      const triggerTypes = mapping[moduleCode];
      if (triggerTypes?.length) {
        await evaluateAndTrigger(tenantId, 'agent_context_bridge', {
          type: triggerTypes[0] as unknown as TriggerModuleType,
          entityId: entityId || '',
          description: `Agent ${assignment.agentId} auto-fired for ${moduleCode} on ${eventType}`,
        });
        logger.debug('[AgentBridge] Triggered agent workflow', {
          tenantId,
          moduleCode,
          agentId: assignment.agentId,
          triggerType: mapping.triggerType,
        });
      } else {
        logger.debug('[AgentBridge] No trigger mapping for module', {
          tenantId,
          moduleCode,
          agentId: assignment.agentId,
        });
      }

      await recordAgentFire(tenantId, assignment.assignmentId);

      swallow(EC.EVENT_BUS, eventBus.publish({
        eventType: `agent.auto_fired` as any,
        tenantId,
        severity: 'info',
        payload: {
          agentId: assignment.agentId,
          moduleCode,
          eventType,
          entityId,
        },
      }), { tenantId, operation: 'eventBus:any' });

      results.push({ agentId: assignment.agentId, moduleCode, fired: true, reason: 'success' });
      logger.info('[AgentBridge] Agent fired successfully', {
        tenantId,
        moduleCode,
        agentId: assignment.agentId,
        eventType,
        entityId,
      });
    } catch (err) {
      logger.error('[AgentBridge] Failed to fire agent', {
        tenantId,
        moduleCode,
        agentId: assignment.agentId,
        eventType,
        entityId,
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      results.push({ agentId: assignment.agentId, moduleCode, fired: false, reason: (err as Error).message });
    }
  }

  return results;
}

export async function seedDefaultAgentAssignments(tenantId: string): Promise<number> {
  const DEFAULT_ASSIGNMENTS: Array<{ agentId: string; moduleCode: string; triggers: string[]; priority: number }> = [
    { agentId: 'A01', moduleCode: 'risk', triggers: ['risk.status_changed', 'risk.created'], priority: 10 },
    { agentId: 'A02', moduleCode: 'compliance', triggers: ['compliance.status_changed', 'compliance.deficiency_found'], priority: 10 },
    { agentId: 'A03', moduleCode: 'audit', triggers: ['audit.status_changed', 'audit.finding_created'], priority: 10 },
    { agentId: 'A04', moduleCode: 'policy', triggers: ['policy.status_changed', 'policy.published'], priority: 20 },
    { agentId: 'A05', moduleCode: 'incident', triggers: ['incident.status_changed', 'incident.escalated'], priority: 5 },
    { agentId: 'A06', moduleCode: 'vendor', triggers: ['vendor.status_changed', 'vendor.assessed'], priority: 20 },
    { agentId: 'A07', moduleCode: 'governance', triggers: ['governance.status_changed'], priority: 15 },
    { agentId: 'A08', moduleCode: 'evidence', triggers: ['evidence.status_changed', 'evidence.rejected_quality'], priority: 20 },
    { agentId: 'A09', moduleCode: 'bcp', triggers: ['bcp.status_changed', 'bcp.activated'], priority: 15 },
    { agentId: 'A10', moduleCode: 'asset', triggers: ['asset.status_changed'], priority: 25 },
  ];

  let seeded = 0;
  for (const def of DEFAULT_ASSIGNMENTS) {
    const result = await assignAgentToModule(tenantId, def.agentId, def.moduleCode, {
      triggerEvents: def.triggers,
      priority: def.priority,
    });
    if (result) seeded++;
  }
  return seeded;
}

function evaluateActivationCondition(
  condition: Record<string, unknown>,
  contextFacts: Record<string, unknown>,
): boolean {
  if (!condition || Object.keys(condition).length === 0) return true;

  if (condition.minSeverity) {
    const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const current = severityOrder[(contextFacts as any).severity || 'low'] || 0;
    const required = severityOrder[(condition as any).minSeverity] || 0;
    if (current < required) return false;
  }

  if (condition.requiredModuleState) {
    const modCtx = contextFacts.module_operating;
    if (modCtx) {
      const modState = modCtx[(condition as any).requiredModuleState];
      if (!modState || modState.state !== 'on') return false;
    }
  }

  if (condition.requiredDimension) {
    if (!contextFacts[(condition as any).requiredDimension]) return false;
  }

  return true;
}

async function recordAgentFire(tenantId: string, assignmentId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".agent_context_assignments
       SET last_fired_at = NOW(), fire_count = fire_count + 1, updated_at = NOW()
       WHERE assignment_id = $1`,
      [assignmentId],
    );
    logger.debug('[AgentBridge] Recorded agent fire', {
      tenantId,
      assignmentId,
    });
  } catch (err) {
    logger.error('[AgentBridge] Failed to record agent fire', {
      tenantId,
      assignmentId,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
  }
}

function mapRow(row: Record<string, unknown>): AgentContextAssignment {
  return {

    assignmentId: row.assignment_id,

    tenantId: row.tenant_id,

    agentId: row.agent_id,

    moduleCode: row.module_code,

    activationCondition: row.activation_condition || {},

    priority: row.priority ?? 50,

    playbookConfig: row.playbook_config || {},

    triggerEvents: row.trigger_events || [],

    scheduleCron: row.schedule_cron,

    isActive: row.is_active ?? true,

    lastFiredAt: row.last_fired_at,

    fireCount: row.fire_count ?? 0,
  };
}
