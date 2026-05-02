import { safeQuery } from '@dos/db';

export { safeQuery, query, getFirstRow, emptyResult } from '@dos/db';
export { tenantSchema } from '@dos/db';

/**
 * Returns true when the given column exists on `<schema>.<table>` in the
 * current database. Used by the Temporal vector-search util to opportunistic-
 * ally run embedding/nearest-neighbor queries only when the column has
 * been migrated. Errors are treated as "column not present" — the caller
 * already falls back on keyword search in that case.
 */
export async function columnExists(
  schema: string,
  table: string,
  column: string,
): Promise<boolean> {
  try {
    const res = await safeQuery(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name   = $2
          AND column_name  = $3
        LIMIT 1`,
      [schema, table, column],
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
}
