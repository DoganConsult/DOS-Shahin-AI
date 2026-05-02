// ============================================================================
// Shahin — Regulatory Resolution Service
// DB-driven: sector_code → authorities → frameworks → controls → evidence
// Single source of truth for onboarding Review and build-workspace.
// ============================================================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResolvedAuthority {
  code: string;
  name_en: string;
  name_ar: string;
  enforcement: string;
  priority: number;
  regulation_type: string;
  reason_en: string;
  reason_ar: string;
}

export interface ResolvedFramework {
  code: string;
  name: string;
  version: string;
  mandatory_for_sectors: string[];
  /** Optional: e.g. "Issued by NCA" for explainability in onboarding summary */
  reason_en?: string;
  reason_ar?: string;
}

export interface ResolvedRisk {
  risk_title_en: string;
  risk_title_ar: string;
  risk_category: string;
  sector_impact: string;
  sector_likelihood: string;
}

export interface RegulatoryResolution {
  sectorCode: string;
  sectorNameEn: string;
  sectorNameAr: string;
  authorities: ResolvedAuthority[];
  frameworks: ResolvedFramework[];
  controlCount: number;
  evidenceTaskCount: number;
  modules: string[];
  risks: ResolvedRisk[];
}

// ─── Main Resolution Function ──────────────────────────────────────────────

export async function resolveRegulatoryProfile(
  sectorCode: string,
  tenantId?: string
): Promise<RegulatoryResolution> {
  // 0. Sector name lookup
  const sectorNameResult = await safeQuery(
    `SELECT sector_name_en, COALESCE(sector_name_ar, sector_name_en) AS sector_name_ar
     FROM public.lookup_isic4_sectors WHERE section_code = $1 LIMIT 1`,
    [sectorCode]
  );
  const sectorNameEn: string = getFirstRow(sectorNameResult)?.sector_name_en || sectorCode;
  const sectorNameAr: string = getFirstRow(sectorNameResult)?.sector_name_ar || sectorCode;

  // 1. Authorities for this sector
  const authResult = await safeQuery(
    `SELECT
       m.authority_code AS code,
       a.authority_name_en AS name_en,
       COALESCE(a.authority_name_ar, a.authority_name_en) AS name_ar,
       m.enforcement,
       m.priority,
       m.regulation_type,
       COALESCE(m.reason_en, '') AS reason_en,
       COALESCE(m.reason_ar, '') AS reason_ar
     FROM public.lookup_authority_sector_mapping m
     JOIN public.lookup_ksa_regulatory_authorities a
       ON a.authority_code = m.authority_code
     WHERE m.sector_code = $1
       AND m.is_active
       AND a.is_active
     ORDER BY m.priority, m.authority_code`,
    [sectorCode]
  );
  const authorities: ResolvedAuthority[] = authResult.rows;

  if (authorities.length === 0) {
    return {
      sectorCode, sectorNameEn, sectorNameAr,
      authorities: [],
      frameworks: [],
      controlCount: 0,
      evidenceTaskCount: 0,
      modules: [],
      risks: [],
    };
  }

  const authorityCodes = authorities.map((a) => a.code);

  // 2. Frameworks from those authorities
  const fwResult = await safeQuery(
    `SELECT DISTINCT
       f.framework_code AS code,
       f.framework_name AS name,
       COALESCE(f.framework_version, '1.0') AS version,
       COALESCE(f.mandatory_for_sectors, '{}') AS mandatory_for_sectors,
       (SELECT string_agg(DISTINCT a.name_en, ', ' ORDER BY a.name_en)
        FROM public.lookup_ksa_regulatory_authorities a
        JOIN public.lookup_authority_frameworks af ON af.authority_code = a.authority_code AND af.is_active
        WHERE af.framework_code = f.framework_code) AS reason_en,
       (SELECT string_agg(DISTINCT a.name_ar, '، ' ORDER BY a.name_ar)
        FROM public.lookup_ksa_regulatory_authorities a
        JOIN public.lookup_authority_frameworks af ON af.authority_code = a.authority_code AND af.is_active
        WHERE af.framework_code = f.framework_code) AS reason_ar
     FROM public.lookup_authority_frameworks f
     WHERE f.authority_code = ANY($1)
       AND f.is_active
     ORDER BY f.framework_code`,
    [authorityCodes]
  );
  const frameworks: ResolvedFramework[] = fwResult.rows;

  if (frameworks.length === 0) {
    return {
      sectorCode, sectorNameEn, sectorNameAr,
      authorities,
      frameworks: [],
      controlCount: 0,
      evidenceTaskCount: 0,
      modules: [],
      risks: [],
    };
  }

  const frameworkCodes = frameworks.map((f) => f.code);

  // 3. Control count (via control_domains join — regulatory_controls has no framework_code)
  const controlResult = await safeQuery(
    `SELECT count(*)::int AS cnt
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY($1)`,
    [frameworkCodes]
  );
  const controlCount: number = getFirstRow(controlResult)?.cnt ?? 0;

  // 4. Evidence task count (via control_id join chain)
  // Use tenant schema for control_evidence_requirements if tenantId is provided
  const schema = tenantId ? tenantSchema(tenantId) : null;
  const evidenceTable = schema ? `"${schema}".control_evidence_requirements` : `public.control_evidence_requirements`;
  // Join condition: tenant schema uses control_code (VARCHAR), public schema uses id (UUID)
  const joinCondition = schema ? `rc.control_code = cer.control_id` : `rc.id = cer.control_id`;
  
  const evidenceResult = await safeQuery(
    `SELECT count(*)::int AS cnt
     FROM ${evidenceTable} cer
     JOIN public.regulatory_controls rc ON ${joinCondition}
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY($1)`,
    [frameworkCodes]
  );
  const evidenceTaskCount: number = getFirstRow(evidenceResult)?.cnt ?? 0;

  // 5. Modules from framework triggers
  const moduleResult = await safeQuery(
    `SELECT DISTINCT module_code
     FROM public.lookup_framework_module_triggers
     WHERE framework_code = ANY($1)
       AND is_active
     ORDER BY module_code`,
    [frameworkCodes]
  );
  const modules: string[] = moduleResult.rows.map((r: GenericRow) => r.module_code);

  // 6. Sector risks
  const riskResult = await safeQuery(
    `SELECT
       r.risk_title_en,
       COALESCE(r.risk_title_ar, r.risk_title_en) AS risk_title_ar,
       COALESCE(rc.risk_name_en, 'general') AS risk_category,
       COALESCE(sr.sector_impact, 'medium') AS sector_impact,
       COALESCE(sr.sector_likelihood, 'likely') AS sector_likelihood
     FROM public.sector_risks sr
     JOIN public.risks r ON r.id = sr.risk_id
     LEFT JOIN public.risk_categories rc ON rc.id = r.risk_category_id
     WHERE sr.sector_code = $1
     ORDER BY sr.priority_rank NULLS LAST, r.risk_title_en`,
    [sectorCode]
  );
  const risks: ResolvedRisk[] = riskResult.rows;

  return {
    sectorCode, sectorNameEn, sectorNameAr,
    authorities,
    frameworks,
    controlCount,
    evidenceTaskCount,
    modules,
    risks,
  };
}

