import { safeQuery as _safeQuery } from '@dos/db';

export { safeQuery, query, getFirstRow, emptyResult } from '@dos/db';
export { tenantSchema } from '@dos/db';

export async function columnExists(schema: string, tableName: string, columnName: string): Promise<boolean> {
  const result = await _safeQuery(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
     LIMIT 1`,
    [schema, tableName, columnName],
  );
  return result.rowCount > 0;
}
