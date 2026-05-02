/**
 * Packs -- Diagnostics Service
 *
 * Health checks: schema existence, table readiness, pack installation
 * integrity, dependency resolution, version conflicts, and outdated packs.
 *
 * MP-36 Section 11.3: Required diagnostics -- installation diagnostics
 * and compatibility diagnostics.
 *
 * @owner DOS
 * @module packs
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { PACKS_THRESHOLDS as _PACKS_THRESHOLDS } from '../data/packs-constants';

export interface DiagnosticsResult {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

/**
 * Run comprehensive diagnostics for the packs module.
 * Checks schema existence, owned tables, pack registry state,
 * installation integrity, and dependency resolution.
 *
 * @param tenantId - Tenant to diagnose
 * @returns Diagnostics result with individual check statuses
 */
export async function runDiagnostics(tenantId: string): Promise<DiagnosticsResult> {
  const schema = tenantSchema(tenantId);
  const checks: DiagnosticsResult['checks'] = [];

  // 1. Schema existence
  const { rows: schemaRows } = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));
  checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });

  // 2. Owned tables exist
  const ownedTables = ['pack_installations', 'pack_registry', 'pack_policies'];
  if (schemaRows.length > 0) {
    const { rows: tableRows } = await safeQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = ANY($2)`,
      [schema, ownedTables],
    ).catch(() => ({ rows: [] }));
    const foundTables = new Set(
      (tableRows as Array<{ table_name: string }>).map(r => r.table_name),
    );
    for (const t of ownedTables) {
      checks.push({
        name: `table_${t}`,
        passed: foundTables.has(t),
        detail: foundTables.has(t) ? 'exists' : 'missing',
      });
    }
  }

  // 3. Public pack registry has active packs
  const { rows: registryRows } = await safeQuery(
    `SELECT count(*)::int AS cnt FROM public.pack_registry WHERE is_active = true`,
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const registryCount = (registryRows[0] as Record<string, number>)?.cnt ?? 0;
  checks.push({
    name: 'registry_has_packs',
    passed: registryCount > 0,
    detail: `${registryCount} active packs in registry`,
  });

  // 4. No failed installations
  const { rows: failedRows } = await safeQuery(
    `SELECT count(*)::int AS cnt FROM public.tenant_pack_installations
     WHERE tenant_id = $1 AND status = 'failed'`,
    [tenantId],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const failedCount = (failedRows[0] as Record<string, number>)?.cnt ?? 0;
  checks.push({
    name: 'no_failed_installations',
    passed: failedCount === 0,
    detail: failedCount > 0 ? `${failedCount} failed installation(s)` : 'ok',
  });

  // 5. No outdated packs
  const { rows: outdatedRows } = await safeQuery(
    `SELECT count(*)::int AS cnt
     FROM public.tenant_pack_installations tpi
     JOIN public.pack_registry pr ON pr.code = tpi.pack_code AND pr.is_active = true
     WHERE tpi.tenant_id = $1 AND tpi.status = 'installed' AND tpi.pack_version != pr.version`,
    [tenantId],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const outdatedCount = (outdatedRows[0] as Record<string, number>)?.cnt ?? 0;
  checks.push({
    name: 'no_outdated_packs',
    passed: outdatedCount === 0,
    detail: outdatedCount > 0 ? `${outdatedCount} outdated pack(s)` : 'ok',
  });

  // 6. No missing dependencies
  const { rows: installedPacks } = await safeQuery(
    `SELECT tpi.pack_code FROM public.tenant_pack_installations tpi
     WHERE tpi.tenant_id = $1 AND tpi.status = 'installed'`,
    [tenantId],
  ).catch(() => ({ rows: [] }));
  const installedCodes = new Set(
    (installedPacks as Array<Record<string, unknown>>).map(r => r.pack_code as string),
  );

  let missingDepCount = 0;
  if (installedCodes.size > 0) {
    const { rows: depRows } = await safeQuery(
      `SELECT code, depends_on FROM public.pack_registry
       WHERE code = ANY($1) AND is_active = true`,
      [Array.from(installedCodes)],
    ).catch(() => ({ rows: [] }));

    for (const pack of depRows as Array<Record<string, unknown>>) {
      const deps = pack.depends_on ?? [];

      const missing = deps.filter((d: string) => !installedCodes.has(d));
      missingDepCount += missing.length;
    }
  }
  checks.push({
    name: 'no_missing_dependencies',
    passed: missingDepCount === 0,
    detail: missingDepCount > 0 ? `${missingDepCount} missing dependency(ies)` : 'ok',
  });

  // 7. No stale installing state
  const { rows: staleRows } = await safeQuery(
    `SELECT count(*)::int AS cnt FROM public.tenant_pack_installations
     WHERE tenant_id = $1 AND status IN ('installing', 'upgrading')
       AND installed_at < NOW() - INTERVAL '24 hours'`,
    [tenantId],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));
  const staleCount = (staleRows[0] as Record<string, number>)?.cnt ?? 0;
  checks.push({
    name: 'no_stale_installations',
    passed: staleCount === 0,
    detail: staleCount > 0 ? `${staleCount} stale installation(s)` : 'ok',
  });

  return {
    moduleCode: 'packs',
    healthy: checks.every(c => c.passed),
    checks,
    checkedAt: new Date().toISOString(),
  };
}

// ── Extended Diagnostics -- Metrics ─────────────────────────────────

/**
 * Get pack-specific metrics for the admin dashboard.
 */
export async function getPacksMetrics(tenantId: string): Promise<{
  totalInstalled: number;
  totalAvailable: number;
  failedInstallations: number;
  outdatedPacks: number;
  lastInstallDate: string | null;
  installSuccessRate: number;
}> {
  const [installedRes, availableRes, failedRes, outdatedRes, lastInstallRes, totalInstallRes] = await Promise.all([
    safeQuery(
      `SELECT count(*)::int AS cnt FROM public.tenant_pack_installations
       WHERE tenant_id = $1 AND status = 'installed'`,
      [tenantId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    safeQuery(
      `SELECT count(*)::int AS cnt FROM public.pack_registry WHERE is_active = true`,
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    safeQuery(
      `SELECT count(*)::int AS cnt FROM public.tenant_pack_installations
       WHERE tenant_id = $1 AND status = 'failed'`,
      [tenantId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    safeQuery(
      `SELECT count(*)::int AS cnt
       FROM public.tenant_pack_installations tpi
       JOIN public.pack_registry pr ON pr.code = tpi.pack_code AND pr.is_active = true
       WHERE tpi.tenant_id = $1 AND tpi.status = 'installed' AND tpi.pack_version != pr.version`,
      [tenantId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    safeQuery(
      `SELECT MAX(installed_at)::text AS last_install FROM public.tenant_pack_installations
       WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{ last_install: null }] })),
    safeQuery(
      `SELECT count(*)::int AS cnt FROM public.tenant_pack_installations WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  const installed = (installedRes.rows[0] as Record<string, number>)?.cnt ?? 0;
  const failed = (failedRes.rows[0] as Record<string, number>)?.cnt ?? 0;
  const total = (totalInstallRes.rows[0] as Record<string, number>)?.cnt ?? 0;

  return {
    totalInstalled: installed,
    totalAvailable: (availableRes.rows[0] as Record<string, number>)?.cnt ?? 0,
    failedInstallations: failed,
    outdatedPacks: (outdatedRes.rows[0] as Record<string, number>)?.cnt ?? 0,
    lastInstallDate: (lastInstallRes.rows[0] as Record<string, unknown>)?.last_install as string | null,
    installSuccessRate: total > 0 ? Math.round(((total - failed) / total) * 100) : 100,
  };
}

// ── Dependency Diagnostics ──────────────────────────────────────────

/**
 * Get detailed dependency diagnostic information.
 */
export async function getDependencyDiagnostics(tenantId: string): Promise<{
  packsWithMissingDeps: Array<{ packCode: string; missingDeps: string[] }>;
}> {
  const { rows: installed } = await safeQuery(
    `SELECT tpi.pack_code FROM public.tenant_pack_installations tpi
     WHERE tpi.tenant_id = $1 AND tpi.status = 'installed'`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  const installedCodes = new Set(
    (installed as Array<Record<string, unknown>>).map(r => r.pack_code as string),
  );

  if (installedCodes.size === 0) {
    return { packsWithMissingDeps: [] };
  }

  const { rows: packDeps } = await safeQuery(
    `SELECT code, depends_on FROM public.pack_registry
     WHERE code = ANY($1) AND is_active = true`,
    [Array.from(installedCodes)],
  ).catch(() => ({ rows: [] }));

  const result: Array<{ packCode: string; missingDeps: string[] }> = [];

  for (const pack of packDeps as Array<Record<string, unknown>>) {
    const deps = pack.depends_on ?? [];

    const missing = deps.filter((d: string) => !installedCodes.has(d));
    if (missing.length > 0) {

      result.push({ packCode: pack.code, missingDeps: missing });
    }
  }

  return { packsWithMissingDeps: result };
}
