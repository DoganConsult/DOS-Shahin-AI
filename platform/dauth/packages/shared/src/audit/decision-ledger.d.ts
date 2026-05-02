/**
 * DAuth canonical decision-ledger writer — writes to `platform_dauth.authz_decision_log`
 * using the real live column shape.
 *
 * History: the older `audit/decision-log.service.ts` in both
 * `services/auth-service` and `packages/dos-auth` writes to
 * `"${tenantSchema}".authz_decision_log` with a column set that does NOT
 * match the production schema (`decision` vs `allowed`, `permission_code`
 * vs `action`, `record_context` vs `detail`, etc.) — so every write has
 * been silently failing on the live DB. This helper fixes that by writing
 * with the real columns, into `platform_dauth.authz_decision_log` directly, and is the
 * canonical entrypoint for the DAuth-ECP port layer (Phase 2+ verify,
 * Phase 3 Cerbos wrapper, Phase 4 OpenFGA wrapper, etc.).
 *
 * Part 3 of DAuth-ECP-COMPLETE. See
 * docs/architecture/DAUTH-ECP-PART3-LEDGER-SCHEMA.md.
 */
export interface WriteDecisionInput {
    /** Decision id — defaults to uuidv7()/gen_random_uuid() when omitted. */
    decisionId?: string;
    tenantId: string;
    userId: string;
    /** e.g. 'evidence.approve', 'tenant.invite' */
    action: string;
    entityType?: string;
    entityId?: string;
    scopeType?: string;
    scopeId?: string;
    allowed: boolean;
    reason?: string;
    authority?: string;
    delegated?: boolean;
    durationMs?: number;
    eventType?: string;
    actorId?: string;
    targetId?: string;
    /** Free-form diagnostic payload (JSON-serialized into the TEXT `detail` col). */
    detail?: Record<string, unknown>;
    requestPath?: string;
    requestMethod?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    delegationChain?: Record<string, unknown>[];
    sodCheckResult?: Record<string, unknown>;
    evaluationSteps?: Record<string, unknown>[];
    correlationId?: string;
    reasonCode?: string;
    reasonCodes?: string[];
    policyVersion?: string;
    modelVersion?: string;
    engineResults?: Record<string, unknown>;
    obligations?: Record<string, unknown>;
}
/** Minimal SQL client surface so this helper does not bind to pg/@dos-db. */
export interface SqlClient {
    query(sql: string, params: unknown[]): Promise<{
        rows: unknown[];
    }>;
}
/**
 * Insert a decision into `platform_dauth.authz_decision_log`. Uses the live column
 * shape (after migration 011). `id` is varchar(64) in the live schema and
 * is required; callers MUST supply one. `decision_id` uses the column
 * DEFAULT (uuidv7 or gen_random_uuid) when omitted.
 *
 * Returns the `decision_id` so the caller can hand it to explainDecision.
 */
export declare function writeAuthDecision(client: SqlClient, input: WriteDecisionInput): Promise<string>;
/**
 * Fetch a decision row by decision_id. Returns null if not found. Used by
 * explainDecision / replayDecision in Part 6+.
 */
export declare function readAuthDecision(client: SqlClient, decisionId: string): Promise<Record<string, unknown> | null>;
