/**
 * DAuth Audit — decision logging to authz_decision_log.
 * §Q.1: Every sensitive decision logs actor, tenant, permission, scope, outcome, reason.
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

/** Filter options for querying the decision log. */
export interface DecisionLogFilter {
  userId?: string;
  permissionCode?: string;
  decision?: 'allow' | 'deny';
  moduleCode?: string;
  correlationId?: string;
  /** Filter by one or more canonical reason codes. Matches any. */
  reasonCodes?: string[];
  /** Filter by policy-pack version (e.g. `evidence.approve@1.4.0`). */
  policyVersion?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/** A single entry from the authz_decision_log table. */
export interface DecisionLogEntry {
  logId: string;
  userId: string;
  permissionCode: string;
  moduleCode: string | null;
  decision: 'allow' | 'deny';
  reason: string;
  matchedRole: string | null;
  scopeType: string | null;
  authorityLevel: string | null;
  correlationId: string | null;
  context: Record<string, unknown>;
  createdAt: string;
  /** Derived from context.reasonCode — stable surface for downstream code. */
  reasonCode?: string;
  /** Derived from context.policyVersion. */
  policyVersion?: string;
  /** Derived from context.modelVersion. */
  modelVersion?: string;
  /** Derived from context.engineResults — per-engine verdicts. */
  engineResults?: Record<string, unknown>;
  /** Derived from context.obligations. */
  obligations?: Record<string, unknown>;
}

/** Aggregated summary of decisions over a time range. */
export interface DecisionSummary {
  totalDecisions: number;
  allowCount: number;
  denyCount: number;
  topDeniedPermissions: { permissionCode: string; count: number }[];
}

export async function logAuthDecision(
  tenantId: string,
  data: {
    userId: string;
    permissionCode: string;
    moduleCode?: string;
    decision: 'allow' | 'deny';
    reason: string;
    matchedRole?: string;
    scopeType?: string;
    authorityLevel?: string;
    correlationId?: string;
    context?: Record<string, unknown>;
    /** Canonical reason code from `contracts/reason-codes.ts`. */
    reasonCode?: string;
    /** Policy pack + semver, e.g. `evidence.approve@1.4.0`. */
    policyVersion?: string;
    /** ReBAC model version (OpenFGA auth model id). */
    modelVersion?: string;
    /** Per-engine verdicts captured during shadow/enforce mode. */
    engineResults?: Record<string, unknown>;
    /** Obligations the caller must honor on allow. */
    obligations?: Record<string, unknown>;
  },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const enriched = {
    ...(data.context || {}),
    reasonCode: data.reasonCode,
    reasonCodes: data.reasonCode ? [data.reasonCode] : undefined,
    policyVersion: data.policyVersion,
    modelVersion: data.modelVersion,
    engineResults: data.engineResults,
    obligations: data.obligations,
  };
  await safeQuery(
    `INSERT INTO "${schema}".authz_decision_log
     (user_id, permission_code, module_code, decision, reason, matched_role,
      matched_scope_type, authority_level, correlation_id, record_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      data.userId, data.permissionCode, data.moduleCode || null,
      data.decision, data.reason, data.matchedRole || null,
      data.scopeType || null, data.authorityLevel || null,
      data.correlationId || null,
      JSON.stringify(enriched),
    ],
  );
}

/**
 * Query the decision log with flexible filters and pagination.
 * Supports filtering by userId, permissionCode, decision, moduleCode,
 * correlationId, and date range.
 */
export async function queryDecisionLog(
  tenantId: string,
  filters: DecisionLogFilter,
): Promise<{ entries: DecisionLogEntry[]; total: number }> {
  const schema = tenantSchema(tenantId);
  logger.info('dauth.audit: querying decision log', { tenantId, filters });

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.userId) {
    conditions.push(`user_id = $${paramIdx++}`);
    params.push(filters.userId);
  }
  if (filters.permissionCode) {
    conditions.push(`permission_code = $${paramIdx++}`);
    params.push(filters.permissionCode);
  }
  if (filters.decision) {
    conditions.push(`decision = $${paramIdx++}`);
    params.push(filters.decision);
  }
  if (filters.moduleCode) {
    conditions.push(`module_code = $${paramIdx++}`);
    params.push(filters.moduleCode);
  }
  if (filters.correlationId) {
    conditions.push(`correlation_id = $${paramIdx++}`);
    params.push(filters.correlationId);
  }
  if (filters.reasonCodes && filters.reasonCodes.length > 0) {
    // Two independent placeholder sets: one for scalar match, one for array overlap
    const scalarPlaceholders = filters.reasonCodes.map(() => `$${paramIdx++}`).join(', ');
    params.push(...filters.reasonCodes);
    const arrayParamIdx = paramIdx++;
    params.push(filters.reasonCodes);
    conditions.push(
      `(record_context->>'reasonCode' IN (${scalarPlaceholders}) OR record_context->'reasonCodes' ?| $${arrayParamIdx}::text[])`,
    );
  }
  if (filters.policyVersion) {
    conditions.push(`record_context->>'policyVersion' = $${paramIdx++}`);
    params.push(filters.policyVersion);
  }
  if (filters.dateFrom) {
    conditions.push(`created_at >= $${paramIdx++}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`created_at <= $${paramIdx++}`);
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  // Get total count
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".authz_decision_log ${where}`,
    params,
  );

