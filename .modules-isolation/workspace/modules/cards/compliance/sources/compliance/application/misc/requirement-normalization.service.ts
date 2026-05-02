// ============================================================================
// Shahin-Ai — Requirement Normalization Engine (F8)
//
// Creates a canonical model for regulatory requirements across frameworks.
// When NCA-ECC 1-1-1 and SAMA-CSF SC.1.1 say the same thing, they map to
// one canonical_requirement. This eliminates duplicate compliance work and
// enables cross-framework coverage analysis.
//
// Flow: regulation → clause → obligation → canonical_requirement → control
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { v4 as uuid } from "uuid";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CanonicalRequirement {
  requirementId: string;
  canonicalCode: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category?: string;
  domain?: string;
  sourceMappings: SourceMapping[];
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceMapping {
  frameworkId: string;
  frameworkName?: string;
  ref: string;
  strength: "exact" | "strong" | "partial" | "weak";
  notes?: string;
}

export interface NormalizationInput {
  canonicalCode: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category?: string;
  domain?: string;
  sourceMappings?: SourceMapping[];
  priority?: string;
}

export interface NormalizationStats {
  totalCanonical: number;
  totalSourceMappings: number;
  frameworksCovered: string[];
  avgMappingsPerRequirement: number;
  unmappedFrameworks: string[];
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function createCanonicalRequirement(
  tenantId: string,
  data: NormalizationInput
): Promise<CanonicalRequirement> {
  const schema = tenantSchema(tenantId);
  const requirementId = uuid();

  await safeQuery(
    `INSERT INTO "${schema}".canonical_requirements
     (requirement_id, canonical_code, title_en, title_ar,
      description_en, description_ar, category, domain,
      source_mappings, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      requirementId, data.canonicalCode, data.titleEn, data.titleAr || null,
      data.descriptionEn || null, data.descriptionAr || null,
      data.category || null, data.domain || null,
      JSON.stringify(data.sourceMappings || []), data.priority || "medium",
    ]
  );

  eventBus.publish(("regulatory.canonical_created" as any), { tenantId, requirementId, code: data.canonicalCode });
  return getCanonicalRequirement(tenantId, requirementId) as Promise<CanonicalRequirement>;
}

export async function getCanonicalRequirement(
  tenantId: string,
  requirementId: string
): Promise<CanonicalRequirement | null> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".canonical_requirements WHERE requirement_id = $1`,
    [requirementId]
  );
  if (res.rows.length === 0) return null;
  return rowToCanonical(res.rows[0]);
}

export async function getByCode(
  tenantId: string,
  canonicalCode: string
): Promise<CanonicalRequirement | null> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".canonical_requirements WHERE canonical_code = $1`,
    [canonicalCode]
  );
  if (res.rows.length === 0) return null;
  return rowToCanonical(res.rows[0]);
}

export async function listCanonicalRequirements(
  tenantId: string,
  filters: { category?: string; domain?: string; frameworkId?: string } = {},
  limit = 100,
  offset = 0
): Promise<{ requirements: CanonicalRequirement[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
  if (filters.domain) { conditions.push(`domain = $${idx++}`); params.push(filters.domain); }
  if (filters.frameworkId) {
    conditions.push(`source_mappings::text LIKE $${idx++}`);
    params.push(`%${filters.frameworkId}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await safeQuery(`SELECT COUNT(*) FROM "${schema}".canonical_requirements ${where}`, params);
  const total = parseInt(countRes.rows[0].count) || 0;

  const dataRes = await safeQuery(
    `SELECT * FROM "${schema}".canonical_requirements ${where}
     ORDER BY canonical_code
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { requirements: dataRes.rows.map(rowToCanonical), total };
}

// ── Source Mapping Management ──────────────────────────────────────────────

export async function addSourceMapping(
  tenantId: string,
  requirementId: string,
  mapping: SourceMapping
): Promise<CanonicalRequirement | null> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".canonical_requirements
     SET source_mappings = source_mappings || $1::jsonb,
         updated_at = NOW()
     WHERE requirement_id = $2`,
    [JSON.stringify([mapping]), requirementId]
  );

  return getCanonicalRequirement(tenantId, requirementId);
}

export async function removeSourceMapping(
  tenantId: string,
  requirementId: string,
  frameworkId: string,
  ref: string
): Promise<CanonicalRequirement | null> {
  const req = await getCanonicalRequirement(tenantId, requirementId);
  if (!req) return null;

  const filtered = req.sourceMappings.filter(
    (m) => !(m.frameworkId === frameworkId && m.ref === ref)
  );

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".canonical_requirements
     SET source_mappings = $1, updated_at = NOW()
     WHERE requirement_id = $2`,
    [JSON.stringify(filtered), requirementId]
  );

  return getCanonicalRequirement(tenantId, requirementId);
}

// ── Cross-framework lookup ─────────────────────────────────────────────────

/**
 * Find which canonical requirements a specific framework reference maps to.
 */
export async function findByFrameworkRef(
  tenantId: string,
  frameworkId: string,
  ref: string
): Promise<CanonicalRequirement[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".canonical_requirements
     WHERE source_mappings @> $1::jsonb`,
    [JSON.stringify([{ frameworkId, ref }])]
  );
  return res.rows.map(rowToCanonical);
}

/**
 * Find all canonical requirements that cover a given framework.
 */
export async function findByFramework(
  tenantId: string,
  frameworkId: string
): Promise<CanonicalRequirement[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".canonical_requirements
     WHERE source_mappings::text LIKE $1
     ORDER BY canonical_code`,
    [`%"frameworkId":"${frameworkId}"%`]
  );
  return res.rows.map(rowToCanonical);
}

// ── Statistics ─────────────────────────────────────────────────────────────

export async function getNormalizationStats(tenantId: string): Promise<NormalizationStats> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT
       COUNT(*) as total,
       jsonb_array_length(source_mappings) as mapping_count,
       source_mappings
     FROM "${schema}".canonical_requirements
     GROUP BY requirement_id, source_mappings`,
    []
  );

  const total = res.rows.length;
  const frameworkSet = new Set<string>();
  let totalMappings = 0;

  for (const row of res.rows) {
    const mappings = row.source_mappings || [];
    totalMappings += mappings.length;
    for (const m of mappings) {
      frameworkSet.add(m.frameworkId);
    }
  }

  return {
    totalCanonical: total,
    totalSourceMappings: totalMappings,
    frameworksCovered: Array.from(frameworkSet),
    avgMappingsPerRequirement: total > 0 ? Math.round((totalMappings / total) * 10) / 10 : 0,
    unmappedFrameworks: [], // Would need framework list to compute
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToCanonical( r: Record<string, unknown>): CanonicalRequirement {
  return {

    requirementId: r.requirement_id,

    canonicalCode: r.canonical_code,

    titleEn: r.title_en,

    titleAr: r.title_ar,

    descriptionEn: r.description_en,

    descriptionAr: r.description_ar,

    category: r.category,

    domain: r.domain,

    sourceMappings: r.source_mappings || [],

    priority: r.priority,

    createdAt: r.created_at,

    updatedAt: r.updated_at,
  };
}
