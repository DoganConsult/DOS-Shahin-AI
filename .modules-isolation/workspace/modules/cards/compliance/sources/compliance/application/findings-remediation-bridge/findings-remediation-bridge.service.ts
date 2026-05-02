/**
 * Findings → Remediation Bridge service (W62) — converts an open compliance
 * finding into a tracked remediation action row in
 * `<tenant_schema>.remediation_actions`, atomically transitioning the source
 * finding to `in_remediation` when applicable.
 *
 * Status enum: open|in_progress|completed|cancelled (default open)
 * Priority enum: low|medium|high|critical (default medium)
 */
import type { DbClient } from '../../db/runner';

export type RemediationStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
const STATUSES: ReadonlyArray<RemediationStatus> = ['open', 'in_progress', 'completed', 'cancelled'];

export type RemediationPriority = 'low' | 'medium' | 'high' | 'critical';
const PRIORITIES: ReadonlyArray<RemediationPriority> = ['low', 'medium', 'high', 'critical'];

export interface RemediationActionRow {
  actionId: string;
  findingId: string;
  ownerUserId: string;
  plan: string;
  status: RemediationStatus;
  priority: RemediationPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreateFromFindingInput {
  tenantSchema: string;
  actorId: string;
  findingId: string;
  ownerUserId: string;
  plan: string;
  priority?: RemediationPriority;
  dueDate?: string;
}

export interface ListActionsInput {
  tenantSchema: string;
  findingId?: string;
  status?: RemediationStatus;
  ownerUserId?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateStatusInput {
  tenantSchema: string;
  actorId: string;
  actionId: string;
  status: RemediationStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `action_id, finding_id, owner_user_id, plan, status, priority,
              due_date, completed_at, created_at, created_by`;

const mapRow = (x: {
  action_id: string; finding_id: string; owner_user_id: string;
  plan: string; status: string; priority: string;
  due_date: string | null; completed_at: string | null;
  created_at: string; created_by: string;
}): RemediationActionRow => ({
  actionId: x.action_id, findingId: x.finding_id,
  ownerUserId: x.owner_user_id, plan: x.plan,
  status: x.status as RemediationStatus,
  priority: x.priority as RemediationPriority,
  dueDate: x.due_date, completedAt: x.completed_at,
  createdAt: x.created_at, createdBy: x.created_by,
});

export async function listRemediationActions(
  client: DbClient,
  input: ListActionsInput,
): Promise<{ rows: RemediationActionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.findingId) { params.push(input.findingId); where += ` AND finding_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.ownerUserId) { params.push(input.ownerUserId); where += ` AND owner_user_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".remediation_actions
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".remediation_actions WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getRemediationAction(
  client: DbClient,
  input: { tenantSchema: string; actionId: string },
): Promise<RemediationActionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".remediation_actions
     WHERE action_id = $1`,
    [input.actionId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

/**
 * Bridge — creates a remediation_actions row from an open finding and
 * transitions the source finding to `in_remediation` if it is `open`.
 * Returns the inserted action and a flag whether the finding was advanced.
 */
export async function createFromFinding(
  client: DbClient,
  input: CreateFromFindingInput,
): Promise<{ action: RemediationActionRow; findingAdvanced: boolean }> {
  assertSchema(input.tenantSchema);
  if (!input.findingId || !input.ownerUserId || !input.plan) {
    throw Object.assign(
      new Error('findingId, ownerUserId, plan required'), { code: 'bad_input' },
    );
  }
  const priority = input.priority ?? 'medium';
  if (!PRIORITIES.includes(priority)) {
    throw Object.assign(new Error(`bad priority: ${priority}`), { code: 'bad_priority' });
  }

  const f = await client.query<{ finding_id: string; finding_status: string }>(
    `SELECT finding_id, finding_status FROM "${input.tenantSchema}".findings
      WHERE finding_id = $1`,
    [input.findingId],
  );
  if (f.rowCount === 0) {
    throw Object.assign(new Error(`finding ${input.findingId} not found`), { code: 'not_found' });
  }

  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".remediation_actions
       (finding_id, owner_user_id, plan, status, priority, due_date, created_by)
     VALUES ($1, $2, $3, 'open', $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.findingId, input.ownerUserId, input.plan, priority,
      input.dueDate ?? null, input.actorId,
    ],
  );

  let findingAdvanced = false;
  if (f.rows[0].finding_status === 'open') {
    const upd = await client.query(
      `UPDATE "${input.tenantSchema}".findings
          SET finding_status = 'in_remediation'
        WHERE finding_id = $1 AND finding_status = 'open'`,
      [input.findingId],
    );
    findingAdvanced = (upd.rowCount ?? 0) > 0;
  }

  return { action: mapRow(ins.rows[0] as never), findingAdvanced };
}

export async function updateActionStatus(
  client: DbClient,
  input: UpdateStatusInput,
): Promise<RemediationActionRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const completedClause = input.status === 'completed' ? `, completed_at = NOW()` : '';
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".remediation_actions
        SET status = $2 ${completedClause}
      WHERE action_id = $1
      RETURNING ${COLS}`,
    [input.actionId, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
