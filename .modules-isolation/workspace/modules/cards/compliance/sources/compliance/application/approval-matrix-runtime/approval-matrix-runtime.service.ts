/**
 * Approval-Matrix Runtime service (W64) — given an entity-action pair and
 * payload context, looks up applicable rules in
 * `<tenant_schema>.approval_matrix` and produces a deterministic, ordered
 * approver chain that is persisted to `<tenant_schema>.approval_decisions`.
 *
 * Outcome enum:
 *   auto_approved        — no matching rules; record is open by default
 *   pending              — chain has ≥1 step; first step waiting
 *   not_required         — explicit `none` rule matched (skip chain)
 */
import type { DbClient } from '../../db/runner';

export type ApprovalOutcome = 'auto_approved' | 'pending' | 'not_required';
const OUTCOMES: ReadonlyArray<ApprovalOutcome> = ['auto_approved', 'pending', 'not_required'];

export interface ApprovalChainStep {
  ordinal: number;
  approverRole: string;
  ruleId: string;
  thresholdMet: boolean;
}

export interface ApprovalDecisionRow {
  decisionId: string;
  entityType: string;
  entityId: string;
  action: string;
  outcome: ApprovalOutcome;
  chain: ApprovalChainStep[];
  context: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface ResolveInput {
  tenantSchema: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface ListDecisionsInput {
  tenantSchema: string;
  entityType?: string;
  entityId?: string;
  outcome?: ApprovalOutcome;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `decision_id, entity_type, entity_id, action, outcome,
              chain, context, created_at, created_by`;

const mapRow = (x: {
  decision_id: string; entity_type: string; entity_id: string; action: string;
  outcome: string;
  chain: ApprovalChainStep[] | null;
  context: Record<string, unknown> | null;
  created_at: string; created_by: string;
}): ApprovalDecisionRow => ({
  decisionId: x.decision_id, entityType: x.entity_type,
  entityId: x.entity_id, action: x.action,
  outcome: x.outcome as ApprovalOutcome,
  chain: x.chain ?? [], context: x.context ?? {},
  createdAt: x.created_at, createdBy: x.created_by,
});

interface MatrixRule {
  rule_id: string;
  approver_role: string;
  rule_kind: 'required' | 'optional' | 'none';
  threshold_field: string | null;
  threshold_min: number | null;
  ordinal: number;
}

function matchesThreshold(
  rule: MatrixRule,
  context: Record<string, unknown>,
): boolean {
  if (!rule.threshold_field || rule.threshold_min === null) return true;
  const raw = context[rule.threshold_field];
  if (raw === undefined || raw === null) return false;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return false;
  return n >= rule.threshold_min;
}

export function buildChain(
  rules: MatrixRule[],
  context: Record<string, unknown>,
): { chain: ApprovalChainStep[]; outcome: ApprovalOutcome } {
  if (rules.some((r) => r.rule_kind === 'none')) {
    return { chain: [], outcome: 'not_required' };
  }
  const ordered = rules
    .filter((r) => r.rule_kind === 'required' || r.rule_kind === 'optional')
    .filter((r) => matchesThreshold(r, context))
    .sort((a, b) => a.ordinal - b.ordinal);
  if (ordered.length === 0) {
    return { chain: [], outcome: 'auto_approved' };
  }
  const chain: ApprovalChainStep[] = ordered.map((r) => ({
    ordinal: r.ordinal,
    approverRole: r.approver_role,
    ruleId: r.rule_id,
    thresholdMet: true,
  }));
  return { chain, outcome: 'pending' };
}

export async function listDecisions(
  client: DbClient,
  input: ListDecisionsInput,
): Promise<{ rows: ApprovalDecisionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.entityId) { params.push(input.entityId); where += ` AND entity_id = $${params.length}`; }
  if (input.outcome) { params.push(input.outcome); where += ` AND outcome = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".approval_decisions
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".approval_decisions WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getDecision(
  client: DbClient,
  input: { tenantSchema: string; decisionId: string },
): Promise<ApprovalDecisionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".approval_decisions
     WHERE decision_id = $1`,
    [input.decisionId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function resolveApprovalChain(
  client: DbClient,
  input: ResolveInput,
): Promise<ApprovalDecisionRow> {
  assertSchema(input.tenantSchema);
  if (!input.entityType || !input.entityId || !input.action) {
    throw Object.assign(
      new Error('entityType, entityId, action required'), { code: 'bad_input' },
    );
  }
  const rulesR = await client.query<MatrixRule>(
    `SELECT rule_id, approver_role, rule_kind, threshold_field, threshold_min, ordinal
       FROM "${input.tenantSchema}".approval_matrix
      WHERE entity_type = $1 AND action = $2`,
    [input.entityType, input.action],
  );
  const { chain, outcome } = buildChain(rulesR.rows, input.context ?? {});
  if (!OUTCOMES.includes(outcome)) {
    throw Object.assign(new Error(`bad outcome: ${outcome}`), { code: 'bad_outcome' });
  }
  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".approval_decisions
       (entity_type, entity_id, action, outcome, chain, context, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
     RETURNING ${COLS}`,
    [
      input.entityType, input.entityId, input.action, outcome,
      JSON.stringify(chain), JSON.stringify(input.context ?? {}),
      input.actorId,
    ],
  );
  return mapRow(ins.rows[0] as never);
}