  // Get paginated entries
  const dataResult = await safeQuery(
    `SELECT id, user_id, permission_code, module_code, decision, reason,
            matched_role, matched_scope_type, authority_level, correlation_id,
            record_context, created_at
     FROM "${schema}".authz_decision_log ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset],
  );

  const entries: DecisionLogEntry[] = dataResult.rows.map(( r: any) => {
    const ctx = (r.record_context ?? {}) as Record<string, unknown>;
    return {
      logId: r.id,
      userId: r.user_id,
      permissionCode: r.permission_code,
      moduleCode: r.module_code,
      decision: r.decision,
      reason: r.reason,
      matchedRole: r.matched_role,
      scopeType: r.matched_scope_type,
      authorityLevel: r.authority_level,
      correlationId: r.correlation_id,
      context: ctx,
      createdAt: r.created_at,
      reasonCode: typeof ctx.reasonCode === 'string' ? ctx.reasonCode : undefined,
      policyVersion: typeof ctx.policyVersion === 'string' ? ctx.policyVersion : undefined,
      modelVersion: typeof ctx.modelVersion === 'string' ? ctx.modelVersion : undefined,
      engineResults: (ctx.engineResults as Record<string, unknown>) ?? undefined,
      obligations: (ctx.obligations as Record<string, unknown>) ?? undefined,
    };
  });

  return { entries, total: (countResult.rows[0] as { total?: number })?.total ?? 0 };
}

/**
 * Get all decisions sharing a correlation ID (same request/operation chain).
 */
export async function getDecisionsByCorrelation(
  tenantId: string,
  correlationId: string,
): Promise<DecisionLogEntry[]> {
  const result = await queryDecisionLog(tenantId, { correlationId, limit: 1000 });
  return result.entries;
}

/**
 * Aggregate decision statistics over a date range:
 * total count, allow/deny split, and top denied permissions.
 */
export async function getDecisionSummary(
  tenantId: string,
  dateFrom: string,
  dateTo: string,
): Promise<DecisionSummary> {
  const schema = tenantSchema(tenantId);
  logger.info('dauth.audit: generating decision summary', { tenantId, dateFrom, dateTo });

  // Overall counts
  const counts = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE decision = 'allow')::int AS allow_count,
       COUNT(*) FILTER (WHERE decision = 'deny')::int AS deny_count
     FROM "${schema}".authz_decision_log
     WHERE created_at >= $1 AND created_at <= $2`,
    [dateFrom, dateTo],
  );

  // Top denied permissions
  const topDenied = await safeQuery(
    `SELECT permission_code, COUNT(*)::int AS cnt
     FROM "${schema}".authz_decision_log
     WHERE decision = 'deny' AND created_at >= $1 AND created_at <= $2
     GROUP BY permission_code
     ORDER BY cnt DESC
     LIMIT 10`,
    [dateFrom, dateTo],
  );

  const row = (counts.rows[0] as { total: number; allow_count: number; deny_count: number }) ?? { total: 0, allow_count: 0, deny_count: 0 };
  return {
    totalDecisions: row.total,
    allowCount: row.allow_count,
    denyCount: row.deny_count,
    topDeniedPermissions: topDenied.rows.map(( r: any) => ({
      permissionCode: r.permission_code,
      count: r.cnt,
    })),
  };
}

/**
 * Get the most recent denied decisions for monitoring and alerting.
 * Defaults to last 20 denials if limit is not specified.
 */
export async function getRecentDenials(
  tenantId: string,
  limit: number = 20,
): Promise<DecisionLogEntry[]> {
  const result = await queryDecisionLog(tenantId, { decision: 'deny', limit });
  return result.entries;
}
