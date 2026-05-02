"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeDecision = exports.initDecisionLedger = void 0;
/**
 * Gateway-local decision-ledger writer (Wave 1).
 *
 * Writes to `platform_dauth.authz_decision_log` using the canonical column
 * shape (mirrors `platform/dauth/packages/shared/src/audit/decision-ledger.ts`).
 *
 * The gateway emits ledger rows for two decision points it owns directly:
 *   • WebSocket upgrade allow/deny (`gateway.ws.upgrade`)
 *   • Local API endpoints not delegated to a downstream service (e.g.
 *     `/api/session/bootstrap`, `/api/nudges/active` fallback).
 *
 * All other decisions (per-route `requirePermission` calls in downstream
 * services) write through the canonical DAuth path and do not pass through
 * here.
 *
 * Best-effort write semantics: a DB outage MUST NOT block an authentication
 * decision. Failures are logged at warn level and the request still
 * proceeds with the in-memory decision result.
 */
const pg_1 = require("pg");
const node_crypto_1 = __importDefault(require("node:crypto"));
let pool = null;
function initDecisionLedger(databaseUrl) {
    if (!databaseUrl) {
        console.warn('[gateway] decision-ledger DISABLED — DATABASE_URL not set');
        return;
    }
    pool = new pg_1.Pool({
        connectionString: databaseUrl,
        max: Number(process.env.DB_POOL_MAX_LEDGER || 4),
        // Short timeouts: ledger writes must never wedge the gateway.
        connectionTimeoutMillis: 1500,
        idleTimeoutMillis: 30_000,
    });
    pool.on('error', (err) => {
        console.warn('[gateway] decision-ledger pool error', err.message);
    });
}
exports.initDecisionLedger = initDecisionLedger;
/**
 * Write a single decision row. Best-effort: any DB error is logged and
 * swallowed so the calling auth decision is never blocked. Returns the
 * decision_id when successful, undefined otherwise.
 */
async function writeDecision(input) {
    if (!pool)
        return undefined;
    const id = node_crypto_1.default.randomBytes(16).toString('hex');
    const sql = `
    INSERT INTO platform_dauth.authz_decision_log (
      id,
      tenant_id, user_id, action,
      allowed, reason,
      detail,
      request_path, request_method, ip_address, user_agent,
      correlation_id, reason_code
    ) VALUES (
      $1,
      $2, $3, $4,
      $5, $6,
      COALESCE($7::jsonb, '{}'::jsonb),
      $8, $9, $10, $11,
      $12, $13
    )
    RETURNING decision_id::text AS decision_id
  `;
    const params = [
        id,
        input.tenantId || '', input.userId || 'anonymous', input.action,
        input.allowed, input.reason ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
        input.requestPath ?? null, input.requestMethod ?? null,
        input.ipAddress ?? null, input.userAgent ?? null,
        input.correlationId ?? null, input.reasonCode ?? null,
    ];
    try {
        const { rows } = await pool.query(sql, params);
        const row = rows[0];
        return row?.decision_id ?? id;
    }
    catch (err) {
        // Fail-safe: never propagate ledger errors. Visible in logs.
        console.warn('[gateway] decision-ledger write failed', {
            action: input.action,
            allowed: input.allowed,
            reasonCode: input.reasonCode,
            err: err.message,
        });
        return undefined;
    }
}
exports.writeDecision = writeDecision;
//# sourceMappingURL=decision-ledger.js.map