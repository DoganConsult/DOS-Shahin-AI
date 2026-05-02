/**
 * Rate-Limit-Policies (W79) — per-tenant fixed-window rate limit policies
 * with a counter ledger and check/consume semantics.
 *
 * Policies are stored in `<tenant_schema>.rate_limit_policies`:
 *   policy_code TEXT PRIMARY KEY,
 *   subject_kind TEXT enum 'user' | 'api_key' | 'ip' | 'global',
 *   window_seconds INT (must be > 0),
 *   max_requests INT (must be > 0),
 *   metadata JSONB,
 *   created_at, updated_at, updated_by.
 *
 * Counters in `<tenant_schema>.rate_limit_counters`:
 *   policy_code TEXT, subject_id TEXT, window_started_at TIMESTAMPTZ,
 *   counter INT, PRIMARY KEY (policy_code, subject_id, window_started_at).
 *
 * `consume(policyCode, subjectId, n=1)` floors `now()` to the current window
 * (`floor(now/window) * window`), atomically upserts +n on the row, and
 * returns `{ allowed, counter, max, reset_at }`. Counter is permitted to
 * exceed the limit by the consumed batch (caller can retry).
 *
 * `check()` is read-only.
 *
 * Tenant-safe (regex-guarded schema).
 */
import type { DbClient } from '../../db/runner';

export type SubjectKind = 'user' | 'api_key' | 'ip' | 'global';
const SUBJECT_KINDS: ReadonlyArray<SubjectKind> = ['user', 'api_key', 'ip', 'global'];