/**
 * Resolve regulatory profile by sector_id (e.g. SEC-KSA-FIN-BANK).
 * Looks up the primary ISIC code via sector_isic_map, then delegates
 * to resolveRegulatoryProfile() which uses the ISIC-based chain.
 */
export async function resolveRegulatoryProfileBySectorId(
  sectorId: string
): Promise<RegulatoryResolution> {
  const isicResult = await safeQuery(
    `SELECT isic_code FROM public.sector_isic_map
     WHERE sector_id = $1 ORDER BY weight DESC LIMIT 1`,
    [sectorId]
  );

  if (isicResult.rows.length === 0) {
    // Sector not mapped to ISIC — return sector name but empty resolution
    const sectorRow = await safeQuery(
      `SELECT name_en, COALESCE(name_ar, name_en) AS name_ar FROM public.sectors WHERE sector_id = $1`,
      [sectorId]
    );
    return {
      sectorCode: sectorId,
      sectorNameEn: getFirstRow(sectorRow)?.name_en || sectorId,
      sectorNameAr: getFirstRow(sectorRow)?.name_ar || sectorId,
      authorities: [], frameworks: [], controlCount: 0,
      evidenceTaskCount: 0, modules: [], risks: [],
    };
  }

  return resolveRegulatoryProfile(getFirstRow(isicResult)?.isic_code);
}

// ─── Multi-Sector Resolution (Issue 10) ──────────────────────────────────

/**
 * Resolve regulatory profile across multiple sectors (for conglomerates).
 * Merges authorities, frameworks, controls, and risks from all sectors
 * while deduplicating.
 */
