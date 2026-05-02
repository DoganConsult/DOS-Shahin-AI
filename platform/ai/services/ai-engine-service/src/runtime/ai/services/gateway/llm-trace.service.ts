import { safeQuery } from "@dos/db";

/**
 * @deprecated @removal-date 2026-09-30 @owner AI @replacement services/llm/llm-trace.service.ts
 *
 * Re-export barrel — canonical llm-trace lives in the llm/ directory.
 * This gateway/ path exists for backward compatibility.
 */
export * from '../llm/llm-trace.service';