export interface RateLimitPolicyRow {
  policyCode: string;
  subjectKind: SubjectKind;
  windowSeconds: number;
  maxRequests: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RateLimitCounterRow {
  policyCode: string;
  subjectId: string;
  windowStartedAt: string;
  counter: number;
}

export interface UpsertPolicyInput {
  tenantSchema: string;
  actorId: string;
  policyCode: string;
  subjectKind: SubjectKind;
  windowSeconds: number;
  maxRequests: number;
  metadata?: Record<string, unknown>;
}

export interface ConsumeInput {
  tenantSchema: string;
  policyCode: string;
  subjectId: string;
  amount?: number;
  now?: () => Date;
}

export interface ConsumeResult {
  allowed: boolean;
  counter: number;
  max: number;
  resetAt: string;
  windowStartedAt: string;
}

export interface CheckInput {
  tenantSchema: string;
  policyCode: string;
  subjectId: string;
  now?: () => Date;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const POLICY_COLS = `policy_code, subject_kind, window_seconds, max_requests,
                     metadata, created_at, updated_at, updated_by`;

const COUNTER_COLS = `policy_code, subject_id, window_started_at, counter`;

const mapPolicy = (x: {
  policy_code: string; subject_kind: string;
  window_seconds: string | number; max_requests: string | number;
  metadata: Record<string, unknown> | null;
  created_at: string; updated_at: string; updated_by: string;
}): RateLimitPolicyRow => ({
  policyCode: x.policy_code,
  subjectKind: x.subject_kind as SubjectKind,
  windowSeconds: Number(x.window_seconds),
  maxRequests: Number(x.max_requests),
  metadata: x.metadata ?? {},
  createdAt: x.created_at, updatedAt: x.updated_at, updatedBy: x.updated_by,
});

const mapCounter = (x: {
  policy_code: string; subject_id: string;
  window_started_at: string; counter: string | number;
}): RateLimitCounterRow => ({
  policyCode: x.policy_code, subjectId: x.subject_id,
  windowStartedAt: x.window_started_at, counter: Number(x.counter),
});

export function windowStartFor(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export async function upsertPolicy(
  client: DbClient, input: UpsertPolicyInput,
): Promise<RateLimitPolicyRow> {
  assertSchema(input.tenantSchema);
  if (!input.policyCode) {
    throw Object.assign(new Error('policyCode required'), { code: 'bad_input' });
  }
  if (!SUBJECT_KINDS.includes(input.subjectKind)) {
    throw Object.assign(
      new Error(`bad subjectKind ${input.subjectKind}`),
      { code: 'bad_subject_kind' },
    );
  }
  if (!Number.isFinite(input.windowSeconds) || input.windowSeconds <= 0) {
    throw Object.assign(
      new Error(`windowSeconds ${input.windowSeconds} must be > 0`),
      { code: 'bad_input' },
    );
  }
  if (!Number.isFinite(input.maxRequests) || input.maxRequests <= 0) {
    throw Object.assign(
      new Error(`maxRequests ${input.maxRequests} must be > 0`),
      { code: 'bad_input' },
    );
  }
  const meta = (input.metadata && typeof input.metadata === 'object') ? input.metadata : {};
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".rate_limit_policies
       (policy_code, subject_kind, window_seconds, max_requests,
        metadata, created_at, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW(), $6)
     ON CONFLICT (policy_code) DO UPDATE
       SET subject_kind = EXCLUDED.subject_kind,
           window_seconds = EXCLUDED.window_seconds,
           max_requests = EXCLUDED.max_requests,
           metadata = EXCLUDED.metadata,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by
     RETURNING ${POLICY_COLS}`,
    [input.policyCode, input.subjectKind, input.windowSeconds,
     input.maxRequests, JSON.stringify(meta), input.actorId],
  );
  return mapPolicy(r.rows[0] as never);
}

export async function getPolicy(
  client: DbClient,
  input: { tenantSchema: string; policyCode: string },
): Promise<RateLimitPolicyRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${POLICY_COLS} FROM "${input.tenantSchema}".rate_limit_policies
      WHERE policy_code = $1`,
    [input.policyCode],
  );
  return r.rowCount === 0 ? null : mapPolicy(r.rows[0] as never);
}

export async function listPolicies(
  client: DbClient,
  input: { tenantSchema: string; subjectKind?: SubjectKind; limit?: number; offset?: number },
): Promise<{ rows: RateLimitPolicyRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.subjectKind) {
    if (!SUBJECT_KINDS.includes(input.subjectKind)) {
      throw Object.assign(
        new Error(`bad subjectKind ${input.subjectKind}`),
        { code: 'bad_subject_kind' },
      );
    }
    params.push(input.subjectKind); where += ` AND subject_kind = $${params.length}`;
  }
  const r = await client.query(
    `SELECT ${POLICY_COLS} FROM "${input.tenantSchema}".rate_limit_policies
      WHERE ${where} ORDER BY policy_code
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".rate_limit_policies WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapPolicy as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function deletePolicy(
  client: DbClient,
  input: { tenantSchema: string; policyCode: string },
): Promise<boolean> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".rate_limit_policies
      WHERE policy_code = $1`,
    [input.policyCode],
  );
  return ((r as { rowCount?: number }).rowCount ?? 0) > 0;
}

export async function consume(
  client: DbClient, input: ConsumeInput,
): Promise<ConsumeResult> {
  assertSchema(input.tenantSchema);
  const amount = input.amount ?? 1;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error(`amount ${amount} must be > 0`), { code: 'bad_input' });
  }
  if (!input.subjectId) {
    throw Object.assign(new Error('subjectId required'), { code: 'bad_input' });
  }
  const policy = await getPolicy(client, {
    tenantSchema: input.tenantSchema, policyCode: input.policyCode,
  });
  if (!policy) {
    throw Object.assign(
      new Error(`policy ${input.policyCode} not found`),
      { code: 'not_found' },
    );
  }
  const now = input.now ? input.now() : new Date();
  const start = windowStartFor(now, policy.windowSeconds);
  const startIso = start.toISOString();
  const resetAt = new Date(start.getTime() + policy.windowSeconds * 1000).toISOString();
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".rate_limit_counters
       (policy_code, subject_id, window_started_at, counter)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (policy_code, subject_id, window_started_at) DO UPDATE
       SET counter = "${input.tenantSchema}".rate_limit_counters.counter + EXCLUDED.counter
     RETURNING ${COUNTER_COLS}`,
    [input.policyCode, input.subjectId, startIso, amount],
  );
  const row = mapCounter(r.rows[0] as never);
  return {
    allowed: row.counter <= policy.maxRequests,
    counter: row.counter,
    max: policy.maxRequests,
    resetAt,
    windowStartedAt: startIso,
  };
}

export async function check(
  client: DbClient, input: CheckInput,
): Promise<ConsumeResult> {
  assertSchema(input.tenantSchema);
  const policy = await getPolicy(client, {
    tenantSchema: input.tenantSchema, policyCode: input.policyCode,
  });
  if (!policy) {
    throw Object.assign(
      new Error(`policy ${input.policyCode} not found`),
      { code: 'not_found' },
    );
  }
  const now = input.now ? input.now() : new Date();
  const start = windowStartFor(now, policy.windowSeconds);
  const startIso = start.toISOString();
  const resetAt = new Date(start.getTime() + policy.windowSeconds * 1000).toISOString();
  const r = await client.query(
    `SELECT ${COUNTER_COLS} FROM "${input.tenantSchema}".rate_limit_counters
      WHERE policy_code = $1 AND subject_id = $2 AND window_started_at = $3`,
    [input.policyCode, input.subjectId, startIso],
  );
  const counter = r.rowCount === 0 ? 0 : Number((r.rows[0] as { counter: string | number }).counter);
  return {
    allowed: counter < policy.maxRequests,
    counter,
    max: policy.maxRequests,
    resetAt,
    windowStartedAt: startIso,
  };
}

export async function purgeExpiredCounters(
  client: DbClient,
  input: { tenantSchema: string; olderThanWindows?: number; now?: () => Date },
): Promise<{ deleted: number }> {
  assertSchema(input.tenantSchema);
  const factor = Math.max(input.olderThanWindows ?? 1, 1);
  const now = input.now ? input.now() : new Date();
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".rate_limit_counters c
       USING "${input.tenantSchema}".rate_limit_policies p
      WHERE c.policy_code = p.policy_code
        AND c.window_started_at + (p.window_seconds * INTERVAL '1 second') * $1 < $2`,
    [factor, now.toISOString()],
  );
  return { deleted: (r as { rowCount?: number }).rowCount ?? 0 };
}

export const RATE_LIMIT_SUBJECT_KINDS = SUBJECT_KINDS;
