import type { QueryResultLike, GenericRow } from '@dos/types';
import { safeQuery } from '@dos/db';
import { logger } from './logger';

export function getFirstRow<T = GenericRow>(result: QueryResultLike<T>): T | null {
  return result.rows.length > 0 ? result.rows[0] : null;
}

export function getFirstRowOrThrow<T = GenericRow>(
  result: QueryResultLike<T>,
  errorMsg = 'Expected at least one row',
): T {
  const row = getFirstRow(result);
  if (row === null) throw new Error(errorMsg);
  return row;
}

export function assertHasRows<T>(
  result: QueryResultLike<T>,
  errorMsg = 'Expected at least one row',
): asserts result is QueryResultLike<T> & { rows: [T, ...T[]] } {
  if (result.rows.length === 0) throw new Error(errorMsg);
}

export function rowCount(result: QueryResultLike): number {
  return result.rowCount ?? result.rows.length;
}

export function assertTenantId(tenantId: string | undefined | null): asserts tenantId is string {
  if (!tenantId) throw new Error('tenantId is required');
}

export function tenantSchema(tenantId: string): string {
  assertTenantId(tenantId);
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '')}`;
}

export async function safeRows(
  sql: string,
  params?: unknown[],
): Promise<GenericRow[]> {
  try {
    const res = await safeQuery(sql, params);
    return res.rows as GenericRow[];
  } catch (err: unknown) {
    logger.warn('[safeRows] query failed', { sql: sql.slice(0, 120) });
    return [];
  }
}

export type { QueryResultLike, GenericRow };
