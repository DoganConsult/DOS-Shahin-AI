/**
 * Route-level tenant query helper.
 *
 * Foundation route files were originally written with raw `safeQuery(sql, params)`
 * calls that bypassed tenant isolation. This helper is a drop-in replacement that
 * routes the call through `withTenantClient` using `req.tenantId`, so RLS policies
 * and search_path scoping apply.
 *
 * NOTE: this keeps SQL inline in routes for now — it is the minimum change that
 * achieves tenant isolation. A follow-up should extract each foundation entity
 * into its own `<entity>.service.ts` the same way user/team/role were extracted.
 */
import type { Request } from 'express';
import type { QueryResult, QueryResultRow } from '../../ports/database.port';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';
import { UserServiceError } from '../../contracts/user-errors';

export async function tenantQuery<R extends QueryResultRow = QueryResultRow>(
  req: Request,
  text: string,
  params?: unknown[],
  opName?: string,
): Promise<QueryResult<R>> {
  const tenantId = req.tenantId;
  if (!tenantId) {
    throw new UserServiceError('TENANT_CONTEXT_MISSING');
  }
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, (c) => c.query<R>(text, params));
  } finally {
    userMetrics.observeDb(opName ?? 'foundation.query', Date.now() - start);
  }
}
