/**
 * Feature-Flags (W77) — per-tenant feature toggle store with deterministic
 * percentage rollout.
 *
 * Backed by `<tenant_schema>.feature_flags`:
 *   flag_code TEXT PRIMARY KEY, enabled BOOLEAN, rollout_percent INT (0..100),
 *   allowed_users JSONB (string[]), denied_users JSONB (string[]),
 *   metadata JSONB, created_at, updated_at, updated_by
 *
 * `evaluate(flagCode, userId)` order:
 *   1. flag missing             → { enabled: false, reason: 'unknown' }
 *   2. enabled=false            → { enabled: false, reason: 'disabled' }
 *   3. denied_users contains    → { enabled: false, reason: 'denied' }
 *   4. allowed_users contains   → { enabled: true,  reason: 'allowed' }
 *   5. rollout_percent <= 0     → { enabled: false, reason: 'rollout_zero' }
 *   6. rollout_percent >= 100   → { enabled: true,  reason: 'rollout_full' }
 *   7. deterministic bucket(userId, flagCode) < rollout_percent
 *                               → { enabled: true,  reason: 'rollout_in' }
 *      else                     → { enabled: false, reason: 'rollout_out' }
 *
 * `bucket()` is djb2(userId+'|'+flagCode) % 100, stable across runs.
 *
 * Tenant-safe (regex-guarded schema).
 */
import type { DbClient } from '../../db/runner';

export type EvaluationReason =
  | 'unknown' | 'disabled' | 'denied' | 'allowed'
  | 'rollout_zero' | 'rollout_full' | 'rollout_in' | 'rollout_out';

const REASONS: ReadonlyArray<EvaluationReason> = [
  'unknown', 'disabled', 'denied', 'allowed',
  'rollout_zero', 'rollout_full', 'rollout_in', 'rollout_out',
];

export interface FeatureFlagRow {
  flagCode: string;
  enabled: boolean;
  rolloutPercent: number;
  allowedUsers: string[];
  deniedUsers: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertFlagInput {
  tenantSchema: string;
  actorId: string;
  flagCode: string;
  enabled: boolean;
  rolloutPercent?: number;
  allowedUsers?: string[];
  deniedUsers?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvaluateInput {
  tenantSchema: string;
  flagCode: string;
  userId: string;
}

export interface EvaluateResult {
  flagCode: string;
  userId: string;
  enabled: boolean;
  reason: EvaluationReason;
  bucket: number | null;
  rolloutPercent: number | null;
}

export interface ListFlagsInput {
  tenantSchema: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `flag_code, enabled, rollout_percent, allowed_users, denied_users,
              metadata, created_at, updated_at, updated_by`;

const mapRow = (x: {
  flag_code: string; enabled: boolean;
  rollout_percent: string | number;
  allowed_users: string[] | null;
  denied_users: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string; updated_at: string; updated_by: string;
}): FeatureFlagRow => ({
  flagCode: x.flag_code, enabled: !!x.enabled,
  rolloutPercent: Number(x.rollout_percent),
  allowedUsers: x.allowed_users ?? [],
  deniedUsers: x.denied_users ?? [],
  metadata: x.metadata ?? {},
  createdAt: x.created_at, updatedAt: x.updated_at,
  updatedBy: x.updated_by,
});

export function bucket(userId: string, flagCode: string): number {
  const s = `${userId}|${flagCode}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 100;
}

export async function upsertFlag(
  client: DbClient, input: UpsertFlagInput,
): Promise<FeatureFlagRow> {
  assertSchema(input.tenantSchema);
  if (!input.flagCode) {
    throw Object.assign(new Error('flagCode required'), { code: 'bad_input' });
  }
  const pct = input.rolloutPercent ?? (input.enabled ? 100 : 0);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw Object.assign(
      new Error(`rolloutPercent ${pct} must be in [0..100]`),
      { code: 'bad_input' },
    );
  }
  const allowed = Array.isArray(input.allowedUsers) ? input.allowedUsers : [];
  const denied = Array.isArray(input.deniedUsers) ? input.deniedUsers : [];
  const meta = (input.metadata && typeof input.metadata === 'object') ? input.metadata : {};
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".feature_flags
       (flag_code, enabled, rollout_percent, allowed_users, denied_users,
        metadata, created_at, updated_at, updated_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, NOW(), NOW(), $7)
     ON CONFLICT (flag_code) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           rollout_percent = EXCLUDED.rollout_percent,
           allowed_users = EXCLUDED.allowed_users,
           denied_users = EXCLUDED.denied_users,
           metadata = EXCLUDED.metadata,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by
     RETURNING ${COLS}`,
    [input.flagCode, input.enabled, pct,
     JSON.stringify(allowed), JSON.stringify(denied),
     JSON.stringify(meta), input.actorId],
  );
  return mapRow(r.rows[0] as never);
}

export async function getFlag(
  client: DbClient,
  input: { tenantSchema: string; flagCode: string },
): Promise<FeatureFlagRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".feature_flags
      WHERE flag_code = $1`,
    [input.flagCode],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function listFlags(
  client: DbClient, input: ListFlagsInput,
): Promise<{ rows: FeatureFlagRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.enabled !== undefined) {
    params.push(input.enabled); where += ` AND enabled = $${params.length}`;
  }
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".feature_flags
      WHERE ${where} ORDER BY flag_code
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".feature_flags WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function deleteFlag(
  client: DbClient,
  input: { tenantSchema: string; flagCode: string },
): Promise<boolean> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".feature_flags WHERE flag_code = $1`,
    [input.flagCode],
  );
  return ((r as { rowCount?: number }).rowCount ?? 0) > 0;
}

