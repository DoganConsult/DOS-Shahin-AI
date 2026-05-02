// @ts-nocheck
import { safeQuery } from "@dos/db";

/**
 * Contextual AI Service — Re-export Barrel (legacy path)
 *
 * Delegates to the canonical implementation under modules/platform/services/contextual-ai/.
 * All exports are preserved for backward compatibility with consumers
 * that import from this path.
 */
export * from '../../../../runtime/ai/index';
