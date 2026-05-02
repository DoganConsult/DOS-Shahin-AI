"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuthDecision = writeAuthDecision;
exports.readAuthDecision = readAuthDecision;
/**
 * Insert a decision into `platform_dauth.authz_decision_log`. Uses the live column
 * shape (after migration 011). `id` is varchar(64) in the live schema and
 * is required; callers MUST supply one. `decision_id` uses the column
 * DEFAULT (uuidv7 or gen_random_uuid) when omitted.
 *
 * Returns the `decision_id` so the caller can hand it to explainDecision.
 */
async function writeAuthDecision(client, input) {
    const id = input.decisionId ?? generateLocalId();
    const sql = `
    INSERT INTO platform_dauth.authz_decision_log (
      id,
      tenant_id, user_id, action, entity_type, entity_id,
      scope_type, scope_id, allowed, reason,
      authority, delegated, duration_ms, event_type, actor_id, target_id,
      detail,
      request_path, request_method, ip_address, user_agent, session_id,
      delegation_chain, sod_check_result, evaluation_steps,
      decision_id, correlation_id,
      reason_code, reason_codes,
      policy_version, model_version,
      engine_results, obligations
    ) VALUES (
      $1,
      $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17,
      $18, $19, $20, $21, $22,
      $23, $24, $25,
      COALESCE($26::uuid, gen_random_uuid()), $27,
      $28, COALESCE($29::text[], '{}'::text[]),
      $30, $31,
      COALESCE($32::jsonb, '{}'::jsonb),
      COALESCE($33::jsonb, '{}'::jsonb)
    )
    RETURNING decision_id::text AS decision_id
  `;
    const params = [
        id,
        input.tenantId, input.userId, input.action, input.entityType ?? null, input.entityId ?? null,
        input.scopeType ?? null, input.scopeId ?? null, input.allowed, input.reason ?? null,
        input.authority ?? null, input.delegated ?? null, input.durationMs ?? null,
        input.eventType ?? null, input.actorId ?? null, input.targetId ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
        input.requestPath ?? null, input.requestMethod ?? null, input.ipAddress ?? null,
        input.userAgent ?? null, input.sessionId ?? null,
        JSON.stringify(input.delegationChain ?? []),
        JSON.stringify(input.sodCheckResult ?? {}),
        JSON.stringify(input.evaluationSteps ?? []),
        input.decisionId ?? null,
        input.correlationId ?? null,
        input.reasonCode ?? null,
        input.reasonCodes ?? null,
        input.policyVersion ?? null,
        input.modelVersion ?? null,
        input.engineResults ? JSON.stringify(input.engineResults) : null,
        input.obligations ? JSON.stringify(input.obligations) : null,
    ];
    const { rows } = await client.query(sql, params);
    const row = rows[0];
    return row?.decision_id ?? id;
}
/**
 * Fetch a decision row by decision_id. Returns null if not found. Used by
 * explainDecision / replayDecision in Part 6+.
 */
async function readAuthDecision(client, decisionId) {
    const { rows } = await client.query(`SELECT * FROM platform_dauth.authz_decision_log WHERE decision_id = $1::uuid LIMIT 1`, [decisionId]);
    return rows[0] ?? null;
}
/**
 * Fallback id generator for rows written to the varchar(64) `id` column
 * when the caller did not supply one. Mirrors uuidv7() shape (36 chars)
 * so lexicographic ordering tracks insert time on newer Postgres majors.
 */
function generateLocalId() {
    // Minimal uuid v4 generator; PG column is varchar(64) so any unique 36+ char
    // string is acceptable. This does not replace the `decision_id uuid` column
    // which is DB-DEFAULTed to uuidv7()/gen_random_uuid() at migration time.
    const bytes = new Uint8Array(16);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        globalThis.crypto.getRandomValues(bytes);
    }
    else {
        for (let i = 0; i < 16; i++)
            bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
//# sourceMappingURL=decision-ledger.js.map