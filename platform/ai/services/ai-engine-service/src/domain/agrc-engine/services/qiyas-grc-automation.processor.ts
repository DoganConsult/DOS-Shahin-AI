import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';

// Tenant push/active-tenant helpers are not exposed by the AI-engine events port.
// Provide local no-op fallbacks so callers compile and degrade safely until the
// canonical websocket fan-out and tenant-registry helpers are wired through.
const pushToTenant = (_tenantId: string, _event: unknown): void => { /* no-op */ };
const buildWSEvent = (eventType: string, payload: Record<string, unknown>): { type: string; payload: Record<string, unknown> } => ({ type: eventType, payload });
const getActiveTenantIds = (): string[] => [];
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience/resilient-catch';

export interface TriggerRow {
  trigger_log_id: string;
  tenant_schema: string;
  trigger_type: string;
  source_entity_id: string;
  source_entity_type: string;
  payload: Record<string, unknown>;
}

const RULES: Record<string, (schema: string, trigger: TriggerRow) => Promise<void>> = {
  control_test_fail: async (schema, trigger) => {
    const payload = typeof trigger.payload === 'string' ? JSON.parse(trigger.payload) : trigger.payload;
    await safeQuery(
      `INSERT INTO "${schema}".qiyas_auto_tasks
       (task_type, source_trigger_id, entity_id, entity_type, priority, status, created_at)
       VALUES ('remediation_review', $1, $2, 'control', 'high', 'pending', NOW())
       ON CONFLICT DO NOTHING`,
      [trigger.trigger_log_id, payload?.controlId || trigger.source_entity_id]
    ).catch(catchHandler(EC.AGENT_ACTION, {}));
  },

  assessment_finalized: async (schema, trigger) => {
    const payload = typeof trigger.payload === 'string' ? JSON.parse(trigger.payload) : trigger.payload;
    const maturityLevel = payload?.maturityLevel || 'Initial';
    await safeQuery(
      `UPDATE "${schema}".grc_maturity_sync
       SET sync_status = 'processed', maturity_level = $1, synced_at = NOW()
       WHERE assessment_id = $2`,
      [maturityLevel, trigger.source_entity_id]
    ).catch(catchHandler(EC.AGENT_ACTION, {}));
  },

  risk_threshold_breach: async (schema, trigger) => {
    const payload = typeof trigger.payload === 'string' ? JSON.parse(trigger.payload) : trigger.payload;
    await safeQuery(
      `INSERT INTO "${schema}".qiyas_auto_tasks
       (task_type, source_trigger_id, entity_id, entity_type, priority, status, created_at)
       VALUES ('risk_assessment_required', $1, $2, 'risk', 'critical', 'pending', NOW())
       ON CONFLICT DO NOTHING`,
      [trigger.trigger_log_id, payload?.riskId || trigger.source_entity_id]
    ).catch(catchHandler(EC.AGENT_ACTION, {}));
  },

  policy_expired: async (schema, trigger) => {
    await safeQuery(
      `INSERT INTO "${schema}".qiyas_auto_tasks
       (task_type, source_trigger_id, entity_id, entity_type, priority, status, created_at)
       VALUES ('policy_review', $1, $2, 'policy', 'medium', 'pending', NOW())
       ON CONFLICT DO NOTHING`,
      [trigger.trigger_log_id, trigger.source_entity_id]
    ).catch(catchHandler(EC.AGENT_ACTION, {}));
  },

  evidence_missing: async (schema, trigger) => {
    await safeQuery(
      `INSERT INTO "${schema}".qiyas_auto_tasks
       (task_type, source_trigger_id, entity_id, entity_type, priority, status, created_at)
       VALUES ('evidence_collection', $1, $2, 'evidence', 'high', 'pending', NOW())
       ON CONFLICT DO NOTHING`,
      [trigger.trigger_log_id, trigger.source_entity_id]
    ).catch(catchHandler(EC.AGENT_ACTION, {}));
  },
};

export async function processPendingTriggers(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const pending = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT trigger_log_id, '${schema}' AS tenant_schema, trigger_type, source_entity_id, source_entity_type, payload
     FROM "${schema}".qiyas_grc_trigger_log
     WHERE status = 'pending'
     ORDER BY created_at
     LIMIT 50`,
    []
  ), { tenantId: tenantId, operation: 'query qiyas_grc_trigger_log' });

  let processed = 0;
  for (const row of pending.rows) {
    try {
      const handler = RULES[(row as any).trigger_type];
      if (handler) {

        await handler(schema, row as unknown as TriggerRow);
      }
      await safeQuery(
        `UPDATE "${schema}".qiyas_grc_trigger_log
         SET status = 'processed', processed_at = NOW() WHERE trigger_log_id = $1`,
        [row.trigger_log_id]
      ).catch(catchHandler(EC.AGENT_ACTION, {}));
      processed++;
    } catch {
      await safeQuery(
        `UPDATE "${schema}".qiyas_grc_trigger_log
         SET status = 'failed', processed_at = NOW() WHERE trigger_log_id = $1`,
        [row.trigger_log_id]
      ).catch(catchHandler(EC.AGENT_ACTION, {}));
    }
  }

  if (processed > 0) {
    pushToTenant(tenantId, buildWSEvent('dashboard_widget_updated' as string, {
      widget: 'qiyas_grc_automation',
      processedCount: processed,
    }));
  }

  return processed;
}

export async function processAllTenantTriggers(): Promise<void> {
  const tenantIds = getActiveTenantIds();
  for (const tenantId of tenantIds) {
    await processPendingTriggers(tenantId).catch(catchHandler(EC.AGENT_ACTION, {}));
  }
}
