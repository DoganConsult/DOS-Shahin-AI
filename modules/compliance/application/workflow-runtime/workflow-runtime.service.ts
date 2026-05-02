/**
 * Workflow-Runtime (W70) — declarative state-machine engine over per-tenant
 * tables `<tenant>.workflow_definitions` (JSONB definition: states, initial,
 * transitions[]) and `<tenant>.workflow_instances` (current state + entity
 * binding + history). Transitions are journaled to
 * `<tenant>.workflow_transitions` for audit replay.
 *
 * Definition shape (JSONB):
 *   {
 *     initial: 'draft',
 *     states: ['draft','submitted','approved','rejected'],
 *     transitions: [
 *       { from: 'draft', event: 'submit', to: 'submitted',
 *         requiresPermission?: 'compliance.submit' },
 *       ...
 *     ]
 *   }
 *
 * Status enum: active | terminated
 * Trigger result: applied | rejected
 *
 * Tenant-safe (regex-guarded schema). Pure deterministic logic — no global
 * scheduling. Hosts may compose with W60 outbox to publish events on
 * transitions.
 */
import type { DbClient } from '../../db/runner';

export type WorkflowStatus = 'active' | 'terminated';
const STATUSES: ReadonlyArray<WorkflowStatus> = ['active', 'terminated'];

export interface WorkflowTransitionRule {
  from: string;
  event: string;
  to: string;
  /** Optional permission key the actor must hold (caller-validated). */
  requiresPermission?: string;
}

export interface WorkflowDefinition {
  initial: string;
  states: string[];
  transitions: WorkflowTransitionRule[];
}

export interface WorkflowDefinitionRow {
  definitionId: string;
  workflowCode: string;
  version: number;
  definition: WorkflowDefinition;
  createdAt: string;
  createdBy: string;
}

