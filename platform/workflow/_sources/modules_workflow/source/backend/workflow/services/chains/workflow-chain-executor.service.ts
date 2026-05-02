import { v4 as uuid } from 'uuid';
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { eventBus, emitEvent as _emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { logger as _logger } from '../../ports/logger.port';
import { getFirstRow } from '@dos/db';
import { normalizeChainStepsForExecutor, normalizeSodRulesForExecutor } from '../../utils/workflow-chain-step-normalize';
import { swallow, EC } from '@dos/platform-core/resilience';
import {
  startChain as coreStartChain,
  advanceChainStep as coreAdvanceChainStep,
} from './chain-core';

export interface ChainDefinition {
  chain_code: string;
  name_en: string;
  name_ar: string | null;
  steps: ChainStep[];
  sod_rules: SodRule[];
  is_active: boolean;
}

export interface ChainStep {
  step_no: number;
  module_code: string;
  task_type: string;
  name_en: string;
  name_ar?: string;
  sla_hours?: number;
  auto_advance?: boolean;
  conditions?: Record<string, unknown>;
}

export interface SodRule {
  step_a: number;
  step_b: number;
  rule: 'different_user' | 'different_role' | 'different_department';
}

export interface ChainInstance {
  instance_id: string;
  chain_code: string;
  tenant_id: string;
  current_step: number;
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  context: Record<string, unknown>;
  trigger_entity_type: string | null;
  trigger_entity_id: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ChainStepLog {
  log_id: string;
  instance_id: string;
  step_no: number;
  module_code: string;
  task_type: string | null;
  task_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  actor_user_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface StartChainResult {
  instanceId: string;
  chainCode: string;
  currentStep: number;
  status: string;
}

export interface AdvanceChainResult {
  instanceId: string;
  previousStep: number;
  nextStep: number | null;
  chainComplete: boolean;
  status: string;
}

export async function getChainDefinitions(tenantId: string): Promise<ChainDefinition[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_definitions WHERE is_active = TRUE ORDER BY chain_code`,
  );
  return result.rows.map(mapChainDef);
}

export async function getChainDefinition(tenantId: string, chainCode: string): Promise<ChainDefinition | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_definitions WHERE chain_code = $1`,
    [chainCode],
  );
  return result.rows.length ? mapChainDef(getFirstRow(result)) : null;
}

export async function upsertChainDefinition(
  tenantId: string,
  def: { chain_code: string; name_en: string; name_ar?: string; steps: ChainStep[]; sod_rules?: SodRule[] },
): Promise<ChainDefinition> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_chain_definitions (chain_code, name_en, name_ar, steps, sod_rules)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (chain_code) DO UPDATE SET
       name_en = EXCLUDED.name_en,
       name_ar = COALESCE(EXCLUDED.name_ar, workflow_chain_definitions.name_ar),
       steps = EXCLUDED.steps,
       sod_rules = EXCLUDED.sod_rules,
       updated_at = NOW()
     RETURNING *`,
    [def.chain_code, def.name_en, def.name_ar ?? null, JSON.stringify(def.steps), JSON.stringify(def.sod_rules ?? [])],
  );
  return mapChainDef(getFirstRow(result));
}

export async function startChain(
  tenantId: string,
  chainCode: string,
  opts: {
    triggerEntityType?: string;
    triggerEntityId?: string;
    context?: Record<string, unknown>;
    createdBy?: string;
  } = {},
): Promise<StartChainResult> {
  const triggerEntityType = opts.triggerEntityType ?? 'manual';
  const triggerEntityId = opts.triggerEntityId ?? uuid();
  const context = opts.context ?? {};

  const result = await coreStartChain(
    tenantId,
    chainCode,
    triggerEntityType,
    triggerEntityId,
    context,
    opts.createdBy,
  );
  if (!result) {
    throw new Error('Failed to start chain');
  }
  return {
    instanceId: result.instanceId,
    chainCode: result.chainCode,
    currentStep: result.currentStep,
    status: result.status,
  };
}

export async function advanceChain(
  tenantId: string,
  instanceId: string,
  opts: {
    outcome?: string;
    actorUserId?: string;
    notes?: string;
    outcomeData?: Record<string, unknown>;
  } = {},
): Promise<AdvanceChainResult> {
  const schema = tenantSchema(tenantId);
  const instance = await getChainInstance(tenantId, instanceId);
  if (!instance) {
    throw new Error('Chain instance not found');
  }

  const previousStep = Number(instance.current_step || 0);
  const completionNotes = [
    opts.outcome ? `outcome=${opts.outcome}` : null,
    opts.notes ?? null,
  ].filter(Boolean).join(' | ') || null;

  await safeQuery(
    `UPDATE "${schema}".workflow_chain_step_log
     SET status = 'completed', completed_at = NOW(), notes = COALESCE($3, notes)
     WHERE instance_id = $1 AND step_no = $2 AND status IN ('pending', 'in_progress')`,
    [instanceId, previousStep, completionNotes],
  );

  const def = await getChainDefinition(tenantId, instance.chain_code);
  const maxStep = def?.steps?.length ? Math.max(...def.steps.map(s => s.step_no)) : previousStep;
  const nextStep = previousStep + 1 <= maxStep ? previousStep + 1 : null;

  if (!nextStep) {
    await safeQuery(
      `UPDATE "${schema}".workflow_chain_instances
       SET status = 'completed', completed_at = NOW()
       WHERE instance_id = $1`,
      [instanceId],
    );
    return { instanceId, previousStep, nextStep: null, chainComplete: true, status: 'completed' };
  }

  await safeQuery(
    `UPDATE "${schema}".workflow_chain_instances
     SET current_step = $2, status = 'active'
     WHERE instance_id = $1`,
    [instanceId, nextStep],
  );

  return { instanceId, previousStep, nextStep, chainComplete: false, status: 'active' };
}

export async function cancelChain(
  tenantId: string,
  instanceId: string,
  reason?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(
      `UPDATE "${schema}".workflow_chain_instances SET status = 'cancelled', completed_at = NOW() WHERE instance_id = $1`,
      [instanceId], client,
    );
    await safeQueryWithClient(
      `UPDATE "${schema}".workflow_chain_step_log SET status = 'skipped', completed_at = NOW(), notes = $1 WHERE instance_id = $2 AND status IN ('pending', 'in_progress')`,
      [reason ?? 'Chain cancelled', instanceId], client,
    );
  });
}

export async function failChainStep(
  tenantId: string,
  instanceId: string,
  stepNo: number,
  reason: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(
      `UPDATE "${schema}".workflow_chain_step_log SET status = 'failed', completed_at = NOW(), notes = $1 WHERE instance_id = $2 AND step_no = $3`,
      [reason, instanceId, stepNo], client,
    );
    await safeQueryWithClient(
      `UPDATE "${schema}".workflow_chain_instances SET status = 'failed', completed_at = NOW() WHERE instance_id = $1`,
      [instanceId], client,
    );
  });
}

export async function getChainInstance(tenantId: string, instanceId: string): Promise<ChainInstance | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_instances WHERE instance_id = $1`,
    [instanceId],
  );
  return getFirstRow(result) ?? null;
}

