import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '../../ports/platform.port';
import { SYSTEM_TENANT, SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export interface EventTriggerBinding {
  binding_id: string;
  tenant_id: string;
  event_type: string;
  target_agent_id: string;
  action_type: string;
  condition_json: Record<string, unknown>;
  enabled: boolean;
  cooldown_seconds: number;
  last_triggered_at: string | null;
}

const _cooldownMap = new Map<string, number>();
const _seededTenants = new Set<string>();

async function ensureEventTriggerBindingTable(schema: string): Promise<void> {
  await safeQuery(
    `CREATE TABLE IF NOT EXISTS "${schema}".event_trigger_binding (
      binding_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id          TEXT NOT NULL,
      event_type         TEXT NOT NULL,
      target_agent_id    TEXT NOT NULL,
      action_type        TEXT NOT NULL DEFAULT 'run_agent',
      condition_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
      enabled            BOOLEAN NOT NULL DEFAULT TRUE,
      cooldown_seconds   INT NOT NULL DEFAULT 60,
      last_triggered_at  TIMESTAMPTZ,
      created_by         TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    [],
  ).catch(() => undefined);
  await safeQuery(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_event_trigger_binding_tenant_event_agent
      ON "${schema}".event_trigger_binding (tenant_id, event_type, target_agent_id)`,
    [],
  ).catch(() => undefined);
  await safeQuery(
    `CREATE INDEX IF NOT EXISTS idx_event_trigger_binding_tenant_event
      ON "${schema}".event_trigger_binding (tenant_id, event_type)`,
    [],
  ).catch(() => undefined);
  await safeQuery(
    `CREATE INDEX IF NOT EXISTS idx_event_trigger_binding_tenant_enabled
      ON "${schema}".event_trigger_binding (tenant_id, enabled)`,
    [],
  ).catch(() => undefined);
}

async function seedDefaultBindings(tenantId: string, schema: string): Promise<void> {
  const defaults: Array<{ eventType: string; agentId: string; cooldownSeconds: number; conditionJson?: Record<string, unknown> }> = [
    { eventType: 'onboarding.answers.saved',  agentId: 'A01', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['org', 'onboarding', 'foundation'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A02', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['access', 'iam', 'identity', 'users', 'roles'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A03', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['framework', 'frameworks', 'compliance'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A04', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['control', 'controls'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A05', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['evidence'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A06', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['gap', 'remediation'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A07', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['risk', 'risks'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A08', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['policy', 'policies'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A09', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['vendor', 'vendors', 'thirdparty'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A10', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['audit'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A11', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['bcp', 'bc'] } } },
    { eventType: 'onboarding.answers.saved',  agentId: 'A12', cooldownSeconds: 15, conditionJson: { answerType: { $in: ['training', 'awareness'] } } },
    { eventType: 'onboarding.step.completed', agentId: 'A01', cooldownSeconds: 30 },
    { eventType: 'risk.exceeded_appetite',    agentId: 'A07', cooldownSeconds: 3600 },
    { eventType: 'control.failed',           agentId: 'A04', cooldownSeconds: 1800 },
    { eventType: 'control.failed',           agentId: 'A06', cooldownSeconds: 1800 },
    { eventType: 'evidence.expired',         agentId: 'A05', cooldownSeconds: 3600 },
    { eventType: 'incident.created',         agentId: 'A07', cooldownSeconds: 900 },
    { eventType: 'compliance.gap_detected',  agentId: 'A06', cooldownSeconds: 3600 },
    { eventType: 'vendor.risk_changed',      agentId: 'A09', cooldownSeconds: 3600 },
    { eventType: 'policy.violated',          agentId: 'A08', cooldownSeconds: 1800 },
    { eventType: 'audit.finding_created',    agentId: 'A10', cooldownSeconds: 3600 },
    { eventType: 'training.compliance_gap',  agentId: 'A12', cooldownSeconds: 3600 },
  ];

  for (const d of defaults) {
    await safeQuery(
      `INSERT INTO "${schema}".event_trigger_binding
         (tenant_id, event_type, target_agent_id, action_type, condition_json, enabled, cooldown_seconds, created_by)
       VALUES ($1,$2,$3,'run_agent',$4::jsonb,TRUE,$5,$6)
       ON CONFLICT (tenant_id, event_type, target_agent_id) DO NOTHING`,
      [tenantId, d.eventType, d.agentId, JSON.stringify(d.conditionJson || {}), d.cooldownSeconds, SYSTEM_JOB_ACTOR],
    ).catch(() => undefined);
  }
}

export async function processEventTriggers(tenantId: string, eventType: string, payload: Record<string, unknown>): Promise<number> {
  const schema = tenantSchema(tenantId);
  let triggered = 0;
  try {
    await ensureEventTriggerBindingTable(schema);
    if (!_seededTenants.has(tenantId)) {
      await seedDefaultBindings(tenantId, schema);
      _seededTenants.add(tenantId);
    }
    const result = await safeQuery(
      `SELECT * FROM "${schema}".event_trigger_binding
       WHERE tenant_id = $1 AND event_type = $2 AND enabled = TRUE`,
      [tenantId, eventType],
    );

    for (const binding of result.rows) {
      const cooldownKey = `${tenantId}:${binding.binding_id}`;
      const lastTriggered = _cooldownMap.get(cooldownKey) || 0;
      const now = Date.now();
      if (now - lastTriggered < binding.cooldown_seconds * 1000) continue;

      if (binding.condition_json && Object.keys(binding.condition_json).length > 0) {
        if (!matchesCondition(binding.condition_json, payload)) continue;
      }

      _cooldownMap.set(cooldownKey, now);
      await safeQuery(
        `UPDATE "${schema}".event_trigger_binding SET last_triggered_at = NOW() WHERE binding_id = $1`,
        [binding.binding_id],
      );

      await executeBindingAction(tenantId, binding, payload);

      eventBus.publish(({
              eventType: 'ai.trigger.fired', tenantId,
              sourceService: 'ai-event-trigger', severity: 'info',
              payload: { eventType: eventType, bindingId: binding.binding_id, targetAgentId: binding.target_agent_id, actionType: binding.action_type },
            } as any));
      triggered++;
    }
  } catch (err) {
    logger.warn(`[AI EventTrigger] processEventTriggers failed for ${eventType}: ${(err as Error).message}`);
  }
  return triggered;
}

async function executeBindingAction(tenantId: string, binding: EventTriggerBinding, payload: Record<string, unknown>): Promise<void> {
  try {
    switch (binding.action_type) {
      case 'run_agent': {
        const { runAgent } = await import('../agents/core/agent-runner.service');
        // Wave 4: attribute the run to the event-trigger so DNOC/DSOC can
        // filter event-driven runs separately from cron + user-driven ones.
        await runAgent(tenantId, binding.target_agent_id, {
          userId: `event-trigger:${binding.event_type}`,
          sessionId: `binding:${binding.binding_id}`,
        }).catch(catchHandler(EC.EVENT_BUS, {}));
        break;
      }
      case 'notify': {
        const { createNotification } = await import('../../../notification/services/notification.service');
        await createNotification(tenantId, {
          userId: 'owner',
          type: 'ai_trigger_fired',
          title: `[AI Trigger] ${binding.event_type}`,
          body: `Event trigger "${binding.binding_id}" fired for agent ${binding.target_agent_id}.`,
          link: '/ai-recommendation-inbox',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
        break;
      }
      case 'webhook': {
        const webhookUrl = binding.condition_json?.webhookUrl;
        if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('https://')) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, eventType: binding.event_type, agentId: binding.target_agent_id, payload }),
            signal: AbortSignal.timeout(10_000),
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }
        break;
      }
      case 'email': {
        const { createNotification } = await import('../../../notification/services/notification.service');
        await createNotification(tenantId, {
          userId: 'owner',
          type: 'ai_trigger_email',
          title: `[AI Email Trigger] ${binding.event_type}`,
          body: `Event "${binding.event_type}" triggered email action for agent ${binding.target_agent_id}.`,
          link: '/ai-event-triggers',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
        break;
      }
      case 'log':
      default:
        break;
    }
  } catch (err) {
    logger.warn(`[AI EventTrigger] executeBindingAction failed for ${binding.binding_id}/${binding.action_type}: ${(err as Error).message}`);
  }
}

function matchesCondition(condition: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(condition)) {
    const actual = (payload as any)[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      const e = expected as any;
      if (e.$eq !== undefined) {
        if (actual !== e.$eq) return false;
        continue;
      }
      if (Array.isArray(e.$in)) {
        if (!e.$in.includes(actual)) return false;
        continue;
      }
      if (e.$prefix !== undefined) {
        if (typeof actual !== 'string' || !actual.startsWith(String(e.$prefix))) return false;
        continue;
      }
      if (e.$contains !== undefined) {
        const needle = e.$contains;
        if (Array.isArray(actual)) {
          if (!actual.includes(needle)) return false;
        } else if (typeof actual === 'string') {
          if (!actual.includes(String(needle))) return false;
        } else {
          return false;
        }
        continue;
      }
    }
    if (actual !== expected) return false;
  }
  return true;
}

export async function listEventTriggerBindings(tenantId: string): Promise<EventTriggerBinding[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".event_trigger_binding WHERE tenant_id = $1 ORDER BY event_type`,
    [tenantId],
  );
  return result.rows;
}

export async function createEventTriggerBinding(
  tenantId: string,
  input: { eventType: string; targetAgentId: string; actionType?: string; conditionJson?: Record<string, unknown>; cooldownSeconds?: number; createdBy?: string },
): Promise<EventTriggerBinding | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".event_trigger_binding
       (tenant_id, event_type, target_agent_id, action_type, condition_json, cooldown_seconds, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [tenantId, input.eventType, input.targetAgentId, input.actionType || 'run_agent', JSON.stringify(input.conditionJson || {}), input.cooldownSeconds || 60, input.createdBy || SYSTEM_JOB_ACTOR],
  );
  return getFirstRow(result) || null;
}

export async function deleteEventTriggerBinding(tenantId: string, bindingId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".event_trigger_binding WHERE binding_id = $1 AND tenant_id = $2 RETURNING binding_id`,
    [bindingId, tenantId],
  );
  return (result.rows?.length || 0) > 0;
}