export async function evaluate(
  client: DbClient, input: EvaluateInput,
): Promise<EvaluateResult> {
  assertSchema(input.tenantSchema);
  if (!input.flagCode) {
    throw Object.assign(new Error('flagCode required'), { code: 'bad_input' });
  }
  if (!input.userId) {
    throw Object.assign(new Error('userId required'), { code: 'bad_input' });
  }
  const flag = await getFlag(client, {
    tenantSchema: input.tenantSchema, flagCode: input.flagCode,
  });
  const base = { flagCode: input.flagCode, userId: input.userId };
  if (!flag) {
    return { ...base, enabled: false, reason: 'unknown', bucket: null, rolloutPercent: null };
  }
  if (!flag.enabled) {
    return { ...base, enabled: false, reason: 'disabled', bucket: null, rolloutPercent: flag.rolloutPercent };
  }
  if (flag.deniedUsers.includes(input.userId)) {
    return { ...base, enabled: false, reason: 'denied', bucket: null, rolloutPercent: flag.rolloutPercent };
  }
  if (flag.allowedUsers.includes(input.userId)) {
    return { ...base, enabled: true, reason: 'allowed', bucket: null, rolloutPercent: flag.rolloutPercent };
  }
  if (flag.rolloutPercent <= 0) {
    return { ...base, enabled: false, reason: 'rollout_zero', bucket: null, rolloutPercent: flag.rolloutPercent };
  }
  if (flag.rolloutPercent >= 100) {
    return { ...base, enabled: true, reason: 'rollout_full', bucket: null, rolloutPercent: flag.rolloutPercent };
  }
  const b = bucket(input.userId, input.flagCode);
  const inRollout = b < flag.rolloutPercent;
  if (!REASONS.includes('rollout_in')) {
    throw Object.assign(new Error('bad reason'), { code: 'bad_reason' });
  }
  return {
    ...base, enabled: inRollout,
    reason: inRollout ? 'rollout_in' : 'rollout_out',
    bucket: b, rolloutPercent: flag.rolloutPercent,
  };
}

export const FEATURE_FLAG_REASONS = REASONS;
