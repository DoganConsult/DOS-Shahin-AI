// AI-OS Wave 4.5 — Conversation-memory writer/reader for ai_drafts.
//
// Per-tenant, per-session, ordered list of (role, content, metadata)
// turns. Used by the copilot route + agent-runner to replay prior turns
// before the next LLM call. Persisted in <tenant>.ai_drafts.
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
/**
 * Append one turn to the conversation. Marks it as the latest and
 * unflips the previous latest in the same session. Best-effort:
 * persistence failures are logged and swallowed so the user-visible
 * call never fails on memory issues.
 */
export async function appendDraft(input) {
    if (!input.tenantId || !input.sessionId || !input.agentCode)
        return { draftId: null, turnIdx: 0 };
    try {
        const schema = tenantSchema(input.tenantId);
        // Fetch the next turn index for this session, atomically.
        const r = await safeQuery(`SELECT COALESCE(MAX(turn_idx) + 1, 0) AS next_idx
         FROM "${schema}".ai_drafts
        WHERE tenant_id = $1 AND session_id = $2`, [input.tenantId, input.sessionId]);
        const nextIdx = Number(r.rows?.[0]?.next_idx ?? 0);
        // Demote prior latest.
        await safeQuery(`UPDATE "${schema}".ai_drafts
          SET is_latest = FALSE, updated_at = NOW()
        WHERE tenant_id = $1 AND session_id = $2 AND is_latest = TRUE`, [input.tenantId, input.sessionId]);
        const expires = input.ttlSeconds
            ? `NOW() + ($6 || ' seconds')::interval`
            : `NULL`;
        const params = [
            input.tenantId,
            input.sessionId,
            input.userId ?? null,
            input.agentCode,
            input.role,
            input.ttlSeconds ?? null,
            nextIdx,
            input.content,
            JSON.stringify(input.metadata ?? {}),
        ];
        const ins = await safeQuery(`INSERT INTO "${schema}".ai_drafts
         (tenant_id, session_id, user_id, agent_code, role, expires_at, turn_idx, content, metadata, is_latest)
       VALUES ($1, $2, $3, $4, $5, ${expires}, $7, $8, $9::jsonb, TRUE)
       RETURNING draft_id`, params);
        return { draftId: String(ins.rows?.[0]?.draft_id ?? ''), turnIdx: nextIdx };
    }
    catch (err) {
        logger.warn(`[conversation-memory] appendDraft failed: ${err.message}`);
        return { draftId: null, turnIdx: 0 };
    }
}
/**
 * Load the recent N turns for a session (default 6). Caller is expected
 * to render them into the LLM messages array before the next call.
 */
export async function loadRecentTurns(tenantId, sessionId, limit = 6) {
    if (!tenantId || !sessionId)
        return [];
    try {
        const schema = tenantSchema(tenantId);
        const r = await safeQuery(`SELECT role, content, metadata
         FROM "${schema}".ai_drafts
        WHERE tenant_id = $1 AND session_id = $2
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY turn_idx ASC
        LIMIT $3`, [tenantId, sessionId, limit]);
        return (r.rows || []).map((row) => ({
            role: row.role,
            content: String(row.content ?? ''),
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {}),
        }));
    }
    catch (err) {
        logger.warn(`[conversation-memory] loadRecentTurns failed: ${err.message}`);
        return [];
    }
}
//# sourceMappingURL=conversation-memory.service.js.map