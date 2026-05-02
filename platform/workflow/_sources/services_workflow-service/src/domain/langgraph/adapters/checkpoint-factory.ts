import { logger } from '@dos/platform-core/observability';
// ============================================
// Checkpoint Factory — singleton PostgreSQL saver
// Used by all LangGraph graph compilations.
// ============================================

import { getPool, safeQuery } from '@dos/db';
import { PostgresCheckpointSaver } from './checkpoint-postgres';
import { getFirstRow } from '../../utils/db-utils';

let _saver: PostgresCheckpointSaver | null = null;

/**
 * Returns a singleton PostgresCheckpointSaver backed by the master pool.
 * All graph compilations should use this to enable state persistence.
 */
export function getCheckpointSaver(): PostgresCheckpointSaver {
  if (!_saver) {
    _saver = new PostgresCheckpointSaver(getPool());
  }
  return _saver;
}

/**
 * Verifies that the langgraph_checkpoints table exists and is accessible.
 * Called during server startup to ensure LangGraph can function properly.
 * @returns true if table exists and is accessible, false otherwise
 */
export async function verifyCheckpointTable(): Promise<boolean> {
  try {
    const result = await safeQuery(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'langgraph_checkpoints'
      ) as table_exists`
    );
    const exists = getFirstRow(result)?.table_exists === true;
    
    if (exists) {
      // Also verify we can query it (permissions check)
      await safeQuery('SELECT COUNT(*) FROM langgraph_checkpoints LIMIT 1');
    }
    
    return exists;
  } catch (err) {
    logger.warn('[CheckpointFactory] Failed to verify checkpoint table: ' + (err instanceof Error ? err.message : String(err)));
    return false;
  }
}
