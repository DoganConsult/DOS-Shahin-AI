// ================================================================
// AGRC-OS — Agent Tools: Shared Utilities
// Common helpers used by all agent tool builders.
// ================================================================
import { safeQuery } from '../../ports/database.port.js';
import { logger } from '../../ports/logger.port.js';
import { toErrorMessage } from '@dos/module-sdk';
/**
 * Execute a SQL query and return rows, swallowing errors (returns []).
 * Used by all agent tool handlers to safely query tenant data.
 */
export async function safeRows(text, params) {
    try {
        const res = await safeQuery(text, params);
        return res.rows;
    }
    catch (err) {
        logger.warn('[safeRows] query failed', { sql: text.slice(0, 80), error: toErrorMessage(err) });
        return [];
    }
}
//# sourceMappingURL=shared.js.map