export async function resolveMultiSectorProfile(
  sectorCodes: string[],
  tenantId?: string
): Promise<RegulatoryResolution> {
  if (sectorCodes.length === 0) {
    return {
      sectorCode: "",
      sectorNameEn: "No sectors",
      sectorNameAr: "لا يوجد قطاعات",
      authorities: [], frameworks: [], controlCount: 0,
      evidenceTaskCount: 0, modules: [], risks: [],
    };
  }

  if (sectorCodes.length === 1) {
    return resolveRegulatoryProfile(sectorCodes[0]);
  }

  // Resolve each sector individually
  const resolutions = await Promise.all(
    sectorCodes.map((code) => resolveRegulatoryProfile(code))
  );

  // Merge with deduplication
  const seenAuthorities = new Set<string>();
  const seenFrameworks = new Set<string>();
  const seenModules = new Set<string>();
  const seenRisks = new Set<string>();

  const mergedAuthorities: ResolvedAuthority[] = [];
  const mergedFrameworks: ResolvedFramework[] = [];
  const mergedRisks: ResolvedRisk[] = [];

  for (const res of resolutions) {
    for (const auth of res.authorities) {
      if (!seenAuthorities.has(auth.code)) {
        seenAuthorities.add(auth.code);
        mergedAuthorities.push(auth);
      }
    }
    for (const fw of res.frameworks) {
      if (!seenFrameworks.has(fw.code)) {
        seenFrameworks.add(fw.code);
        mergedFrameworks.push(fw);
      }
    }
    for (const mod of res.modules) {
      seenModules.add(mod);
    }
    for (const risk of res.risks) {
      const key = risk.risk_title_en;
      if (!seenRisks.has(key)) {
        seenRisks.add(key);
        mergedRisks.push(risk);
      }
    }
  }

  // Sum control/evidence counts (unique via framework dedup above)
  const frameworkCodes = mergedFrameworks.map((f) => f.code);

  const controlResult = await safeQuery(
    `SELECT count(*)::int AS cnt
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY($1)`,
    [frameworkCodes]
  );

  // Use tenant schema for control_evidence_requirements if tenantId is provided
  const schema = tenantId ? tenantSchema(tenantId) : null;
  const evidenceTable = schema ? `"${schema}".control_evidence_requirements` : `public.control_evidence_requirements`;
  // Join condition: tenant schema uses control_code (VARCHAR), public schema uses id (UUID)
  const joinCondition = schema ? `rc.control_code = cer.control_id` : `rc.id = cer.control_id`;
  
  const evidenceResult = await safeQuery(
    `SELECT count(*)::int AS cnt
     FROM ${evidenceTable} cer
     JOIN public.regulatory_controls rc ON ${joinCondition}
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY($1)`,
    [frameworkCodes]
  );

  return {
    sectorCode: sectorCodes.join(","),
    sectorNameEn: resolutions.map((r) => r.sectorNameEn).join(" + "),
    sectorNameAr: resolutions.map((r) => r.sectorNameAr).join(" + "),
    authorities: mergedAuthorities,
    frameworks: mergedFrameworks,
    controlCount: getFirstRow(controlResult)?.cnt ?? 0,
    evidenceTaskCount: getFirstRow(evidenceResult)?.cnt ?? 0,
    modules: Array.from(seenModules).sort(),
    risks: mergedRisks,
  };
}

/**
 * Resolve regulatory profile for a tenant using its stored sector list.
 * Falls back to single-sector resolution if tenant_sectors is empty.
 */
export async function resolveRegulatoryProfileForTenant(
  tenantId: string
): Promise<RegulatoryResolution> {
  const sectorRes = await safeQuery(
    `SELECT sector_code FROM public.tenant_sectors
     WHERE tenant_id = $1 ORDER BY is_primary DESC, added_at ASC`,
    [tenantId]
  );

  if (sectorRes.rows.length === 0) {
    // Fallback: try to get sector from workspace profile
    const wpRes = await safeQuery(
      `SELECT sector_code FROM public.tenants WHERE tenant_id = $1`,
      [tenantId]
    );
    const sectorCode = getFirstRow(wpRes)?.sector_code;
    if (!sectorCode) {
      return {
        sectorCode: "",
        sectorNameEn: "Unknown",
        sectorNameAr: "غير معروف",
        authorities: [], frameworks: [], controlCount: 0,
        evidenceTaskCount: 0, modules: [], risks: [],
      };
    }
    return resolveRegulatoryProfile(sectorCode);
  }

  return resolveMultiSectorProfile(sectorRes.rows.map((r: GenericRow) => r.sector_code), tenantId);
}

// ─── Knowledge Hub Search (Issue 18) ─────────────────────────────────────

export interface SearchResult {
  controlCode: string;
  controlTitle: string;
  frameworkCode: string;
  domainName: string;
  criticality: string;
  rank: number;
}

/**
 * Full-text search across all regulatory controls.
 * Uses PostgreSQL tsvector for fast, ranked search results.
 */
export async function searchControls(
  searchQuery: string,
  limit: number = 50,
  frameworkFilter?: string
): Promise<SearchResult[]> {
  const tsQuery = searchQuery
    .trim()
    .split(/\s+/)
    .map((w) => w + ":*")
    .join(" & ");

  const params: unknown[] = [tsQuery, limit];
  let whereClause = "";

  if (frameworkFilter) {
    whereClause = "AND cd.framework_code = $3";
    params.push(frameworkFilter);
  }

  const res = await safeQuery(
    `SELECT
       rc.control_code AS "controlCode",
       rc.control_title_en AS "controlTitle",
       cd.framework_code AS "frameworkCode",
       cd.domain_name_en AS "domainName",
       rc.criticality_level AS "criticality",
       ts_rank(rc.search_vector, to_tsquery('english', $1)) AS rank
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE rc.search_vector @@ to_tsquery('english', $1)
       ${whereClause}
     ORDER BY rank DESC, rc.criticality_level ASC
     LIMIT $2`,
    params
  );

  return res.rows;
}