export async function toggleEventTriggerBinding(tenantId: string, bindingId: string, enabled: boolean): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".event_trigger_binding SET enabled = $3 WHERE binding_id = $1 AND tenant_id = $2 RETURNING binding_id`,
    [bindingId, tenantId, enabled],
  );
  return (result.rows?.length || 0) > 0;
}

export async function testFireBinding(tenantId: string, bindingId: string): Promise<{ fired: boolean; actionType: string }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".event_trigger_binding WHERE binding_id = $1 AND tenant_id = $2`,
    [bindingId, tenantId],
  );
  const binding = getFirstRow(result);
  if (!binding) return { fired: false, actionType: '' };

  await executeBindingAction(tenantId, binding, { _testFire: true });
  return { fired: true, actionType: binding.action_type };
}

export async function updateEventTriggerBinding(
  tenantId: string,
  bindingId: string,
  updates: { eventType?: string; targetAgentId?: string; actionType?: string; conditionJson?: Record<string, unknown>; cooldownSeconds?: number },
): Promise<EventTriggerBinding | null> {
  const schema = tenantSchema(tenantId);
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (updates.eventType !== undefined) { setClauses.push(`event_type = $${idx++}`); params.push(updates.eventType); }
  if (updates.targetAgentId !== undefined) { setClauses.push(`target_agent_id = $${idx++}`); params.push(updates.targetAgentId); }
  if (updates.actionType !== undefined) { setClauses.push(`action_type = $${idx++}`); params.push(updates.actionType); }
  if (updates.conditionJson !== undefined) { setClauses.push(`condition_json = $${idx++}`); params.push(JSON.stringify(updates.conditionJson)); }
  if (updates.cooldownSeconds !== undefined) { setClauses.push(`cooldown_seconds = $${idx++}`); params.push(updates.cooldownSeconds); }
  if (setClauses.length === 0) return null;
  params.push(bindingId, tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".event_trigger_binding SET ${setClauses.join(', ')} WHERE binding_id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    params,
  );
  return getFirstRow(result) || null;
}

