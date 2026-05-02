/**
 * Retry-Backoff Policy (W66) — re-queues `failed` outbox rows from the W60
 * `<tenant_schema>.event_outbox` back to `pending` once an exponential
 * delay has elapsed since `created_at` (or `dispatched_at`). Decisions are
 * journaled to `<tenant_schema>.retry_decisions` for audit replay.
 *
 * Backoff:
 *   delayMs = baseMs * (factor ^ (attempts - 1)),  capped at maxDelayMs
 *   default base=30000ms, factor=2, max=3600000ms (1h), maxAttempts=8
 *
 * Action enum: requeued | skipped_too_soon | skipped_exhausted | dropped
 */
import type { DbClient } from '../../db/runner';

export type RetryAction =
  | 'requeued'
  | 'skipped_too_soon'
  | 'skipped_exhausted'
  | 'dropped';

const ACTIONS: ReadonlyArray<RetryAction> = [
  'requeued', 'skipped_too_soon', 'skipped_exhausted', 'dropped',
];

export interface RetryDecisionRow {
  decisionId: string;
  eventId: string;
  attempts: number;
  action: RetryAction;
  delayMs: number;
  reason: string | null;
  decidedAt: string;
  decidedBy: string;
}

export interface RetryPolicy {
  baseMs?: number;
  factor?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  /** When attempts ≥ maxAttempts, drop instead of skip-exhausted. */
  dropOnExhausted?: boolean;
}

export interface PlanRetriesInput {
  tenantSchema: string;
  actorId: string;
  policy?: RetryPolicy;
  /** Cap on rows scanned per call (1..500). */
  batch?: number;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export interface PlanRetriesResult {
  scanned: number;
  requeued: number;
  skippedTooSoon: number;
  skippedExhausted: number;
  dropped: number;
  decisions: RetryDecisionRow[];
}

export interface ListRetryDecisionsInput {
  tenantSchema: string;
  eventId?: string;
  action?: RetryAction;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const DECISION_COLS =
  `decision_id, event_id, attempts, action, delay_ms, reason, decided_at, decided_by`;

const mapDecision = (x: {
  decision_id: string; event_id: string;
  attempts: string | number; action: string;
  delay_ms: string | number; reason: string | null;
  decided_at: string; decided_by: string;
}): RetryDecisionRow => ({
  decisionId: x.decision_id, eventId: x.event_id,
  attempts: Number(x.attempts), action: x.action as RetryAction,
  delayMs: Number(x.delay_ms), reason: x.reason,
  decidedAt: x.decided_at, decidedBy: x.decided_by,
});

export function computeBackoffMs(
  attempts: number,
  policy: RetryPolicy = {},
): number {
  const base = Math.max(policy.baseMs ?? 30_000, 1);
  const factor = Math.max(policy.factor ?? 2, 1);
  const max = Math.max(policy.maxDelayMs ?? 3_600_000, base);
  const safeAttempts = Math.max(attempts, 1);
  const raw = base * Math.pow(factor, safeAttempts - 1);
  return Math.min(Math.floor(raw), max);
}

interface FailedRow {
  event_id: string;
  attempts: string | number;
  created_at: string;
  dispatched_at: string | null;
}

export async function planRetries(
  client: DbClient,
  input: PlanRetriesInput,
): Promise<PlanRetriesResult> {
  assertSchema(input.tenantSchema);
  const policy = input.policy ?? {};
  const maxAttempts = Math.max(policy.maxAttempts ?? 8, 1);
  const batch = Math.min(Math.max(input.batch ?? 100, 1), 500);
  const now = (input.now ? input.now() : new Date()).getTime();

  const r = await client.query<FailedRow>(
    `SELECT event_id, attempts, created_at, dispatched_at
       FROM "${input.tenantSchema}".event_outbox
      WHERE status = 'failed'
      ORDER BY created_at ASC LIMIT ${batch}`,
    [],
  );

  const decisions: RetryDecisionRow[] = [];
  let requeued = 0; let skippedTooSoon = 0;
  let skippedExhausted = 0; let dropped = 0;

  for (const raw of r.rows) {
    const attempts = Number(raw.attempts);
    const refIso = raw.dispatched_at ?? raw.created_at;
    const refMs = new Date(refIso).getTime();
    const delayMs = computeBackoffMs(attempts, policy);

    let action: RetryAction;
    let reason: string | null = null;

    if (attempts >= maxAttempts) {
      if (policy.dropOnExhausted) {
        action = 'dropped';
        reason = `attempts ${attempts} >= maxAttempts ${maxAttempts}`;
        await client.query(
          `UPDATE "${input.tenantSchema}".event_outbox
              SET error_message = COALESCE(error_message,'') || ' [dropped after max attempts]'
            WHERE event_id = $1`,
          [raw.event_id],
        );
        dropped++;
      } else {
        action = 'skipped_exhausted';
        reason = `attempts ${attempts} >= maxAttempts ${maxAttempts}`;
        skippedExhausted++;
      }
    } else if (now - refMs < delayMs) {
      action = 'skipped_too_soon';
      reason = `delay ${delayMs}ms not elapsed (since ${refIso})`;
      skippedTooSoon++;
    } else {
      action = 'requeued';
      await client.query(
        `UPDATE "${input.tenantSchema}".event_outbox
            SET status = 'pending', error_message = NULL
          WHERE event_id = $1 AND status = 'failed'`,
        [raw.event_id],
      );
      requeued++;
    }

    if (!ACTIONS.includes(action)) {
      throw Object.assign(new Error(`bad action: ${action}`), { code: 'bad_action' });
    }

    const ins = await client.query(
      `INSERT INTO "${input.tenantSchema}".retry_decisions
         (event_id, attempts, action, delay_ms, reason, decided_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${DECISION_COLS}`,
      [raw.event_id, attempts, action, delayMs, reason, input.actorId],
    );
    decisions.push(mapDecision(ins.rows[0] as never));
  }

  return {
    scanned: r.rows.length, requeued, skippedTooSoon,
    skippedExhausted, dropped, decisions,
  };
}

export async function listRetryDecisions(
  client: DbClient,
  input: ListRetryDecisionsInput,
): Promise<{ rows: RetryDecisionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.eventId) { params.push(input.eventId); where += ` AND event_id = $${params.length}`; }
  if (input.action) { params.push(input.action); where += ` AND action = $${params.length}`; }
  const r = await client.query(
    `SELECT ${DECISION_COLS} FROM "${input.tenantSchema}".retry_decisions
      WHERE ${where} ORDER BY decided_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".retry_decisions WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapDecision as never), total: Number(totalR.rows[0]?.n ?? 0) };
}
