// ============================================================================
// Compliance Benchmark Service (Issue 20)
// Generates anonymized cross-tenant compliance benchmarks.
// "Your banking peers average 72% NCA-ECC compliance."
// ============================================================================

import { safeQuery } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export interface BenchmarkResult {
  frameworkCode: string;
  frameworkName: string;
  peerCount: number;
  peerAvgComplianceRate: number;
  peerMedianComplianceRate: number;
  peerBestComplianceRate: number;
  yourComplianceRate: number;
  percentile: number; // Your rank percentile (higher = better)
}

/**
 * Get compliance benchmarks for a tenant relative to peers in the same sector.
 * Data is anonymized — no tenant names or IDs are exposed.
 */
export async function getComplianceBenchmarks(
  tenantId: string
): Promise<BenchmarkResult[]> {
  // 1. Get this tenant's sector(s)
  const sectorRes = await safeQuery(
    `SELECT sector_code FROM public.tenant_sectors
     WHERE tenant_id = $1
     UNION
     SELECT sector_code FROM public.tenants WHERE tenant_id = $1 AND sector_code IS NOT NULL`,
    [tenantId]
  );
  const sectorCodes = sectorRes.rows.map((r: GenericRow) => r.sector_code).filter(Boolean);

  if (sectorCodes.length === 0) return [];

  // 2. Find peer tenants in same sector(s)
  const peerRes = await safeQuery(
    `SELECT DISTINCT ts.tenant_id
     FROM public.tenant_sectors ts
     JOIN public.tenants t ON t.tenant_id = ts.tenant_id
     WHERE ts.sector_code = ANY($1)
       AND t.status = 'active'
       AND ts.tenant_id <> $2`,
    [sectorCodes, tenantId]
  );
  const peerTenantIds = peerRes.rows.map((r: GenericRow) => r.tenant_id);

  if (peerTenantIds.length < 3) {
    // Not enough peers for meaningful benchmarks (anonymity threshold)
    return [];
  }

  // 3. Collect compliance rates per framework for all peers + this tenant
  const allTenantIds = [...peerTenantIds, tenantId];
  const frameworkRates: Record<string, { tenantId: string; rate: number }[]> = {};

  for (const tid of allTenantIds) {
    const schema = `tenant_${tid.replace(/-/g, "_")}`;
    try {
      const fwRes = await safeQuery(
        `SELECT c.framework_code,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE c.compliance_status = 'compliant')::int AS compliant
         FROM "${schema}".controls c
         WHERE c.status = 'active' AND c.framework_code IS NOT NULL
         GROUP BY c.framework_code`,
        []
      );

      for (const row of fwRes.rows) {
        const rate = row.total > 0 ? Math.round((row.compliant / row.total) * 100) : 0;
        if (!frameworkRates[row.framework_code]) {
          frameworkRates[row.framework_code] = [];
        }
        frameworkRates[row.framework_code].push({ tenantId: tid, rate });
      }
    } catch {
      // Tenant schema may not exist — skip
    }
  }

  // 4. Build benchmark results
  const results: BenchmarkResult[] = [];

  for (const [fwCode, rates] of Object.entries(frameworkRates)) {
    if (rates.length < 3) continue; // Anonymity threshold

    const peerRates = rates.filter((r) => r.tenantId !== tenantId).map((r) => r.rate);
    const myRate = rates.find((r) => r.tenantId === tenantId)?.rate ?? 0;

    if (peerRates.length < 3) continue;

    // Sort for percentile calculation
    const sorted = [...peerRates, myRate].sort((a, b) => a - b);
    const myRank = sorted.indexOf(myRate) + 1;
    const percentile = Math.round((myRank / sorted.length) * 100);

    // Get framework name
    const fwNameRes = await safeQuery(
      `SELECT framework_name FROM public.lookup_authority_frameworks
       WHERE LOWER(framework_code) = LOWER($1) LIMIT 1`,
      [fwCode]
    );

    results.push({
      frameworkCode: fwCode,
      frameworkName: getFirstRow(fwNameRes)?.framework_name ?? fwCode,
      peerCount: peerRates.length,
      peerAvgComplianceRate: Math.round(peerRates.reduce((s, r) => s + r, 0) / peerRates.length),
      peerMedianComplianceRate: peerRates[Math.floor(peerRates.length / 2)] ?? 0,
      peerBestComplianceRate: Math.max(...peerRates),
      yourComplianceRate: myRate,
      percentile,
    });
  }

  return results.sort((a, b) => b.peerCount - a.peerCount);
}
