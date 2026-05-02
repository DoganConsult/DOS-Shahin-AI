"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueAgentCredential = issueAgentCredential;
exports.verifyAgentCredential = verifyAgentCredential;
exports.revokeAgentCredential = revokeAgentCredential;
exports.listAgentCredentials = listAgentCredentials;
exports.rotateAgentCredential = rotateAgentCredential;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_crypto_1 = require("node:crypto");
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const BCRYPT_ROUNDS = Number.parseInt(process.env.DAUTH_BCRYPT_ROUNDS || '12', 10);
const SECRET_BYTES = 32; // 256-bit shared secret.
function generateSecret() {
    return (0, node_crypto_1.randomBytes)(SECRET_BYTES).toString('base64url');
}
async function issueAgentCredential(tenantId, actorId, scopes = [], opts = {}) {
    if (!actorId)
        throw new Error('actorId is required');
    if (scopes.length > 64)
        throw new Error('scopes array too large (max 64)');
    const secret = generateSecret();
    const hash = await bcryptjs_1.default.hash(secret, BCRYPT_ROUNDS);
    const expiresClause = opts.ttlDays
        ? `NOW() + INTERVAL '${Math.floor(opts.ttlDays)} days'`
        : 'NULL';
    const { credentialId, expiresAt } = await (0, db_1.withTenantClient)(tenantId, async (client) => {
        const { rows } = await client.query(`INSERT INTO agent_credentials
         (tenant_id, actor_id, credential_hash, scopes, expires_at, created_by)
       VALUES ($1, $2, $3, $4, ${expiresClause}, $5)
       RETURNING credential_id, expires_at`, [tenantId, actorId, hash, scopes, opts.createdBy ?? null]);
        return {
            credentialId: rows[0].credential_id,
            expiresAt: rows[0].expires_at ? rows[0].expires_at.toISOString() : null,
        };
    });
    return { credentialId, secret, expiresAt };
}
async function verifyAgentCredential(tenantId, actorId, secret) {
    if (!secret)
        return { valid: false, scopes: [] };
    const rows = await (0, db_1.withTenantClient)(tenantId, async (client) => {
        const result = await client.query(`SELECT credential_id, credential_hash, scopes, expires_at
       FROM agent_credentials
       WHERE tenant_id = $1
         AND actor_id = $2
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 16`, [tenantId, actorId]);
        return result.rows;
    });
    // Iterate candidates and compare; short-circuit on first match. bcrypt
    // comparisons are constant-time per-call.
    for (const row of rows) {
        const match = await bcryptjs_1.default.compare(secret, row.credential_hash);
        if (match) {
            // Best-effort last_used_at update; do not fail verification on error.
            (0, db_1.withTenantClient)(tenantId, async (client) => {
                await client.query(`UPDATE agent_credentials SET last_used_at = NOW() WHERE credential_id = $1`, [row.credential_id]);
            }).catch((err) => observability_1.logger.warn({ error: err.message, tenantId, actorId }, '[DAuth] agent credential last_used_at update failed'));
            return { valid: true, scopes: row.scopes ?? [], credentialId: row.credential_id };
        }
    }
    return { valid: false, scopes: [] };
}
async function revokeAgentCredential(tenantId, credentialId) {
    await (0, db_1.withTenantClient)(tenantId, async (client) => {
        await client.query(`UPDATE agent_credentials
       SET revoked_at = NOW()
       WHERE tenant_id = $1 AND credential_id = $2 AND revoked_at IS NULL`, [tenantId, credentialId]);
    });
}
async function listAgentCredentials(tenantId, actorId) {
    return (0, db_1.withTenantClient)(tenantId, async (client) => {
        const { rows } = await client.query(`SELECT credential_id, actor_id, scopes,
              created_at, expires_at, revoked_at, last_used_at
       FROM agent_credentials
       WHERE tenant_id = $1 AND actor_id = $2
       ORDER BY created_at DESC`, [tenantId, actorId]);
        return rows.map((r) => ({
            credentialId: r.credential_id,
            actorId: r.actor_id,
            scopes: r.scopes ?? [],
            createdAt: r.created_at.toISOString(),
            expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
            revokedAt: r.revoked_at ? r.revoked_at.toISOString() : null,
            lastUsedAt: r.last_used_at ? r.last_used_at.toISOString() : null,
        }));
    });
}
async function rotateAgentCredential(tenantId, actorId, credentialId, scopes = [], opts = {}) {
    await revokeAgentCredential(tenantId, credentialId);
    return issueAgentCredential(tenantId, actorId, scopes, opts);
}
//# sourceMappingURL=agent-credentials.service.js.map