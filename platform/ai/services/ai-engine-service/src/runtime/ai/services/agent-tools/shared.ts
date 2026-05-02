// ================================================================
// AGRC-OS — Agent Tools: Shared Utilities
// Common helpers used by all agent tool builders.
// ================================================================

import { safeQuery } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';

/**
 * Execute a SQL query and return rows, swallowing errors (returns []).
 * Used by all agent tool handlers to safely query tenant data.
 */
export async function safeRows(text: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
  try {
    const res = await safeQuery(text, params);
    return res.rows;
  } catch (err: unknown) {
    logger.warn('[safeRows] query failed', { sql: text.slice(0, 80), error: toErrorMessage(err) });
    return [];
  }
}
