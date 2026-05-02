// AI workflow trigger — evaluates a context envelope against the
// governance AI trigger rules and (when matched) emits a workflow start
// event onto the canonical bus. Backed by:
//   - dos.ai_workflow_triggers   (rule definitions per module)
//   - dos.ai_workflow_trigger_log (per-trigger emission log)
// Replaces a missing source file that several governance bridges import.

import { safeQuery } from '@dos/db';
import { publishEvent } from '@dos/module-sdk';

export type TriggerModuleType =
  | 'risk' | 'compliance' | 'evidence' | 'audit' | 'incident'
  | 'vendor' | 'asset' | 'governance' | 'policy' | 'workflow' | string;

export interface TriggerEvaluationContext {
  tenantId: string;
  module: TriggerModuleType;
  entityType?: string;
  entityId?: string;
  signal?: string;
  payload?: Record<string, unknown>;
  initiatedBy?: string;
}

export interface TriggerEvaluationResult {
  triggered: boolean;
  matchedRules: string[];
  emittedEventIds: string[];
  reason?: string;
}

interface TriggerRow {
  trigger_id: string;
  module: string;
  signal: string | null;
  rule: Record<string, unknown> | null;
  workflow_code: string | null;
  enabled: boolean | null;
}

function ruleMatches(rule: Record<string, unknown> | null, ctx: TriggerEvaluationContext): boolean {
  if (!rule || Object.keys(rule).length === 0) return true;
  for (const [k, v] of Object.entries(rule)) {
    const val = (ctx.payload ?? {})[k];
    if (Array.isArray(v)) {
      if (!v.includes(val as never)) return false;
    } else if (typeof v === 'object' && v !== null && 'eq' in (v as Record<string, unknown>)) {
      if ((v as { eq: unknown }).eq !== val) return false;
    } else if (val !== v) {
      return false;
    }
  }
  return true;
}

export async function evaluateAndTrigger(ctx: TriggerEvaluationContext): Promise<TriggerEvaluationResult> {
  let triggers: TriggerRow[] = [];
  try {
    const r = await safeQuery(
      `SELECT trigger_id, module, signal, rule, workflow_code, enabled
         FROM dos.ai_workflow_triggers
        WHERE tenant_id = $1 AND module = $2 AND enabled = TRUE
          AND (signal IS NULL OR signal = $3)`,
      [ctx.tenantId, ctx.module, ctx.signal ?? null],
    );
    triggers = (r.rows as TriggerRow[]) ?? [];
  } catch {
    triggers = [];
  }

  const matched = triggers.filter((t) => ruleMatches(t.rule, ctx));
  const emittedEventIds: string[] = [];
  for (const trig of matched) {
    if (!trig.workflow_code) continue;
    try {
      await publishEvent({
        tenantId: ctx.tenantId,
        module: 'governance',
        event: 'ai.workflow.trigger',
        entityType: ctx.entityType ?? 'ai-trigger',
        entityId: ctx.entityId ?? trig.trigger_id,
        payload: {
          triggerId: trig.trigger_id,
          workflowCode: trig.workflow_code,
          signal: ctx.signal,
          initiatedBy: ctx.initiatedBy ?? 'governance.ai',
          ctx: ctx.payload ?? {},
        },
      } as unknown as Parameters<typeof publishEvent>[0]);
      emittedEventIds.push(trig.trigger_id);
      try {
        await safeQuery(
          `INSERT INTO dos.ai_workflow_trigger_log
             (tenant_id, trigger_id, module, signal, payload, emitted_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
          [ctx.tenantId, trig.trigger_id, ctx.module, ctx.signal ?? null, JSON.stringify(ctx.payload ?? {})],
        );
      } catch {
        // log table absent — emission still happened
      }
    } catch {
      // event-bus unavailable — leave event unEmitted; caller can retry
    }
  }

  return {
    triggered: emittedEventIds.length > 0,
    matchedRules: matched.map((t) => t.trigger_id),
    emittedEventIds,
    reason: matched.length === 0 ? 'no rules matched' : undefined,
  };
}

export async function listTriggers(tenantId: string, module?: TriggerModuleType): Promise<TriggerRow[]> {
  try {
    const r = await safeQuery(
      module
        ? `SELECT * FROM dos.ai_workflow_triggers WHERE tenant_id = $1 AND module = $2 ORDER BY module, signal`
        : `SELECT * FROM dos.ai_workflow_triggers WHERE tenant_id = $1 ORDER BY module, signal`,
      module ? [tenantId, module] : [tenantId],
    );
    return (r.rows as TriggerRow[]) ?? [];
  } catch {
    return [];
  }
}
