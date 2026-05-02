/**
 * API-Keys (W78) — per-tenant API key issuance + verification + revocation.
 *
 * Backed by `<tenant_schema>.api_keys`:
 *   key_id TEXT PRIMARY KEY (random short id, returned for management),
 *   key_prefix TEXT (first 8 chars of plaintext, indexed for fast lookup),
 *   key_hash TEXT (sha256 hex of full plaintext, never stored in plaintext),
 *   label TEXT, scopes JSONB (string[]),
 *   status TEXT enum 'active' | 'revoked',
 *   created_at, created_by,
 *   expires_at TIMESTAMPTZ NULL,
 *   last_used_at TIMESTAMPTZ NULL,
 *   revoked_at TIMESTAMPTZ NULL, revoked_by TEXT NULL.
 *
 * `issueKey()` returns the plaintext exactly once (caller must capture it);
 *   only the hash + prefix are persisted.
 * `verifyKey(plaintext)` does prefix lookup + hash compare; updates
 *   last_used_at on hit; returns reason `not_found|hash_mismatch|revoked|
 *   expired|ok`.
 * `revokeKey()` is idempotent (revoking an already-revoked key returns the
 *   row unchanged).
 *
 * Tenant-safe (regex-guarded schema). Pure deterministic logic.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { DbClient } from '../../db/runner';

export type ApiKeyStatus = 'active' | 'revoked';
const STATUSES: ReadonlyArray<ApiKeyStatus> = ['active', 'revoked'];

export type VerifyReason =
  | 'not_found' | 'hash_mismatch' | 'revoked' | 'expired' | 'ok';
const VERIFY_REASONS: ReadonlyArray<VerifyReason> = [
  'not_found', 'hash_mismatch', 'revoked', 'expired', 'ok',
];

export interface ApiKeyRow {
  keyId: string;
  keyPrefix: string;
  label: string;
  scopes: string[];
  status: ApiKeyStatus;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

export interface IssueKeyInput {
  tenantSchema: string;
  actorId: string;
  label: string;
  scopes?: string[];
  expiresAt?: string | null;
  /** Test seam: deterministic plaintext (skips randomness). */
  plaintextOverride?: string;
}

export interface IssueKeyResult {
  row: ApiKeyRow;
  /** Plaintext token. Returned ONCE; never persisted. */
  plaintext: string;
}

export interface VerifyKeyInput {
  tenantSchema: string;
  plaintext: string;
  now?: () => Date;
}

export interface VerifyKeyResult {
  reason: VerifyReason;
  ok: boolean;
  row: ApiKeyRow | null;
}

export interface RevokeKeyInput {
  tenantSchema: string;
  actorId: string;
  keyId: string;
}

