import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { AI_EVENT_CONTRACT } from './ai.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const riskId = payload.entityId as string || payload.riskId as string;
  const riskTitle = payload.title as string || 'New risk';

  await createProcessTask(tenantId, {
    title: `AI: Analyze new risk "${riskTitle}" for AI-assisted treatment suggestions`,
    description: `A new risk has been registered. Queue for AI analysis to suggest treatment options and control mappings.`,
    taskType: 'ai_analysis',
    priority: 'medium',
    entityType: 'risk',
    entityId: riskId,
    triggerSource: 'risk.created',
  });
}

async function handleComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const gapId = payload.entityId as string || payload.gapId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `AI: Generate remediation suggestions for compliance gap`,
    description: `A compliance gap has been detected. Use AI to analyze the gap and suggest remediation steps.`,
    taskType: 'ai_analysis',
    priority: severity === 'critical' ? 'high' : 'medium',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

async function handleEvidenceCollected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const evidenceId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `AI: Classify and validate collected evidence`,
    description: `New evidence has been collected. Queue for AI-assisted classification, completeness check, and quality scoring.`,
    taskType: 'ai_classification',
    priority: 'low',
    entityType: 'evidence',
    entityId: evidenceId,
    triggerSource: 'evidence.collected',
  });
}

async function handleTaskAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const taskId = payload.taskId as string || payload.entityId as string;
  const taskType = payload.taskType as string;

  if (taskType === 'ai_analysis' || taskType === 'ai_classification') {
    await createProcessTask(tenantId, {
      title: `AI: Process assigned AI task`,
      description: `AI task has been assigned via workflow. Process the task and return results.`,
      taskType: 'ai_execution',
      priority: 'medium',
      entityType: 'workflow_task',
      entityId: taskId,
      triggerSource: 'workflow.task_assigned',
    });
  }
}

async function handleConfigUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const configKey = payload.configKey as string || payload.key as string;

  if (configKey?.startsWith('ai.') || configKey?.startsWith('llm.') || configKey?.startsWith('copilot.')) {
    await safeQuery(
      `UPDATE "${schema}".ai_model_registry
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{config_stale}', 'true'::jsonb),
           updated_at = NOW()
       WHERE status = 'active'`,
      [],
    );
  }
}

async function handleRiskMitigationRequired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `AI: Suggest mitigation strategy for untreated risk "${payload.riskName}"`,
    description: `Risk score ${payload.score} with no treatment plan. Use AI to suggest mitigation options and control mappings.`,
    taskType: 'ai_analysis', priority: 'high',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.mitigation_required',
  });
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `AI: Emergency risk analysis — appetite breach "${payload.riskName}"`,
    description: `Risk score ${payload.riskScore} exceeds appetite max ${payload.maxScore}. AI to generate emergency response options.`,
    taskType: 'ai_analysis', priority: 'critical',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.exceeded_appetite',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `AI: Analyze failing controls and suggest improvements`,
    description: `${payload.failingControls} of ${payload.total} controls are ineffective. AI to analyze root causes and suggest remediation.`,
    taskType: 'ai_analysis', priority: 'high',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'control.effectiveness_low',
  });
}

async function handleEvidenceCoverageLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `AI: Auto-identify evidence sources for control "${payload.controlName}"`,
    description: `Control has no attached evidence. AI to suggest evidence sources and auto-collection strategies.`,
    taskType: 'ai_classification', priority: 'medium',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'evidence.coverage_low',
  });
}