export async function getChainInstances(
  tenantId: string,
  filters?: { chainCode?: string; status?: string; moduleCode?: string },
): Promise<ChainInstance[]> {
  const schema = tenantSchema(tenantId);
  const moduleCode = filters?.moduleCode?.trim();
  if (moduleCode) {
    const conditions = ['wci.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;
    if (filters?.chainCode) { conditions.push(`wci.chain_code = $${idx++}`); params.push(filters.chainCode); }
    if (filters?.status) { conditions.push(`wci.status = $${idx++}`); params.push(filters.status); }
    params.push(moduleCode);
    const modIdx = idx;
    const result = await safeQuery(
      `SELECT wci.* FROM "${schema}".workflow_chain_instances wci
       WHERE ${conditions.join(' AND ')}
       AND EXISTS (
         SELECT 1 FROM "${schema}".workflow_chain_step_log l
         WHERE l.instance_id = wci.instance_id AND l.module_code = $${modIdx}
       )
       ORDER BY wci.started_at DESC`,
      params,
    );
    return result.rows;
  }
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (filters?.chainCode) { conditions.push(`chain_code = $${idx++}`); params.push(filters.chainCode); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_instances WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC`,
    params,
  );
  return result.rows;
}

export async function getChainStepLog(tenantId: string, instanceId: string): Promise<ChainStepLog[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_chain_step_log WHERE instance_id = $1 ORDER BY step_no ASC`,
    [instanceId],
  );
  return result.rows;
}

async function validateSodRules(
  schema: string,
  instanceId: string,
  sodRules: SodRule[],
  nextStepNo: number,
  actorUserId: string,
): Promise<void> {
  for (const rule of sodRules) {
    if (rule.step_b !== nextStepNo) continue;
    const prevLog = await safeQuery(
      `SELECT actor_user_id FROM "${schema}".workflow_chain_step_log WHERE instance_id = $1 AND step_no = $2 AND status = 'completed'`,
      [instanceId, rule.step_a],
    );
    if (!prevLog.rows.length) continue;
    const prevActor = getFirstRow(prevLog)?.actor_user_id;
    if (!prevActor) continue;
    if (rule.rule === 'different_user' && prevActor === actorUserId) {
      throw new Error(`SoD violation: Step ${rule.step_a} and step ${rule.step_b} must be performed by different users`);
    }
  }
}

function mapChainDef(row: Record<string, unknown>): ChainDefinition {
  const rawSteps = Array.isArray(row.steps) ? row.steps : typeof row.steps === 'string' ? JSON.parse(row.steps || '[]') : [];
  const rawSod = Array.isArray(row.sod_rules) ? row.sod_rules : typeof row.sod_rules === 'string' ? JSON.parse(row.sod_rules || '[]') : [];
  return {

    chain_code: row.chain_code,

    name_en: row.name_en,

    name_ar: row.name_ar,
    steps: normalizeChainStepsForExecutor(rawSteps),
    sod_rules: normalizeSodRulesForExecutor(rawSod),

    is_active: row.is_active,
  };
}
