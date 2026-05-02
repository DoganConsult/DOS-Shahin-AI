// ============================================================
// KSA Compliance Data Index
// Queries live regulatory registry statistics from the public
// schema (authorities, frameworks, controls, obligations,
// domains, regulators). Used by dashboard KPIs, onboarding
// summaries, and the ontology API.
// ============================================================

import { safeQuery } from '../../ports/database.port';

export interface RegistryStats {
  frameworks: number;
  authorities: number;
  controls: number;
  obligations: number;
  domains?: number;
  regulators?: number;
}

export interface FrameworkSummary {
  frameworkCode: string;
  frameworkNameEn: string;
  frameworkNameAr: string;
  authorityCode: string;
  controlCount: number;
  obligationCount: number;
  version: string;
  status: string;
}

export interface AuthoritySummary {
  authorityCode: string;
  authorityNameEn: string;
  authorityNameAr: string;
  frameworkCount: number;
  totalControls: number;
}

// ── Registry stats (live from DB) ─────────────────────────────────────────

let _statsCache: { data: RegistryStats; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getRegistryStats(): Promise<RegistryStats> {
  if (_statsCache && _statsCache.expiresAt > Date.now()) {
    return _statsCache.data;
  }

  const [frameworks, authorities, controls, obligations, domains, regulators] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS cnt FROM regulatory_frameworks WHERE status = 'active'`),
    safeQuery(`SELECT COUNT(*) AS cnt FROM regulatory_authorities`),
    safeQuery(`SELECT COUNT(*) AS cnt FROM regulatory_controls`),
    safeQuery(`SELECT COUNT(*) AS cnt FROM control_evidence_requirements`),
    safeQuery(`SELECT COUNT(DISTINCT domain_code) AS cnt FROM regulatory_controls WHERE domain_code IS NOT NULL`),
    safeQuery(`SELECT COUNT(DISTINCT regulator_code) AS cnt FROM regulatory_authorities WHERE regulator_code IS NOT NULL`),
  ]);

  const stats: RegistryStats = {
    frameworks: Number(frameworks.rows[0]?.cnt ?? 0),
    authorities: Number(authorities.rows[0]?.cnt ?? 0),
    controls: Number(controls.rows[0]?.cnt ?? 0),
    obligations: Number(obligations.rows[0]?.cnt ?? 0),
    domains: Number(domains.rows[0]?.cnt ?? 0),
    regulators: Number(regulators.rows[0]?.cnt ?? 0),
  };

  _statsCache = { data: stats, expiresAt: Date.now() + CACHE_TTL_MS };
  return stats;
}

// ── Framework summaries ───────────────────────────────────────────────────

export async function getFrameworkSummaries(): Promise<FrameworkSummary[]> {
  const result = await safeQuery(`
    SELECT
      rf.framework_code,
      rf.framework_name_en,
      rf.framework_name_ar,
      rf.authority_code,
      rf.version,
      rf.status,
      COALESCE(cc.control_count, 0) AS control_count,
      COALESCE(oc.obligation_count, 0) AS obligation_count
    FROM regulatory_frameworks rf
    LEFT JOIN (
      SELECT framework_code, COUNT(*) AS control_count
      FROM regulatory_controls
      GROUP BY framework_code
    ) cc ON cc.framework_code = rf.framework_code
    LEFT JOIN (
      SELECT rc.framework_code, COUNT(cer.requirement_id) AS obligation_count
      FROM regulatory_controls rc
      JOIN control_evidence_requirements cer ON cer.control_id = rc.control_id
      GROUP BY rc.framework_code
    ) oc ON oc.framework_code = rf.framework_code
    WHERE rf.status = 'active'
    ORDER BY rf.framework_code
  `);

  return result.rows.map(r => ({
    frameworkCode: r.framework_code,
    frameworkNameEn: r.framework_name_en,
    frameworkNameAr: r.framework_name_ar,
    authorityCode: r.authority_code,
    controlCount: Number(r.control_count),
    obligationCount: Number(r.obligation_count),
    version: r.version,
    status: r.status,
  }));
}

// ── Authority summaries ───────────────────────────────────────────────────

export async function getAuthoritySummaries(): Promise<AuthoritySummary[]> {
  const result = await safeQuery(`
    SELECT
      ra.authority_code,
      ra.authority_name_en,
      ra.authority_name_ar,
      COUNT(DISTINCT rf.framework_code) AS framework_count,
      COALESCE(SUM(cc.control_count), 0) AS total_controls
    FROM regulatory_authorities ra
    LEFT JOIN regulatory_frameworks rf ON rf.authority_code = ra.authority_code AND rf.status = 'active'
    LEFT JOIN (
      SELECT framework_code, COUNT(*) AS control_count
      FROM regulatory_controls
      GROUP BY framework_code
    ) cc ON cc.framework_code = rf.framework_code
    GROUP BY ra.authority_code, ra.authority_name_en, ra.authority_name_ar
    ORDER BY ra.authority_code
  `);

  return result.rows.map(r => ({
    authorityCode: r.authority_code,
    authorityNameEn: r.authority_name_en,
    authorityNameAr: r.authority_name_ar,
    frameworkCount: Number(r.framework_count),
    totalControls: Number(r.total_controls),
  }));
}

// ── Sector-specific stats ─────────────────────────────────────────────────

export async function getRegistryStatsBySector(sectorCode: string): Promise<RegistryStats> {
  const result = await safeQuery(`
    WITH sector_authorities AS (
      SELECT authority_code FROM sector_authority_mapping WHERE sector_code = $1
    ),
    sector_frameworks AS (
      SELECT framework_code FROM regulatory_frameworks
      WHERE authority_code IN (SELECT authority_code FROM sector_authorities)
        AND status = 'active'
    )
    SELECT
      (SELECT COUNT(*) FROM sector_frameworks) AS frameworks,
      (SELECT COUNT(*) FROM sector_authorities) AS authorities,
      (SELECT COUNT(*) FROM regulatory_controls WHERE framework_code IN (SELECT framework_code FROM sector_frameworks)) AS controls,
      (SELECT COUNT(*) FROM control_evidence_requirements cer
       JOIN regulatory_controls rc ON rc.control_id = cer.control_id
       WHERE rc.framework_code IN (SELECT framework_code FROM sector_frameworks)) AS obligations
  `, [sectorCode]);

  const row = result.rows[0];
  return {
    frameworks: Number(row?.frameworks ?? 0),
    authorities: Number(row?.authorities ?? 0),
    controls: Number(row?.controls ?? 0),
    obligations: Number(row?.obligations ?? 0),
  };
}

export function invalidateStatsCache(): void {
  _statsCache = null;
}
