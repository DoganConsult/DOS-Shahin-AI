import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

export type RecommendationCategory = 'approval' | 'assignment' | 'escalation' | 'remediation' | 'compliance' | 'risk' | 'evidence' | 'general';

export interface RecommendationCatalogEntry {
  catalog_id: string;
  recommendation_type: string;
  display_name_en: string;
  display_name_ar: string | null;
  category: RecommendationCategory;
  applicable_step_types: string[];
  requires_human_review: boolean;
  max_confidence_for_auto: number;
  is_active: boolean;
  created_at: string;
}

export async function getCatalog(
  tenantId: string,
  opts?: { category?: RecommendationCategory; activeOnly?: boolean },
): Promise<RecommendationCatalogEntry[]> {
  const schema = tenantSchema(tenantId);
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.category) {
    where.push(`category = $${idx}`); params.push(opts.category); idx++;
  }
  if (opts?.activeOnly !== false) {
    where.push('is_active = TRUE');
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_recommendation_catalog ${whereClause}
     ORDER BY category, recommendation_type`,
    params,
  );
  return result.rows.map(mapRow);
}

export async function getCatalogEntry(
  tenantId: string,
  recommendationType: string,
): Promise<RecommendationCatalogEntry | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_recommendation_catalog
     WHERE recommendation_type = $1`,
    [recommendationType],
  );
  return result.rows.length > 0 ? mapRow(getFirstRow(result)) : null;
}

export async function upsertCatalogEntry(
  tenantId: string,
  entry: {
    recommendationType: string;
    displayNameEn: string;
    displayNameAr?: string;
    category: RecommendationCategory;
    applicableStepTypes?: string[];
    requiresHumanReview?: boolean;
    maxConfidenceForAuto?: number;
  },
): Promise<RecommendationCatalogEntry> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_recommendation_catalog
       (recommendation_type, display_name_en, display_name_ar, category,
        applicable_step_types, requires_human_review, max_confidence_for_auto)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (recommendation_type) DO UPDATE SET
       display_name_en = EXCLUDED.display_name_en,
       display_name_ar = EXCLUDED.display_name_ar,
       category = EXCLUDED.category,
       applicable_step_types = EXCLUDED.applicable_step_types,
       requires_human_review = EXCLUDED.requires_human_review,
       max_confidence_for_auto = EXCLUDED.max_confidence_for_auto,
       updated_at = NOW()
     RETURNING *`,
    [
      entry.recommendationType,
      entry.displayNameEn,
      entry.displayNameAr || null,
      entry.category,
      entry.applicableStepTypes || [],
      entry.requiresHumanReview !== false,
      entry.maxConfidenceForAuto ?? 0.95,
    ],
  );
  return mapRow(getFirstRow(result));
}

export async function getApplicableRecommendations(
  tenantId: string,
  stepType: string,
): Promise<RecommendationCatalogEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_recommendation_catalog
     WHERE is_active = TRUE
       AND ($1 = ANY(applicable_step_types) OR 'any' = ANY(applicable_step_types))
     ORDER BY category, recommendation_type`,
    [stepType],
  );
  return result.rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): RecommendationCatalogEntry {
  return {

    catalog_id: row.catalog_id,

    recommendation_type: row.recommendation_type,

    display_name_en: row.display_name_en,

    display_name_ar: row.display_name_ar || null,

    category: row.category,

    applicable_step_types: row.applicable_step_types || [],

    requires_human_review: row.requires_human_review ?? true,
    max_confidence_for_auto: row.max_confidence_for_auto !== undefined ? Number(row.max_confidence_for_auto) : 0.95,

    is_active: row.is_active ?? true,

    created_at: row.created_at,
  };
}