export async function getTriggerFireLog(tenantId: string, hours: number = 24): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT signal_code, signal_value, context_json, recorded_at
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1 AND signal_code LIKE 'trigger.fired%' AND recorded_at > NOW() - ($2 || ' hours')::interval
       ORDER BY recorded_at DESC LIMIT 200`,
      [tenantId, hours],
    );
    return result.rows;
  } catch {
    return [];
  }
}

export function initEventTriggerListener(): void {
  eventBus.onAfterPublish('ai-event-trigger-dispatcher', async (event) => {
    if (!event.tenantId || event.tenantId === SYSTEM_TENANT) return;
    try {
      await processEventTriggers(event.tenantId, event.eventType, event.payload);
    } catch (err) {
      logger.warn(`[AI EventTrigger] afterPublish dispatch failed: ${(err as Error).message}`);
    }
  });

  const subscribedEventTypes = [
    'risk.exceeded_appetite',
    'control.failed',
    'evidence.expired',
    'incident.created',
    'compliance.gap_detected',
    'vendor.risk_changed',
    'policy.violated',
    'audit.finding_created',
    'training.compliance_gap',
    'onboarding.answers.saved',
    'onboarding.step.completed',
    'onboarding.session.approved',
    'onboarding.workspace_ready',
  ];

  for (const eventType of subscribedEventTypes) {
    eventBus.subscribe(eventType, `ai-event-trigger:subscribe:${eventType}`, async (event) => {
      if (!event.tenantId || event.tenantId === SYSTEM_TENANT) return;
      await processEventTriggers(event.tenantId, event.eventType, event.payload);
    });
  }

  logger.info('[AI EventTrigger] Event trigger listener initialized (afterPublish + subscribed events wired)');
}
