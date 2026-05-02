/**
 * RLS audit tool — inspects every table in a target schema and reports which
 * ones have Row Level Security enabled, forced, and have at least one policy
 * attached. Intended to be run in CI as a gate:
 *   - In production, any tenant-scoped table without RLS fails the build.
 *   - In staging, a warning-only run produces a status dashboard.
 *
 * Usage (programmatic):
 *   const result = await auditRls({ schemas: ['dos', 'public'] });
 *   if (result.missing.length > 0) process.exit(1);
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { DAUTH_CONFIG } from '../dauth.config';

export interface RlsAuditOptions {
  /** Schemas to check. Default: all tenant schemas + public. */
  schemas?: string[];
  /**
   * Tables explicitly exempt from RLS (e.g. fully global lookup tables like
   * country codes). Keep this list empty in production.
   */
  exempt?: string[];
}

export interface RlsTableStatus {
  schema: string;
  table: string;
  rlsEnabled: boolean;
  rlsForced: boolean;
  policyCount: number;
}

export interface RlsAuditResult {
  scannedTables: number;
  compliant: RlsTableStatus[];
  missing: RlsTableStatus[];
  forcedMissing: RlsTableStatus[];
  noPolicies: RlsTableStatus[];
}

export async function auditRls(options: RlsAuditOptions = {}): Promise<RlsAuditResult> {
  const schemas = options.schemas ?? ['dos', 'public'];
  const exempt = new Set(options.exempt ?? []);

  const rows = await safeQuery(
    `SELECT n.nspname AS schema,
            c.relname AS table,
            c.relrowsecurity AS rls_enabled,
            c.relforcerowsecurity AS rls_forced,
            (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid)::int AS policy_count
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = ANY($1::text[])
        AND c.relname NOT LIKE 'pg_%'
      ORDER BY n.nspname, c.relname`,
    [schemas],
  );

  const compliant: RlsTableStatus[] = [];
  const missing: RlsTableStatus[] = [];
  const forcedMissing: RlsTableStatus[] = [];
  const noPolicies: RlsTableStatus[] = [];

  for (const row of rows.rows as Array<{
    schema: string;
    table: string;
    rls_enabled: boolean;
    rls_forced: boolean;
    policy_count: number;
  }>) {
    const key = `${row.schema}.${row.table}`;
    if (exempt.has(key)) continue;
    const status: RlsTableStatus = {
      schema: row.schema,
      table: row.table,
      rlsEnabled: row.rls_enabled,
      rlsForced: row.rls_forced,
      policyCount: row.policy_count,
    };
    if (!status.rlsEnabled) {
      missing.push(status);
      continue;
    }
    if (!status.rlsForced) {
      forcedMissing.push(status);
    }
    if (status.policyCount === 0) {
      noPolicies.push(status);
    }
    if (status.rlsEnabled && status.rlsForced && status.policyCount > 0) {
      compliant.push(status);
    }
  }

  const result: RlsAuditResult = {
    scannedTables: rows.rows.length,
    compliant,
    missing,
    forcedMissing,
    noPolicies,
  };

  if (missing.length > 0 || forcedMissing.length > 0 || noPolicies.length > 0) {
    logger.warn('[DAuth:RLS] audit: non-compliant tables', {
      missing: missing.length,
      forcedMissing: forcedMissing.length,
      noPolicies: noPolicies.length,
    });
  }

  return result;
}

/**
 * CI gate — throws when run in a mode where RLS is required and not
 * compliant. `DAUTH_RLS_FAIL_CLOSED=true` is the default in production.
 */
export async function assertRlsCompliant(options: RlsAuditOptions = {}): Promise<void> {
  if (!DAUTH_CONFIG.rls.enabled) return;
  const result = await auditRls(options);
  const fatal =
    DAUTH_CONFIG.rls.failClosedInProd && process.env.NODE_ENV === 'production';

  if (result.missing.length === 0 && result.forcedMissing.length === 0) {
    return;
  }

  const detail = [
    ...result.missing.map((t) => `  - MISSING RLS: ${t.schema}.${t.table}`),
    ...result.forcedMissing.map((t) => `  - RLS not FORCED: ${t.schema}.${t.table}`),
  ].join('\n');

  const message = `[DAuth:RLS] audit failed:\n${detail}`;
  if (fatal) throw new Error(message);
  logger.error(message);
}
