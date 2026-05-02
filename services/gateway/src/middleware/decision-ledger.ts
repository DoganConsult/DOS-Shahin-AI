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
import { Pool } from 'pg';
import crypto from 'node:crypto';

let pool: Pool | null = null;

export function initDecisionLedger(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    console.warn('[gateway] decision-ledger DISABLED — DATABASE_URL not set');
    return;
  }
  pool = new Pool({
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

export interface WriteDecisionInput {
  /** Canonical action code, e.g. `gateway.ws.upgrade`, `gateway.session.bootstrap.read`. */
  action: string;
  userId: string;
  tenantId: string;
  allowed: boolean;
  /** Short, machine-readable reason code (e.g. `OK`, `MISSING_TOKEN`, `EXPIRED`). */
  reasonCode: string;
  /** Human-readable detail. Optional. */
  reason?: string;
  /** Correlation id from incoming request, if any. */
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  detail?: Record<string, unknown>;
}

/**
 * Write a single decision row. Best-effort: any DB error is logged and
 * swallowed so the calling auth decision is never blocked. Returns the
 * decision_id when successful, undefined otherwise.
 */
export async function writeDecision(input: WriteDecisionInput): Promise<string | undefined> {
  if (!pool) return undefined;
  const id = crypto.randomBytes(16).toString('hex');
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
  const params: unknown[] = [
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
    const row = rows[0] as { decision_id?: string } | undefined;
    return row?.decision_id ?? id;
  } catch (err) {
    // Fail-safe: never propagate ledger errors. Visible in logs.
    console.warn('[gateway] decision-ledger write failed', {
      action: input.action,
      allowed: input.allowed,
      reasonCode: input.reasonCode,
      err: (err as Error).message,
    });
    return undefined;
  }
}
