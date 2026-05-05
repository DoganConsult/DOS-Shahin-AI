/**
 * OpenClaw A2A (Agent-to-Agent) Message Queue.
 *
 * Uses PostgreSQL as the backing store for inter-agent messages.
 * Redis is used for pub/sub notification when new messages arrive.
 *
 * Message lifecycle:
 *   enqueue → pending → dequeue (status: processing) → ack/nack
 *
 * Table: {tenant_schema}.a2a_messages (auto-created if missing)
 */
import { safeQuery, tenantSchema } from '@dos/db';
async function ensureTable(schema) {
    await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".a2a_messages (
      message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'handoff',
      payload JSONB NOT NULL DEFAULT '{}',
      priority INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      error_message TEXT
    )
  `);
}
/**
 * Enqueue a message from one agent to another.
 */
export async function enqueueA2AMessage(tenantId, fromAgentId, toAgentId, messageType, payload, priority = 0) {
    const schema = tenantSchema(tenantId);
    await ensureTable(schema);
    const result = await safeQuery(`INSERT INTO "${schema}".a2a_messages
       (from_agent_id, to_agent_id, message_type, payload, priority, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING message_id`, [fromAgentId, toAgentId, messageType, JSON.stringify(payload), priority]);
    const messageId = result.rows[0]?.message_id || '';
    // Notify via Redis pub/sub (non-blocking, best-effort)
    try {
        const { notifyNewMessage } = await import('./a2a-redis-notifier');
        notifyNewMessage(tenantId, toAgentId, messageId).catch(() => { });
    }
    catch { /* Redis notifier not available — consumer will poll */ }
    return messageId;
}
/**
 * Dequeue pending messages for a specific agent.
 * Marks them as 'processing' atomically.
 */
export async function dequeueA2AMessages(tenantId, agentId, limit = 10) {
    const schema = tenantSchema(tenantId);
    await ensureTable(schema);
    const result = await safeQuery(`UPDATE "${schema}".a2a_messages
     SET status = 'processing', processed_at = NOW()
     WHERE message_id IN (
       SELECT message_id FROM "${schema}".a2a_messages
       WHERE to_agent_id = $1 AND status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     RETURNING message_id, from_agent_id, to_agent_id, message_type, payload, priority, status, created_at`, [agentId, limit]);
    return result.rows.map(row => ({
        messageId: row.message_id,
        fromAgentId: row.from_agent_id,
        toAgentId: row.to_agent_id,
        messageType: row.message_type,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
    }));
}
/**
 * Acknowledge a processed message (mark as completed).
 */
export async function ackA2AMessage(tenantId, messageId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".a2a_messages
     SET status = 'completed', completed_at = NOW()
     WHERE message_id = $1`, [messageId]);
}
/**
 * Negative acknowledge — mark as failed for retry or investigation.
 */
export async function nackA2AMessage(tenantId, messageId, errorMessage) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".a2a_messages
     SET status = 'failed', error_message = $1, completed_at = NOW()
     WHERE message_id = $2`, [errorMessage, messageId]);
}
/**
 * Get message queue stats for a tenant.
 */
export async function getA2AQueueStats(tenantId) {
    const schema = tenantSchema(tenantId);
    await ensureTable(schema);
    const result = await safeQuery(`SELECT status, COUNT(*)::int AS count
     FROM "${schema}".a2a_messages
     WHERE created_at > NOW() - INTERVAL '24 hours'
     GROUP BY status`);
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of result.rows) {
        stats[row.status] = row.count;
    }
    return stats;
}
//# sourceMappingURL=agent-message-queue.js.map