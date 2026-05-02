import { logger } from '@dos/platform-core/observability';
// ============================================
// LangGraph PostgreSQL Checkpoint Saver
// Persists agent graph state for resume-from-failure
// Uses existing pg Pool from database.ts
// ============================================

import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { CheckpointTuple } from '@langchain/langgraph';
import type { Pool } from '@dos/db';
import { safeQuery } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';

/**
 * PostgreSQL-backed checkpoint saver for LangGraph.
 * Stores checkpoints in the `langgraph_checkpoints` table (public schema).
 *
 * Migration: 114_langgraph_checkpoints.sql (Phase 3)
 */
export class PostgresCheckpointSaver extends BaseCheckpointSaver {
  private pool: Pool;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointId = config.configurable?.checkpoint_id as string | undefined;
    const tenantId = config.configurable?.tenant_id as string | undefined;

    if (!threadId) return undefined;

    let query: string;
    let params: unknown[];

    if (checkpointId && tenantId) {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND checkpoint_id = $2 AND tenant_id = $3`;
      params = [threadId, checkpointId, tenantId];
    } else if (checkpointId) {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND checkpoint_id = $2`;
      params = [threadId, checkpointId];
    } else if (tenantId) {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND tenant_id = $2
               ORDER BY created_at DESC LIMIT 1`;
      params = [threadId, tenantId];
    } else {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1
               ORDER BY created_at DESC LIMIT 1`;
      params = [threadId];
    }

    const { rows } = await safeQuery(query, params);
    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      config: {
        configurable: {
          thread_id: row.thread_id,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint: row.checkpoint as Checkpoint,
      metadata: (row.metadata || {}) as CheckpointMetadata,
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

  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig },
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id as string;
    if (!threadId) return;

    const tenantId = config.configurable?.tenant_id as string | undefined;
    const limit = options?.limit ?? 100;
    const beforeId = options?.before?.configurable?.checkpoint_id as string | undefined;

    let query: string;
    let params: unknown[];

    if (beforeId && tenantId) {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND tenant_id = $4 AND created_at < (
                 SELECT created_at FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_id = $2
               )
               ORDER BY created_at DESC LIMIT $3`;
      params = [threadId, beforeId, limit, tenantId];
    } else if (beforeId) {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND created_at < (
                 SELECT created_at FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_id = $2
               )
               ORDER BY created_at DESC LIMIT $3`;
      params = [threadId, beforeId, limit];
    } else if (tenantId) {
      query = `SELECT thread_id, checkpoint_id, parent_id, checkpoint, metadata
               FROM langgraph_checkpoints
               WHERE thread_id = $1 AND tenant_id = $3
               ORDER BY created_at DESC LIMIT $2`;
      params = [threadId, limit, tenantId];
    } else {
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
        checkpoint: row.checkpoint as Checkpoint,
        metadata: (row.metadata || {}) as CheckpointMetadata,
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

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id as string;
    const parentId = config.configurable?.checkpoint_id as string | undefined;
    const checkpointId = checkpoint.id;

    const tenantId = config.configurable?.tenant_id as string | undefined;

    try {
      await this.pool.query(
        `INSERT INTO langgraph_checkpoints (thread_id, checkpoint_id, parent_id, checkpoint, metadata, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (thread_id, checkpoint_id) DO UPDATE
         SET checkpoint = $4, metadata = $5, tenant_id = COALESCE($6, langgraph_checkpoints.tenant_id)`,
        [threadId, checkpointId, parentId || null, JSON.stringify(checkpoint), JSON.stringify(metadata), tenantId || null],
      );
    } catch (err: unknown) {
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

  async putWrites(
    config: RunnableConfig,
    writes: Array<[string, any]>,
    taskId: string,
  ): Promise<void> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointId = config.configurable?.checkpoint_id as string;
    if (!threadId || !checkpointId) return;

    // Store writes as part of checkpoint metadata for replay
    try {
      await this.pool.query(
        `UPDATE langgraph_checkpoints
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{writes}',
           COALESCE(metadata->'writes', '[]'::jsonb) || $1::jsonb
         )
         WHERE thread_id = $2 AND checkpoint_id = $3`,
        [JSON.stringify({ taskId, writes }), threadId, checkpointId],
      );
    } catch (err: unknown) {
      logger.error('Checkpoint putWrites failed:', { threadId, checkpointId, taskId, error: toErrorMessage(err) });
      throw err;
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      await this.pool.query(
        `DELETE FROM langgraph_checkpoints WHERE thread_id = $1`,
        [threadId],
      );
    } catch (err: unknown) {
      logger.error('Checkpoint deleteThread failed:', { threadId, error: toErrorMessage(err) });
      throw err;
    }
  }
}
