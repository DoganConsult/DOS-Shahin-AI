/**
 * DORA Mapping Service — Map DORA articles to internal controls, risks, and evidence.
 *
 * MP-25 §3.1: Cross-reference DORA regulatory articles with internal compliance
 * frameworks, controls, risks, and evidence artifacts.
 *
 * Enables:
 *   - Map DORA articles to compliance framework controls
 *   - Cross-reference with risk assessments
 *   - Link evidence artifacts to DORA requirements
 *   - Gap analysis between DORA requirements and current controls
 *
 * DB tables: dora_framework_mappings, dora_control_mappings
 *
 * @owner dora
 * @module dora
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { emitDoraEvent } from './dora-event.service';
import type { GenericRow } from '@dos/types';

// ── DORA Articles Reference ────────────────────────────────────────────
export const DORA_ARTICLE_GROUPS = {
  ict_risk_management: ['Art. 5', 'Art. 6', 'Art. 7', 'Art. 8', 'Art. 9', 'Art. 10', 'Art. 11', 'Art. 12', 'Art. 13', 'Art. 14', 'Art. 15', 'Art. 16'],
  incident_reporting: ['Art. 17', 'Art. 18', 'Art. 19', 'Art. 20', 'Art. 21', 'Art. 22', 'Art. 23'],
  resilience_testing: ['Art. 24', 'Art. 25', 'Art. 26', 'Art. 27'],
  third_party_risk: ['Art. 28', 'Art. 29', 'Art. 30', 'Art. 31', 'Art. 32', 'Art. 33', 'Art. 34', 'Art. 35', 'Art. 36', 'Art. 37', 'Art. 38', 'Art. 39', 'Art. 40', 'Art. 41', 'Art. 42', 'Art. 43', 'Art. 44'],
  information_sharing: ['Art. 45'],
} as const;

// ── DTOs ───────────────────────────────────────────────────────────────
export interface CreateFrameworkMappingDTO {
  doraArticle: string;
  doraPillar: string;
  frameworkCode: string;
  frameworkControlRef: string;
  coverageLevel: 'full' | 'partial' | 'none';
  notes?: string;
  gapDescription?: string;
}

export interface CreateControlMappingDTO {
  doraArticle: string;
  doraPillar: string;
  controlId: string;
  riskId?: string;
  evidenceIds?: string[];
  coverageLevel: 'full' | 'partial' | 'none';
  effectivenessRating?: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  notes?: string;
}

export interface MappingFilters {
  doraPillar?: string;
  doraArticle?: string;
  coverageLevel?: string;
  frameworkCode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ── Framework Mappings ─────────────────────────────────────────────────

/**
 * List framework mappings with filtering and pagination.
 * Shows how DORA articles map to external compliance framework controls.
 */
export async function listFrameworkMappings(
  tenantId: string,
  filters: MappingFilters = {},
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.doraPillar) {
    conditions.push(`dora_pillar = $${idx++}`);
    params.push(filters.doraPillar);
  }
  if (filters.doraArticle) {
    conditions.push(`dora_article = $${idx++}`);
    params.push(filters.doraArticle);
  }
  if (filters.coverageLevel) {
    conditions.push(`coverage_level = $${idx++}`);
    params.push(filters.coverageLevel);
  }
  if (filters.frameworkCode) {
    conditions.push(`framework_code = $${idx++}`);
    params.push(filters.frameworkCode);
  }
  if (filters.search) {
    conditions.push(`(dora_article ILIKE $${idx} OR framework_control_ref ILIKE $${idx} OR notes ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".dora_framework_mappings ${where}`,
    params,
  );
  const total = getFirstRow(countResult)?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".dora_framework_mappings ${where}
     ORDER BY dora_pillar, dora_article LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  return { rows: dataResult.rows, total };
}

/**
 * Create a framework mapping between a DORA article and an external framework control.
 * Emits dora.framework_mapping_created event.
 */
export async function createFrameworkMapping(
  tenantId: string,
  dto: CreateFrameworkMappingDTO,
  createdBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_framework_mappings
      (dora_article, dora_pillar, framework_code, framework_control_ref,
       coverage_level, notes, gap_description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      dto.doraArticle,
      dto.doraPillar,
      dto.frameworkCode,
      dto.frameworkControlRef,
      dto.coverageLevel,
      dto.notes || null,
      dto.gapDescription || null,
      createdBy || null,
    ],
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.framework_mapping_created', 'framework_mapping', row.mapping_id, {
      doraArticle: dto.doraArticle,
      frameworkCode: dto.frameworkCode,
      coverageLevel: dto.coverageLevel,
    });
  }
  return row;
}

/**
 * Delete a framework mapping by ID (soft-delete).
 */
