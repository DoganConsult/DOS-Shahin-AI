import { logger } from '@dos/platform-core/observability';
// ============================================
// LangGraph PostgreSQL Checkpoint Saver
// Persists agent graph state for resume-from-failure
// Uses existing pg Pool from database.ts
// ============================================
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { safeQuery } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';
/**
 * PostgreSQL-backed checkpoint saver for LangGraph.
 * Stores checkpoints in the `langgraph_checkpoints` table (public schema).
 *
 * Migration: 114_langgraph_checkpoints.sql (Phase 3)
 */
export class PostgresCheckpointSaver extends BaseCheckpointSaver {
    pool;
    constructor(pool) {
        super();
        this.pool = pool;
    }
    async getTuple(config) {
        const threadId = config.configurable?.thread_id;
        const checkpointId = config.configurable?.checkpoint_id;
        const tenantId = config.configurable?.tenant_id;
        if (!threadId)
            return undefined;
        let query;
        let params;
        if (checkpointId && tenantId) {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND checkpoint_id = $2 AND tenant_id = $3`;
            params = [threadId, checkpointId, tenantId];
        }
        else if (checkpointId) {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND checkpoint_id = $2`;
            params = [threadId, checkpointId];
        }
        else if (tenantId) {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND tenant_id = $2
               ORDER BY created_at DESC LIMIT 1`;
            params = [threadId, tenantId];
        }
        else {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1
               ORDER BY created_at DESC LIMIT 1`;
            params = [threadId];
        }
        const { rows } = await safeQuery(query, params);
        if (rows.length === 0)
            return undefined;
        const row = rows[0];
        return {
            config: {
                configurable: {
                    thread_id: row.thread_id,
                    checkpoint_id: row.checkpoint_id,
                },
            },
            checkpoint: row.checkpoint,
            metadata: (row.metadata || {}),
            parentConfig: row.parent_id
                ? {
                    configurable: {
                        thread_id: row.thread_id,
                        checkpoint_id: row.parent_id,
                    },
                }
                : undefined,
        };
    }
    async *list(config, options) {
        const threadId = config.configurable?.thread_id;
        if (!threadId)
            return;
        const tenantId = config.configurable?.tenant_id;
        const limit = options?.limit ?? 100;
        const beforeId = options?.before?.configurable?.checkpoint_id;
        let query;
        let params;
        if (beforeId && tenantId) {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND tenant_id = $4 AND created_at < (
                 SELECT created_at FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_id = $2
               )
               ORDER BY created_at DESC LIMIT $3`;
            params = [threadId, beforeId, limit, tenantId];
        }
        else if (beforeId) {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND created_at < (
                 SELECT created_at FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_id = $2
               )
               ORDER BY created_at DESC LIMIT $3`;
            params = [threadId, beforeId, limit];
        }
        else if (tenantId) {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND tenant_id = $3
               ORDER BY created_at DESC LIMIT $2`;
            params = [threadId, limit, tenantId];
        }
        else {
            query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1
               ORDER BY created_at DESC LIMIT $2`;
            params = [threadId, limit];
        }
        const { rows } = await safeQuery(query, params);
        for (const row of rows) {
            yield {
                config: {
                    configurable: {
                        thread_id: row.thread_id,
                        checkpoint_id: row.checkpoint_id,
                    },
                },
                checkpoint: row.checkpoint,
                metadata: (row.metadata || {}),
                parentConfig: row.parent_id
                    ? {
                        configurable: {
                            thread_id: row.thread_id,
                            checkpoint_id: row.parent_id,
                        },
                    }
                    : undefined,
            };
        }
    }
    async put(config, checkpoint, metadata) {
        const threadId = config.configurable?.thread_id;
        const parentId = config.configurable?.checkpoint_id;
        const checkpointId = checkpoint.id;
        const tenantId = config.configurable?.tenant_id;
        try {
            await this.pool.query(`INSERT INTO langgraph_checkpoints (thread_id, checkpoint_id, parent_id, checkpoint, metadata, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (thread_id, checkpoint_id) DO UPDATE
         SET checkpoint = $4, metadata = $5, tenant_id = COALESCE($6, langgraph_checkpoints.tenant_id)`, [threadId, checkpointId, parentId || null, JSON.stringify(checkpoint), JSON.stringify(metadata), tenantId || null]);
        }
        catch (err) {
            logger.error('Checkpoint put failed:', { threadId, checkpointId, error: toErrorMessage(err) });
            throw err;
        }
        return {
            configurable: {
                thread_id: threadId,
                checkpoint_id: checkpointId,
            },
        };
    }
    async putWrites(config, writes, taskId) {
        const threadId = config.configurable?.thread_id;
        const checkpointId = config.configurable?.checkpoint_id;
        if (!threadId || !checkpointId)
            return;
        // Store writes as part of checkpoint metadata for replay
        try {
            await this.pool.query(`UPDATE langgraph_checkpoints
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{writes}',
           COALESCE(metadata->'writes', '[]'::jsonb) || $1::jsonb
         )
         WHERE thread_id = $2 AND checkpoint_id = $3`, [JSON.stringify({ taskId, writes }), threadId, checkpointId]);
        }
        catch (err) {
            logger.error('Checkpoint putWrites failed:', { threadId, checkpointId, taskId, error: toErrorMessage(err) });
            throw err;
        }
    }
    async deleteThread(threadId) {
        try {
            await this.pool.query(`DELETE FROM langgraph_checkpoints WHERE thread_id = $1`, [threadId]);
        }
        catch (err) {
            logger.error('Checkpoint deleteThread failed:', { threadId, error: toErrorMessage(err) });
            throw err;
        }
    }
}
//# sourceMappingURL=checkpoint-postgres.js.map