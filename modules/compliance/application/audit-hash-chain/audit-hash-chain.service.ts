/**
 * Wave 10 — Tamper-Evident Audit Trail (hash chain).
 *
 * Each compliance_audit_trail entry stores entry_hash = SHA-256 of
 *   prev_hash || canonical_json(row_minus_entry_hash)
 *
 * Genesis (first entry per tenant) uses prev_hash = '0'.repeat(64).
 *
 * Verification walks the chain in chain_seq order and recomputes each hash;
 * the first row whose recomputed hash != stored entry_hash is the tamper
 * point. Required by SAMA + KSA NCA ECC for audit-trail non-repudiation.
 */
import { createHash } from 'node:crypto';
import type { DbClient } from '../../db/runner';

const GENESIS_HASH = '0'.repeat(64);

export interface AuditChainEntry {
  id: string;
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  userId: string | null;
  createdAt: string;
  prevHash: string | null;
  entryHash: string | null;
  chainSeq: number | null;
}

export interface ChainVerifyResult {
  ok: boolean;
  totalEntries: number;
  verifiedEntries: number;
  firstBreakAt: { id: string; chainSeq: number } | null;
  reason: string | null;
}

/**
 * Canonicalize an audit row for hashing. Excludes entry_hash itself and
 * uses sorted keys + ISO timestamps to avoid encoder drift.
 */
function canonicalize(row: Omit<AuditChainEntry, 'entryHash'>): string {
  const ordered: Record<string, unknown> = {};
  for (const k of Object.keys(row).sort()) {
    ordered[k] = (row as Record<string, unknown>)[k];
  }
  return JSON.stringify(ordered);
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute entry_hash for a new audit row given the prev_hash and the
 * canonical payload. Pure function — no side effects.
 */
export function computeEntryHash(prevHash: string, row: Omit<AuditChainEntry, 'entryHash'>): string {
  return sha256(prevHash + canonicalize(row));
}

/**
 * Append a new audit entry with hash-chain integrity. Returns the inserted
 * row including entry_hash + chain_seq.
 *
 * The implementation locks the chain head per tenant (advisory lock keyed
 * by tenant_id) so concurrent appends serialize correctly.
 */
export async function appendChainedAudit(
  client: DbClient,
  input: {
    tenantId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    userId?: string;
  },
): Promise<AuditChainEntry> {
  const tenantLockKey = hashTenantId(input.tenantId);

  // Advisory lock so chain reads/writes are serialized per tenant.
  await client.query('SELECT pg_advisory_xact_lock($1)', [tenantLockKey]);

  // Read current chain head.
  const headRes = await client.query<{ entry_hash: string | null; chain_seq: number | null }>(
    `SELECT entry_hash, chain_seq
       FROM compliance_audit_trail
      WHERE tenant_id = $1 AND entry_hash IS NOT NULL
      ORDER BY chain_seq DESC NULLS LAST
      LIMIT 1`,
    [input.tenantId],
  );
  const prevHash = headRes.rows[0]?.entry_hash ?? GENESIS_HASH;
  const nextSeq = (headRes.rows[0]?.chain_seq ?? 0) + 1;

  // Insert with computed entry_hash.
  const inserted = await client.query<AuditChainEntry>(
    `INSERT INTO compliance_audit_trail (
       tenant_id, event_type, payload, user_id,
       prev_hash, chain_seq, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, tenant_id AS "tenantId", event_type AS "eventType",
       payload, user_id AS "userId", created_at AS "createdAt",
       prev_hash AS "prevHash", entry_hash AS "entryHash",
       chain_seq AS "chainSeq"`,
    [input.tenantId, input.eventType, input.payload ?? null, input.userId ?? null, prevHash, nextSeq],
  );
  const row = inserted.rows[0];

  // Compute entry_hash from the inserted row, then update.
  const entryHash = computeEntryHash(prevHash, {
    id: row.id,
    tenantId: row.tenantId,
    eventType: row.eventType,
    payload: row.payload,
    userId: row.userId,
    createdAt: row.createdAt,
    prevHash: row.prevHash,
    chainSeq: row.chainSeq,
  });
  await client.query(
    `UPDATE compliance_audit_trail SET entry_hash = $1 WHERE id = $2`,
    [entryHash, row.id],
  );
  return { ...row, entryHash };
}

/**
 * Walk the chain head-to-tail, recomputing hashes and reporting the first
 * tamper point if any. Pre-Wave-10 entries (chain_seq IS NULL) are skipped.
 */
export async function verifyAuditChain(
  client: DbClient,
  tenantId: string,
): Promise<ChainVerifyResult> {
  const res = await client.query<AuditChainEntry & { entry_hash: string; prev_hash: string; chain_seq: number }>(
    `SELECT id, tenant_id AS "tenantId", event_type AS "eventType",
       payload, user_id AS "userId", created_at AS "createdAt",
       prev_hash AS "prevHash", entry_hash AS "entryHash",
       chain_seq AS "chainSeq",
       prev_hash, entry_hash, chain_seq
     FROM compliance_audit_trail
     WHERE tenant_id = $1 AND chain_seq IS NOT NULL AND entry_hash IS NOT NULL
     ORDER BY chain_seq ASC`,
    [tenantId],
  );

  if (res.rows.length === 0) {
    return { ok: true, totalEntries: 0, verifiedEntries: 0, firstBreakAt: null, reason: 'no chained entries' };
  }

  let expectedPrevHash = GENESIS_HASH;
  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows[i];
    if (r.prevHash !== expectedPrevHash) {
      return {
        ok: false,
        totalEntries: res.rows.length,
        verifiedEntries: i,
        firstBreakAt: { id: r.id, chainSeq: r.chainSeq! },
        reason: `prev_hash mismatch at chain_seq=${r.chainSeq}: expected ${expectedPrevHash.slice(0, 16)}…, got ${r.prevHash?.slice(0, 16)}…`,
      };
    }
    const recomputed = computeEntryHash(r.prevHash!, {
      id: r.id,
      tenantId: r.tenantId,
      eventType: r.eventType,
      payload: r.payload,
      userId: r.userId,
      createdAt: r.createdAt,
      prevHash: r.prevHash,
      chainSeq: r.chainSeq,
    });
    if (recomputed !== r.entryHash) {
      return {
        ok: false,
        totalEntries: res.rows.length,
        verifiedEntries: i,
        firstBreakAt: { id: r.id, chainSeq: r.chainSeq! },
        reason: `entry_hash mismatch at chain_seq=${r.chainSeq}: row appears tampered`,
      };
    }
    expectedPrevHash = r.entryHash!;
  }
  return {
    ok: true,
    totalEntries: res.rows.length,
    verifiedEntries: res.rows.length,
    firstBreakAt: null,
    reason: null,
  };
}

/**
 * Map a UUID tenantId to a 64-bit advisory-lock key. xxhash would be
 * preferable; we use a substring of SHA-256 here to avoid a new dep.
 */
function hashTenantId(tenantId: string): bigint {
  const hex = sha256(tenantId).slice(0, 15);
  return BigInt('0x' + hex);
}

export const __WAVE_10_GENESIS_HASH = GENESIS_HASH;