export interface ListKeysInput {
  tenantSchema: string;
  status?: ApiKeyStatus;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `key_id, key_prefix, key_hash, label, scopes, status,
              created_at, created_by, expires_at, last_used_at,
              revoked_at, revoked_by`;

const RETURN_COLS = `key_id, key_prefix, label, scopes, status,
                     created_at, created_by, expires_at, last_used_at,
                     revoked_at, revoked_by`;

const mapRow = (x: {
  key_id: string; key_prefix: string; label: string;
  scopes: string[] | null; status: string;
  created_at: string; created_by: string;
  expires_at: string | null; last_used_at: string | null;
  revoked_at: string | null; revoked_by: string | null;
}): ApiKeyRow => ({
  keyId: x.key_id, keyPrefix: x.key_prefix, label: x.label,
  scopes: x.scopes ?? [], status: x.status as ApiKeyStatus,
  createdAt: x.created_at, createdBy: x.created_by,
  expiresAt: x.expires_at, lastUsedAt: x.last_used_at,
  revokedAt: x.revoked_at, revokedBy: x.revoked_by,
});

export function hashPlaintext(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function generateKeyId(): string {
  return randomBytes(8).toString('hex');
}

export function generatePlaintext(): string {
  return `dos_${randomBytes(24).toString('hex')}`;
}

export async function issueKey(
  client: DbClient, input: IssueKeyInput,
): Promise<IssueKeyResult> {
  assertSchema(input.tenantSchema);
  if (!input.label) {
    throw Object.assign(new Error('label required'), { code: 'bad_input' });
  }
  const plaintext = input.plaintextOverride ?? generatePlaintext();
  if (plaintext.length < 12) {
    throw Object.assign(
      new Error('plaintext too short'), { code: 'bad_input' },
    );
  }
  const prefix = plaintext.slice(0, 8);
  const hash = hashPlaintext(plaintext);
  const keyId = generateKeyId();
  const scopes = Array.isArray(input.scopes) ? input.scopes : [];
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".api_keys
       (key_id, key_prefix, key_hash, label, scopes, status,
        created_at, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'active', NOW(), $6, $7)
     RETURNING ${RETURN_COLS}`,
    [keyId, prefix, hash, input.label,
     JSON.stringify(scopes), input.actorId, input.expiresAt ?? null],
  );
  return { row: mapRow(r.rows[0] as never), plaintext };
}

export async function getKey(
  client: DbClient,
  input: { tenantSchema: string; keyId: string },
): Promise<ApiKeyRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${RETURN_COLS} FROM "${input.tenantSchema}".api_keys
      WHERE key_id = $1`,
    [input.keyId],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function listKeys(
  client: DbClient, input: ListKeysInput,
): Promise<{ rows: ApiKeyRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const r = await client.query(
    `SELECT ${RETURN_COLS} FROM "${input.tenantSchema}".api_keys
      WHERE ${where} ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".api_keys WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function verifyKey(
  client: DbClient, input: VerifyKeyInput,
): Promise<VerifyKeyResult> {
  assertSchema(input.tenantSchema);
  if (!input.plaintext || input.plaintext.length < 8) {
    return { reason: 'not_found', ok: false, row: null };
  }
  const prefix = input.plaintext.slice(0, 8);
  const candidates = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".api_keys
      WHERE key_prefix = $1`,
    [prefix],
  );
  if (candidates.rowCount === 0) {
    return { reason: 'not_found', ok: false, row: null };
  }
  const hash = hashPlaintext(input.plaintext);
  const matches = (candidates.rows as Array<{
    key_id: string; key_prefix: string; key_hash: string; label: string;
    scopes: string[] | null; status: string;
    created_at: string; created_by: string;
    expires_at: string | null; last_used_at: string | null;
    revoked_at: string | null; revoked_by: string | null;
  }>).filter((x) => x.key_hash === hash);
  if (matches.length === 0) {
    return { reason: 'hash_mismatch', ok: false, row: null };
  }
  const raw = matches[0];
  const row = mapRow(raw);
  if (row.status === 'revoked') {
    return { reason: 'revoked', ok: false, row };
  }
  const now = input.now ? input.now() : new Date();
  if (row.expiresAt && Date.parse(row.expiresAt) <= now.getTime()) {
    return { reason: 'expired', ok: false, row };
  }
  await client.query(
    `UPDATE "${input.tenantSchema}".api_keys
        SET last_used_at = NOW()
      WHERE key_id = $1`,
    [row.keyId],
  );
  if (!VERIFY_REASONS.includes('ok')) {
    throw Object.assign(new Error('bad reason'), { code: 'bad_reason' });
  }
  return { reason: 'ok', ok: true, row: { ...row, lastUsedAt: now.toISOString() } };
}

export async function revokeKey(
  client: DbClient, input: RevokeKeyInput,
): Promise<ApiKeyRow> {
  assertSchema(input.tenantSchema);
  const cur = await getKey(client, {
    tenantSchema: input.tenantSchema, keyId: input.keyId,
  });
  if (!cur) {
    throw Object.assign(
      new Error(`api key ${input.keyId} not found`),
      { code: 'not_found' },
    );
  }
  if (cur.status === 'revoked') return cur;
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".api_keys
        SET status = 'revoked',
            revoked_at = NOW(),
            revoked_by = $2
      WHERE key_id = $1
      RETURNING ${RETURN_COLS}`,
    [input.keyId, input.actorId],
  );
  if (!STATUSES.includes('revoked')) {
    throw Object.assign(new Error('bad status'), { code: 'bad_status' });
  }
  return mapRow(r.rows[0] as never);
}

export const API_KEY_STATUSES = STATUSES;
export const API_KEY_VERIFY_REASONS = VERIFY_REASONS;