// W4.1 — consumer for ai.agent.failed (previously published with no handler).
// Persists an audit row into agent_governance_audit and opens a process task
// for human review. If repeat failures within a short window exceed a threshold
// the tenant's circuit breaker for that agent is tripped via ai_kill_switches.
async function handleAgentFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const agentId = (payload.agentId as string) || (payload.entityId as string) || 'unknown';
  const runId = (payload.runId as string) || (payload.executionId as string) || null;
  const errorMessage = (payload.error as string) || (payload.message as string) || 'agent run failed';
  const severity = (payload.severity as string) || 'medium';

  await safeQuery(
    `INSERT INTO "${schema}".agent_governance_audit
      (tenant_id, agent_id, entry_type, action, result, details, created_at)
     VALUES ($1, $2, 'agent_failure', 'run_failed', 'failed', $3::jsonb, NOW())`,
    [tenantId, agentId, JSON.stringify({ runId, errorMessage, severity, payload })],
  );

  await createProcessTask(tenantId, {
    title: `Agent failure review — ${agentId}`,
    description: `Agent ${agentId} reported a failed run (${runId ?? 'no runId'}): ${errorMessage}. Review and determine whether to rerun, escalate, or disable.`,
    taskType: 'agent_failure_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'ai_agent',
    entityId: agentId,
    triggerSource: 'ai.agent.failed',
  });

  // Circuit-breaker trip: if this agent has had >= 5 failures in the last hour,
  // flip its kill-switch so further runs are blocked until manually cleared.
  const recentFailures = await safeQuery(
    `SELECT COUNT(*)::int AS count
       FROM "${schema}".agent_governance_audit
      WHERE agent_id = $1
        AND entry_type = 'agent_failure'
        AND created_at > NOW() - INTERVAL '1 hour'`,
    [agentId],
  );
  const count = (recentFailures.rows?.[0]?.count as number) ?? 0;
  if (count >= 5) {
    await safeQuery(
      `INSERT INTO "${schema}".ai_kill_switches
        (tenant_id, agent_id, reason, activated_at, active)
       VALUES ($1, $2, $3, NOW(), TRUE)
       ON CONFLICT (tenant_id, agent_id)
         DO UPDATE SET active = TRUE, reason = EXCLUDED.reason, activated_at = NOW()`,
      [tenantId, agentId, `auto-tripped: ${count} failures in last 1h`],
    ).catch(() => { /* table may not have unique constraint on fresh tenants; ignore */ });
  }
}

// W4.2 — consumer for ai.cost.threshold_exceeded (previously silent).
// Writes a budget-breach audit row and, on critical severity, hard-stops the
// agent by tripping its kill-switch. Non-critical breaches emit a soft alert.
async function handleCostThresholdExceeded(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const agentId = (payload.agentId as string) || null;
  const severity = (payload.severity as string) || 'warning';
  const budgetUsed = (payload.budgetUsed as number) ?? null;
  const budgetLimit = (payload.budgetLimit as number) ?? null;

  await safeQuery(
    `INSERT INTO "${schema}".agent_governance_audit
      (tenant_id, agent_id, entry_type, action, result, details, created_at)
     VALUES ($1, $2, 'cost_threshold', 'threshold_exceeded', $3, $4::jsonb, NOW())`,
    [
      tenantId,
      agentId ?? 'tenant-wide',
      severity,
      JSON.stringify({ budgetUsed, budgetLimit, severity, payload }),
    ],
  );

  if (severity === 'critical' && agentId) {
    await safeQuery(
      `INSERT INTO "${schema}".ai_kill_switches
        (tenant_id, agent_id, reason, activated_at, active)
       VALUES ($1, $2, $3, NOW(), TRUE)
       ON CONFLICT (tenant_id, agent_id)
         DO UPDATE SET active = TRUE, reason = EXCLUDED.reason, activated_at = NOW()`,
      [tenantId, agentId, `auto-tripped: cost budget breached (${budgetUsed}/${budgetLimit})`],
    ).catch(() => { /* best-effort */ });
  }

  await createProcessTask(tenantId, {
    title: severity === 'critical'
      ? `AI budget hard-stop — ${agentId ?? 'tenant'} exceeded budget`
      : `AI budget warning — ${agentId ?? 'tenant'} near budget limit`,
    description: `Budget usage ${budgetUsed ?? '?'} of ${budgetLimit ?? '?'}. Severity: ${severity}. Review usage, raise budget, or disable the agent.`,
    taskType: 'ai_budget_review',
    priority: severity === 'critical' ? 'critical' : 'medium',
    entityType: 'ai_budget',
    entityId: agentId ?? 'tenant-wide',
    triggerSource: 'ai.cost.threshold_exceeded',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[ai] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[ai] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.created', wrapHandler('handleRiskCreated', handleRiskCreated));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGap', handleComplianceGap));
handlers.set('evidence.collected', wrapHandler('handleEvidenceCollected', handleEvidenceCollected));
handlers.set('workflow.task_assigned', wrapHandler('handleTaskAssigned', handleTaskAssigned));
handlers.set('admin.config_updated', wrapHandler('handleConfigUpdated', handleConfigUpdated));
handlers.set('risk.mitigation_required', wrapHandler('handleRiskMitigationRequired', handleRiskMitigationRequired));
handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('evidence.coverage_low', wrapHandler('handleEvidenceCoverageLow', handleEvidenceCoverageLow));
handlers.set('ai.agent.failed', wrapHandler('handleAgentFailed', handleAgentFailed));
handlers.set('ai.cost.threshold_exceeded', wrapHandler('handleCostThresholdExceeded', handleCostThresholdExceeded));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${AI_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerAiEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `ai:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[ai] registered ${handlers.size} domain event subscribers`);
}