export interface WorkflowInstanceRow {
  instanceId: string;
  workflowCode: string;
  definitionId: string;
  entityType: string;
  entityId: string;
  currentState: string;
  status: WorkflowStatus;
  context: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface WorkflowTransitionRow {
  transitionId: string;
  instanceId: string;
  fromState: string;
  toState: string;
  event: string;
  appliedAt: string;
  appliedBy: string;
  context: Record<string, unknown>;
}

export interface CreateDefinitionInput {
  tenantSchema: string;
  actorId: string;
  workflowCode: string;
  version?: number;
  definition: WorkflowDefinition;
}

export interface StartInstanceInput {
  tenantSchema: string;
  actorId: string;
  workflowCode: string;
  entityType: string;
  entityId: string;
  context?: Record<string, unknown>;
}

export interface TriggerEventInput {
  tenantSchema: string;
  actorId: string;
  instanceId: string;
  event: string;
  context?: Record<string, unknown>;
  /** Optional caller-supplied permissions held by actor. */
  permissions?: string[];
}

export interface ListDefinitionsInput {
  tenantSchema: string;
  workflowCode?: string;
  limit?: number;
}

export interface ListInstancesInput {
  tenantSchema: string;
  workflowCode?: string;
  entityType?: string;
  entityId?: string;
  status?: WorkflowStatus;
  currentState?: string;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

function validateDefinition(d: WorkflowDefinition): void {
  if (!d || typeof d !== 'object') {
    throw Object.assign(new Error('definition required'), { code: 'bad_input' });
  }
  if (!d.initial || !Array.isArray(d.states) || d.states.length === 0) {
    throw Object.assign(new Error('definition.initial and states[] required'), { code: 'bad_input' });
  }
  if (!d.states.includes(d.initial)) {
    throw Object.assign(new Error('initial state not in states[]'), { code: 'bad_definition' });
  }
  if (!Array.isArray(d.transitions)) {
    throw Object.assign(new Error('definition.transitions[] required'), { code: 'bad_input' });
  }
  for (const t of d.transitions) {
    if (!t.from || !t.to || !t.event) {
      throw Object.assign(new Error('transition.from/to/event required'), { code: 'bad_definition' });
    }
    if (!d.states.includes(t.from) || !d.states.includes(t.to)) {
      throw Object.assign(
        new Error(`transition references unknown state (${t.from}→${t.to})`),
        { code: 'bad_definition' },
      );
    }
  }
}

const DEF_COLS = `definition_id, workflow_code, version, definition,
                  created_at, created_by`;
const INST_COLS = `instance_id, workflow_code, definition_id, entity_type,
                   entity_id, current_state, status, context,
                   created_at, created_by, updated_at`;
const TRN_COLS = `transition_id, instance_id, from_state, to_state, event,
                  applied_at, applied_by, context`;

const mapDef = (x: {
  definition_id: string; workflow_code: string;
  version: string | number;
  definition: WorkflowDefinition | null;
  created_at: string; created_by: string;
}): WorkflowDefinitionRow => ({
  definitionId: x.definition_id, workflowCode: x.workflow_code,
  version: Number(x.version),
  definition: x.definition ?? { initial: '', states: [], transitions: [] },
  createdAt: x.created_at, createdBy: x.created_by,
});

const mapInst = (x: {
  instance_id: string; workflow_code: string; definition_id: string;
  entity_type: string; entity_id: string; current_state: string;
  status: string; context: Record<string, unknown> | null;
  created_at: string; created_by: string; updated_at: string;
}): WorkflowInstanceRow => ({
  instanceId: x.instance_id, workflowCode: x.workflow_code,
  definitionId: x.definition_id, entityType: x.entity_type,
  entityId: x.entity_id, currentState: x.current_state,
  status: x.status as WorkflowStatus, context: x.context ?? {},
  createdAt: x.created_at, createdBy: x.created_by, updatedAt: x.updated_at,
});

const mapTrn = (x: {
  transition_id: string; instance_id: string;
  from_state: string; to_state: string; event: string;
  applied_at: string; applied_by: string;
  context: Record<string, unknown> | null;
}): WorkflowTransitionRow => ({
  transitionId: x.transition_id, instanceId: x.instance_id,
  fromState: x.from_state, toState: x.to_state, event: x.event,
  appliedAt: x.applied_at, appliedBy: x.applied_by,
  context: x.context ?? {},
});

export function findTransition(
  def: WorkflowDefinition, fromState: string, event: string,
): WorkflowTransitionRule | null {
  return def.transitions.find((t) => t.from === fromState && t.event === event) ?? null;
}

export async function createDefinition(
  client: DbClient, input: CreateDefinitionInput,
): Promise<WorkflowDefinitionRow> {
  assertSchema(input.tenantSchema);
  if (!input.workflowCode) {
    throw Object.assign(new Error('workflowCode required'), { code: 'bad_input' });
  }
  validateDefinition(input.definition);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".workflow_definitions
       (workflow_code, version, definition, created_by)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING ${DEF_COLS}`,
    [
      input.workflowCode, input.version ?? 1,
      JSON.stringify(input.definition), input.actorId,
    ],
  );
  return mapDef(r.rows[0] as never);
}

export async function getDefinition(
  client: DbClient,
  input: { tenantSchema: string; workflowCode: string; version?: number },
): Promise<WorkflowDefinitionRow | null> {
  assertSchema(input.tenantSchema);
  const params: unknown[] = [input.workflowCode];
  let where = `workflow_code = $1`;
  if (input.version !== undefined) {
    params.push(input.version);
    where += ` AND version = $${params.length}`;
  }
  const r = await client.query(
    `SELECT ${DEF_COLS} FROM "${input.tenantSchema}".workflow_definitions
      WHERE ${where} ORDER BY version DESC LIMIT 1`,
    params,
  );
  return r.rowCount === 0 ? null : mapDef(r.rows[0] as never);
}

export async function listDefinitions(
  client: DbClient, input: ListDefinitionsInput,
): Promise<{ rows: WorkflowDefinitionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.workflowCode) {
    params.push(input.workflowCode);
    where += ` AND workflow_code = $${params.length}`;
  }
  const r = await client.query(
    `SELECT ${DEF_COLS} FROM "${input.tenantSchema}".workflow_definitions
      WHERE ${where} ORDER BY workflow_code, version DESC LIMIT ${limit}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".workflow_definitions WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapDef as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function startInstance(
  client: DbClient, input: StartInstanceInput,
): Promise<WorkflowInstanceRow> {
  assertSchema(input.tenantSchema);
  if (!input.workflowCode || !input.entityType || !input.entityId) {
    throw Object.assign(
      new Error('workflowCode, entityType, entityId required'),
      { code: 'bad_input' },
    );
  }
  const def = await getDefinition(client, {
    tenantSchema: input.tenantSchema, workflowCode: input.workflowCode,
  });
  if (!def) {
    throw Object.assign(
      new Error(`workflow definition ${input.workflowCode} not found`),
      { code: 'not_found' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".workflow_instances
       (workflow_code, definition_id, entity_type, entity_id,
        current_state, status, context, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6::jsonb, $7, NOW())
     RETURNING ${INST_COLS}`,
    [
      input.workflowCode, def.definitionId, input.entityType, input.entityId,
      def.definition.initial, JSON.stringify(input.context ?? {}),
      input.actorId,
    ],
  );
  return mapInst(r.rows[0] as never);
}

export async function getInstance(
  client: DbClient,
  input: { tenantSchema: string; instanceId: string },
): Promise<WorkflowInstanceRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${INST_COLS} FROM "${input.tenantSchema}".workflow_instances
      WHERE instance_id = $1`,
    [input.instanceId],
  );
  return r.rowCount === 0 ? null : mapInst(r.rows[0] as never);
}

export async function listInstances(
  client: DbClient, input: ListInstancesInput,
): Promise<{ rows: WorkflowInstanceRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.workflowCode) { params.push(input.workflowCode); where += ` AND workflow_code = $${params.length}`; }
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.currentState) { params.push(input.currentState); where += ` AND current_state = $${params.length}`; }
  const r = await client.query(
    `SELECT ${INST_COLS} FROM "${input.tenantSchema}".workflow_instances
      WHERE ${where} ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".workflow_instances WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapInst as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function listTransitions(
  client: DbClient,
  input: { tenantSchema: string; instanceId: string; limit?: number },
): Promise<{ rows: WorkflowTransitionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
  const r = await client.query(
    `SELECT ${TRN_COLS} FROM "${input.tenantSchema}".workflow_transitions
      WHERE instance_id = $1 ORDER BY applied_at ASC LIMIT ${limit}`,
    [input.instanceId],
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".workflow_transitions
      WHERE instance_id = $1`,
    [input.instanceId],
  );
  return { rows: r.rows.map(mapTrn as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export interface TriggerResult {
  instance: WorkflowInstanceRow;
  transition: WorkflowTransitionRow;
}

export async function triggerEvent(
  client: DbClient, input: TriggerEventInput,
): Promise<TriggerResult> {
  assertSchema(input.tenantSchema);
  if (!input.event) {
    throw Object.assign(new Error('event required'), { code: 'bad_input' });
  }
  const inst = await getInstance(client, {
    tenantSchema: input.tenantSchema, instanceId: input.instanceId,
  });
  if (!inst) {
    throw Object.assign(
      new Error(`instance ${input.instanceId} not found`),
      { code: 'not_found' },
    );
  }
  if (inst.status !== 'active') {
    throw Object.assign(
      new Error(`instance ${input.instanceId} is ${inst.status}, cannot trigger`),
      { code: 'bad_state' },
    );
  }
  const def = await client.query(
    `SELECT ${DEF_COLS} FROM "${input.tenantSchema}".workflow_definitions
      WHERE definition_id = $1`,
    [inst.definitionId],
  );
  if (def.rowCount === 0) {
    throw Object.assign(
      new Error(`definition ${inst.definitionId} not found`),
      { code: 'not_found' },
    );
  }
  const definition = mapDef(def.rows[0] as never).definition;
  const rule = findTransition(definition, inst.currentState, input.event);
  if (!rule) {
    throw Object.assign(
      new Error(`no transition for event '${input.event}' from '${inst.currentState}'`),
      { code: 'no_transition' },
    );
  }
  if (rule.requiresPermission) {
    const held = input.permissions ?? [];
    if (!held.includes(rule.requiresPermission)) {
      throw Object.assign(
        new Error(`missing permission: ${rule.requiresPermission}`),
        { code: 'forbidden' },
      );
    }
  }
  const upd = await client.query(
    `UPDATE "${input.tenantSchema}".workflow_instances
        SET current_state = $2, updated_at = NOW(),
            context = COALESCE(context,'{}'::jsonb) || $3::jsonb
      WHERE instance_id = $1
      RETURNING ${INST_COLS}`,
    [input.instanceId, rule.to, JSON.stringify(input.context ?? {})],
  );
  const instance = mapInst(upd.rows[0] as never);
  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".workflow_transitions
       (instance_id, from_state, to_state, event, applied_by, context)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING ${TRN_COLS}`,
    [input.instanceId, inst.currentState, rule.to, input.event,
     input.actorId, JSON.stringify(input.context ?? {})],
  );
  const transition = mapTrn(ins.rows[0] as never);
  if (!STATUSES.includes(instance.status)) {
    throw Object.assign(new Error('bad status'), { code: 'bad_status' });
  }
  return { instance, transition };
}

export async function terminateInstance(
  client: DbClient,
  input: { tenantSchema: string; actorId: string; instanceId: string },
): Promise<WorkflowInstanceRow> {
  assertSchema(input.tenantSchema);
  const inst = await getInstance(client, {
    tenantSchema: input.tenantSchema, instanceId: input.instanceId,
  });
  if (!inst) {
    throw Object.assign(
      new Error(`instance ${input.instanceId} not found`),
      { code: 'not_found' },
    );
  }
  if (inst.status === 'terminated') return inst;
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".workflow_instances
        SET status = 'terminated', updated_at = NOW()
      WHERE instance_id = $1
      RETURNING ${INST_COLS}`,
    [input.instanceId],
  );
  return mapInst(r.rows[0] as never);
}

export const WORKFLOW_STATUSES = STATUSES;
