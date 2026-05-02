/**
 * @deprecated @removal-date 2026-06-30 @owner DOS @replacement ../../utils/db-utils
 *
 * Re-export from canonical location. New code must import from
 * utils/db-utils directly (backend/src/utils/db-utils.ts).
 *
 * This shim exists to prevent broken imports if any AI module code
 * referenced this path historically.
 */
export { getFirstRow, getFirstRowOrThrow, } from '@dos/db';
//# sourceMappingURL=db-utils.js.map