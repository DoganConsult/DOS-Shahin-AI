/**
 * DAuth — Agent / service-account credential store.
 *
 * Produces cryptographically-random shared secrets; persists only their
 * bcrypt hashes alongside the tenant + actor binding. Verify compares
 * supplied secrets against the stored hash in constant time. Credentials
 * can be rotated (soft-revoke + issue new) or permanently revoked.
 *
 * Law 1: canonical service per concern.
 * Tenant-scoped via withTenantClient; RLS isolates rows between tenants.
 */

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { withTenantClient } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

const BCRYPT_ROUNDS = Number.parseInt(process.env.DAUTH_BCRYPT_ROUNDS || '12', 10);
const SECRET_BYTES = 32;

export interface AgentCredentialMetadata {
  credentialId: string;
  actorId: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export interface IssuedCredential {
  credentialId: string;
  /** Returned ONCE at issue time; the plaintext secret is never stored. */
  secret: string;
  expiresAt: string | null;
}

export interface VerifyResult {
  valid: boolean;
  scopes: string[];
  credentialId?: string;
}

function generateSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

export async function issueAgentCredential(
  tenantId: string,
  actorId: string,
  scopes: string[] = [],
  opts: { ttlDays?: number; createdBy?: string } = {},
): Promise<IssuedCredential> {
  if (!actorId) throw new Error('actorId is required');
  if (scopes.length > 64) throw new Error('scopes array too large (max 64)');

  const secret = generateSecret();
  const hash = await bcrypt.hash(secret, BCRYPT_ROUNDS);
  const expiresClause = opts.ttlDays
    ? `NOW() + INTERVAL '${Math.floor(opts.ttlDays)} days'`
    : 'NULL';

  const { credentialId, expiresAt } = await withTenantClient(tenantId, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO agent_credentials
         (tenant_id, actor_id, credential_hash, scopes, expires_at, created_by)
       VALUES ($1, $2, $3, $4, ${expiresClause}, $5)
       RETURNING credential_id, expires_at`,
      [tenantId, actorId, hash, scopes, opts.createdBy ?? null],
    );
    return {
      credentialId: rows[0].credential_id as string,
      expiresAt: rows[0].expires_at ? (rows[0].expires_at as Date).toISOString() : null,
    };
  });

  return { credentialId, secret, expiresAt };
}

export async function verifyAgentCredential(
  tenantId: string,
  actorId: string,
  secret: string,
): Promise<VerifyResult> {
  if (!secret) return { valid: false, scopes: [] };
  const rows = await withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT credential_id, credential_hash, scopes, expires_at
       FROM agent_credentials
       WHERE tenant_id = $1
         AND actor_id = $2
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 16`,
      [tenantId, actorId],
    );
    return result.rows as Array<{
      credential_id: string;
      credential_hash: string;
      scopes: string[];
      expires_at: Date | null;
    }>;
  });

  for (const row of rows) {
    const match = await bcrypt.compare(secret, row.credential_hash);
    if (match) {
      // Best-effort last_used_at update; do not fail verification on error.
      withTenantClient(tenantId, async (client) => {
        await client.query(
          `UPDATE agent_credentials SET last_used_at = NOW() WHERE credential_id = $1`,
          [row.credential_id],
        );
      }).catch((err) =>
        logger.warn(
          `[DAuth] agent credential last_used_at update failed — ${(err as Error).message} (tenantId=${tenantId}, actorId=${actorId})`,
        ),
      );
      return { valid: true, scopes: row.scopes ?? [], credentialId: row.credential_id };
    }
  }
  return { valid: false, scopes: [] };
}

export async function revokeAgentCredential(
  tenantId: string,
  credentialId: string,
): Promise<void> {
  await withTenantClient(tenantId, async (client) => {
    await client.query(
      `UPDATE agent_credentials
       SET revoked_at = NOW()
       WHERE tenant_id = $1 AND credential_id = $2 AND revoked_at IS NULL`,
      [tenantId, credentialId],
    );
  });
}

export async function listAgentCredentials(
  tenantId: string,
  actorId: string,
): Promise<AgentCredentialMetadata[]> {
  return withTenantClient(tenantId, async (client) => {
    const { rows } = await client.query(
      `SELECT credential_id, actor_id, scopes,
              created_at, expires_at, revoked_at, last_used_at
       FROM agent_credentials
       WHERE tenant_id = $1 AND actor_id = $2
       ORDER BY created_at DESC`,
      [tenantId, actorId],
    );
    return rows.map((r) => ({
      credentialId: r.credential_id,
      actorId: r.actor_id,
      scopes: r.scopes ?? [],
      createdAt: (r.created_at as Date).toISOString(),
      expiresAt: r.expires_at ? (r.expires_at as Date).toISOString() : null,
      revokedAt: r.revoked_at ? (r.revoked_at as Date).toISOString() : null,
      lastUsedAt: r.last_used_at ? (r.last_used_at as Date).toISOString() : null,
    }));
  });
}

export async function rotateAgentCredential(
  tenantId: string,
  actorId: string,
  credentialId: string,
  scopes: string[] = [],
  opts: { ttlDays?: number; createdBy?: string } = {},
): Promise<IssuedCredential> {
  await revokeAgentCredential(tenantId, credentialId);
  return issueAgentCredential(tenantId, actorId, scopes, opts);
}