export async function deleteFrameworkMapping(
  tenantId: string,
  mappingId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_framework_mappings
     SET deleted_at = NOW()
     WHERE mapping_id = $1 AND deleted_at IS NULL
     RETURNING mapping_id`,
    [mappingId],
  );
  return (result.rows?.length ?? 0) > 0;
}

// ── Control Mappings ───────────────────────────────────────────────────

/**
 * List control mappings showing DORA articles mapped to internal controls.
 */
export async function listControlMappings(
  tenantId: string,
  filters: MappingFilters = {},
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.doraPillar) {
    conditions.push(`dora_pillar = $${idx++}`);
    params.push(filters.doraPillar);
  }
  if (filters.doraArticle) {
    conditions.push(`dora_article = $${idx++}`);
    params.push(filters.doraArticle);
  }
  if (filters.coverageLevel) {
    conditions.push(`coverage_level = $${idx++}`);
    params.push(filters.coverageLevel);
  }
  if (filters.search) {
    conditions.push(`(dora_article ILIKE $${idx} OR notes ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".dora_control_mappings ${where}`,
    params,
  );
  const total = getFirstRow(countResult)?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".dora_control_mappings ${where}
     ORDER BY dora_pillar, dora_article LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  return { rows: dataResult.rows, total };
}

/**
 * Create a control mapping between a DORA article and an internal control.
 * Emits dora.control_mapping_created event.
 */
export async function createControlMapping(
  tenantId: string,
  dto: CreateControlMappingDTO,
  createdBy?: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_control_mappings
      (dora_article, dora_pillar, control_id, risk_id, evidence_ids,
       coverage_level, effectiveness_rating, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      dto.doraArticle,
      dto.doraPillar,
      dto.controlId,
      dto.riskId || null,
      JSON.stringify(dto.evidenceIds || []),
      dto.coverageLevel,
      dto.effectivenessRating || 'not_assessed',
      dto.notes || null,
      createdBy || null,
    ],
  );

  const row = getFirstRow(result)!;
  if (row) {
    await emitDoraEvent(tenantId, 'dora.control_mapping_created', 'control_mapping', row.mapping_id, {
      doraArticle: dto.doraArticle,
      controlId: dto.controlId,
      coverageLevel: dto.coverageLevel,
    });
  }
  return row;
}

/**
 * Delete a control mapping by ID (soft-delete).
 */
export async function deleteControlMapping(
  tenantId: string,
  mappingId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_control_mappings
     SET deleted_at = NOW()
     WHERE mapping_id = $1 AND deleted_at IS NULL
     RETURNING mapping_id`,
    [mappingId],
  );
  return (result.rows?.length ?? 0) > 0;
}

// ── Gap Analysis ───────────────────────────────────────────────────────

/**
 * Perform gap analysis: identify DORA articles not covered by any control mapping.
 * Returns a coverage report per pillar and a list of uncovered articles.
 */
export async function analyzeGaps(
  tenantId: string,
): Promise<{
  pillarCoverage: { pillar: string; totalArticles: number; mapped: number; fullCoverage: number; partialCoverage: number; noCoverage: number; coveragePercent: number }[];
  uncoveredArticles: string[];
  totalArticles: number;
  totalMapped: number;
  overallCoveragePercent: number;
}> {
  const schema = tenantSchema(tenantId);

  // Get all control mappings grouped by article
  const mappingResult = await safeQuery(
    `SELECT dora_pillar, dora_article, coverage_level
     FROM "${schema}".dora_control_mappings
     WHERE deleted_at IS NULL`,
  );

  // Build a map of article -> best coverage level
  const articleCoverage = new Map<string, string>();
  for (const row of mappingResult.rows) {
    const current = articleCoverage.get(row.dora_article);
    // 'full' > 'partial' > 'none'
    if (!current || (row.coverage_level === 'full') || (current === 'none' && row.coverage_level === 'partial')) {
      articleCoverage.set(row.dora_article, row.coverage_level);
    }
  }

  const pillarCoverage: { pillar: string; totalArticles: number; mapped: number; fullCoverage: number; partialCoverage: number; noCoverage: number; coveragePercent: number }[] = [];
  const uncoveredArticles: string[] = [];
  let totalArticles = 0;
  let totalMapped = 0;

  for (const [pillar, articles] of Object.entries(DORA_ARTICLE_GROUPS)) {
    let mapped = 0;
    let fullCov = 0;
    let partialCov = 0;
    let noCov = 0;

    for (const article of articles) {
      totalArticles++;
      const coverage = articleCoverage.get(article);
      if (coverage === 'full') { fullCov++; mapped++; totalMapped++; }
      else if (coverage === 'partial') { partialCov++; mapped++; totalMapped++; }
      else { noCov++; uncoveredArticles.push(article); }
    }

    pillarCoverage.push({
      pillar,
      totalArticles: articles.length,
      mapped,
      fullCoverage: fullCov,
      partialCoverage: partialCov,
      noCoverage: noCov,
      coveragePercent: articles.length > 0 ? Math.round((mapped / articles.length) * 100) : 0,
    });
  }

  return {
    pillarCoverage,
    uncoveredArticles,
    totalArticles,
    totalMapped,
    overallCoveragePercent: totalArticles > 0 ? Math.round((totalMapped / totalArticles) * 100) : 0,
  };
}
