// ============================================
// Shahin — Evidence Catalog & Quality Gates
// Per-control evidence requirements, quality
// gate validation, retention enforcement,
// completeness checking, hash-chain integration
// ============================================

import { emptyResult, query as _query, safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import {
  EvidenceCatalogEntry,
  QualityGateResult,
  QualityGateFailure,
  EvidenceFrequency,
} from "@dos/types";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ============================================
// Catalog CRUD
// ============================================

/** Get evidence catalog entries for a control */
export async function getCatalog(
  tenantId: string,
  controlId: string
): Promise<EvidenceCatalogEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT control_id, evidence_type, source_system, frequency,
            naming_standard, retention_days, attach_role, approve_role
     FROM "${schema}".evidence_catalog
     WHERE control_id = $1
     ORDER BY evidence_type ASC`,
    [controlId]
  );
  return result.rows.map(mapRowToEntry);
}

/** Create a new catalog entry */
export async function createCatalogEntry(
  tenantId: string,
  entry: Partial<EvidenceCatalogEntry>
): Promise<EvidenceCatalogEntry> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_catalog
      (control_id, evidence_type, source_system, frequency,
       naming_standard, retention_days, attach_role, approve_role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      entry.controlId,
      entry.evidenceType,
      entry.sourceSystem || "manual",
      entry.frequency || "quarterly",
      entry.namingStandard || "",
      entry.retentionDays ?? 365,
      entry.attachRole || "",
      entry.approveRole || "",
    ]
  );
  return mapRowToEntry(getFirstRow(result));
}


// ============================================
// Quality Gate Validation (Pure Function)
// ============================================

/**
 * Pure function: validate evidence submission against quality gate rules.
 * Returns failures for missing required fields.
 * Validates: date, owner, system reference, ticket ID, approval trail.
 */
export function validateEvidence(submission: {
  date?: string;
  owner?: string;
  systemReference?: string;
  ticketId?: string;
  approvalTrail?: string[];
}): QualityGateResult {
  const failures: QualityGateFailure[] = [];

  if (!submission.date || submission.date.trim() === "") {
    failures.push({
      field: "date",
      rule: "required",
      message: "Evidence date is required",
    });
  }

  if (!submission.owner || submission.owner.trim() === "") {
    failures.push({
      field: "owner",
      rule: "required",
      message: "Evidence owner is required",
    });
  }

  if (!submission.systemReference || submission.systemReference.trim() === "") {
    failures.push({
      field: "systemReference",
      rule: "required",
      message: "System reference is required",
    });
  }

  if (!submission.ticketId || submission.ticketId.trim() === "") {
    failures.push({
      field: "ticketId",
      rule: "required",
      message: "Ticket ID is required",
    });
  }

  if (
    !submission.approvalTrail ||
    !Array.isArray(submission.approvalTrail) ||
    submission.approvalTrail.length === 0
  ) {
    failures.push({
      field: "approvalTrail",
      rule: "required",
      message: "Approval trail is required with at least one entry",
    });
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// ============================================
// Completeness Checking
// ============================================

/** Check evidence completeness for a control (G6: enforces maximum_age_days) */
export async function checkCompleteness(
  tenantId: string,
  controlId: string
): Promise<{ complete: boolean; total: number; present: number; missing: string[]; expired: string[] }> {
  const schema = tenantSchema(tenantId);

  const catalogResult = await safeQuery(
    `SELECT evidence_type FROM "${schema}".evidence_catalog WHERE control_id = $1`,
    [controlId]
  );
  const requiredTypes: string[] = catalogResult.rows.map((r: GenericRow) => r.evidence_type);

  if (requiredTypes.length === 0) {
    return { complete: true, total: 0, present: 0, missing: [], expired: [] };
  }

  const evidenceResult = await safeQuery(
    `SELECT DISTINCT ON (title) title, created_at
     FROM "${schema}".evidence WHERE control_id = $1
     ORDER BY title, created_at DESC`,
    [controlId]
  );
  const existingMap = new Map<string, Date>();
  for (const r of evidenceResult.rows) {
    existingMap.set(r.title, new Date(r.created_at));
  }

  // G6: Fetch freshness_days from control_evidence_requirements (tenant schema)
  // Note: freshness_days in tenant schema is equivalent to maximum_age_days in public schema
  const ageReqs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT cer.evidence_type_code, cer.freshness_days
     FROM "${schema}".control_evidence_requirements cer
     WHERE cer.control_id = $1 AND cer.freshness_days IS NOT NULL`,
    [controlId]
  ), { tenantId: tenantId, operation: 'query control_evidence_requirements' });

  const maxAgeMap = new Map<string, number>();
  for (const r of ageReqs.rows) {

    maxAgeMap.set((r as any).evidence_type_code, r.freshness_days);
  }

  const missing: string[] = [];
  const expired: string[] = [];
  const now = new Date();

  for (const t of requiredTypes) {
    if (!existingMap.has(t)) {
      missing.push(t);
    } else {
      const maxAgeDays = maxAgeMap.get(t);
      if (maxAgeDays) {
        const createdAt = existingMap.get(t)!;
        const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
        if (ageDays > maxAgeDays) {
          expired.push(t);
        }
      }
    }
  }

  const effectivePresent = requiredTypes.length - missing.length - expired.length;

  return {
    complete: missing.length === 0 && expired.length === 0,
    total: requiredTypes.length,
    present: effectivePresent,
    missing,
    expired,
  };
}

// ============================================
// Expiring Evidence
// ============================================

/** Get evidence items approaching expiry within daysThreshold */
export async function getExpiringEvidence(
  tenantId: string,
  daysThreshold: number
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT e.*, ec.retention_days
     FROM "${schema}".evidence e
     JOIN "${schema}".evidence_catalog ec
       ON e.control_id = ec.control_id
     WHERE e.created_at + (ec.retention_days || ' days')::INTERVAL
           <= CURRENT_DATE + ($1 || ' days')::INTERVAL
       AND e.created_at + (ec.retention_days || ' days')::INTERVAL
           >= CURRENT_DATE
     ORDER BY e.created_at ASC`,
    [daysThreshold]
  );
  return result.rows;
}

// ============================================
// Retention Enforcement (Pure Function)
// ============================================

/**
 * Pure function: check if evidence can be deleted based on retention period.
 * Returns true if deletion is allowed (past retention), false if blocked.
 */
export function canDeleteEvidence(retentionDays: number, createdAt: Date): boolean {
  const now = new Date();
  const retentionEnd = new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  return now >= retentionEnd;
}

// ============================================
// Hash-Chain Verification (Pure Function)
// ============================================

/**
 * Pure function: verify evidence hash-chain integrity.
 * Each item's previousHash should match the prior item's contentHash.
 * The first item's previousHash should be null.
 */
export function verifyHashChain(
  items: { contentHash: string; previousHash: string | null }[]
): { intact: boolean; brokenAt: number | null } {
  if (items.length === 0) {
    return { intact: true, brokenAt: null };
  }

  // First item must have null previousHash
  if (items[0].previousHash !== null) {
    return { intact: false, brokenAt: 0 };
  }

  // Each subsequent item's previousHash must match prior item's contentHash
  for (let i = 1; i < items.length; i++) {
    if (items[i].previousHash !== items[i - 1].contentHash) {
      return { intact: false, brokenAt: i };
    }
  }

  return { intact: true, brokenAt: null };
}

// ============================================
// Helpers
// ============================================

function mapRowToEntry(row: Record<string, unknown>): EvidenceCatalogEntry {
  return {

    controlId: row.control_id,

    evidenceType: row.evidence_type,

    sourceSystem: row.source_system,
    frequency: row.frequency as EvidenceFrequency,

    namingStandard: row.naming_standard,

    retentionDays: row.retention_days,

    attachRole: row.attach_role,

    approveRole: row.approve_role,
  };
}

// ============================================
// Enterprise Catalog — Full CRUD, Search, Tags
// ============================================

/**
 * Get a single evidence item by ID with hydrated metadata.
 */
export async function getEvidenceById(tenantId: string, evidenceId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT e.*,
            (SELECT COUNT(*) FROM "${schema}".evidence_links el WHERE el.evidence_id = e.evidence_id) AS link_count,
            (SELECT COUNT(*) FROM "${schema}".evidence_reviews er WHERE er.evidence_id = e.evidence_id AND er.deleted_at IS NULL) AS review_count,
            (SELECT COUNT(*) FROM "${schema}".evidence_package_items epi WHERE epi.evidence_id = e.evidence_id) AS package_count
     FROM "${schema}".evidence e
     WHERE e.evidence_id = $1 AND e.deleted_at IS NULL`,
    [evidenceId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Evidence not found'), { statusCode: 404 });

  const evidence = result.rows[0];

  // Hydrate tags
  const tagsResult = await safeQuery(
    `SELECT id, tag_key, tag_value, created_at FROM "${schema}".evidence_tags WHERE evidence_id = $1 ORDER BY tag_key`,
    [evidenceId]
  );
  evidence.tags = tagsResult.rows;

  // Hydrate links
  const linksResult = await safeQuery(
    `SELECT id, linked_object_type, linked_object_id, link_type, notes, created_by, created_at
     FROM "${schema}".evidence_links WHERE evidence_id = $1 ORDER BY created_at DESC`,
    [evidenceId]
  );
  evidence.links = linksResult.rows;

  // Hydrate freshness record
  const freshnessResult = await safeQuery(
    `SELECT * FROM "${schema}".evidence_freshness_records WHERE evidence_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [evidenceId]
  );
  evidence.freshnessRecord = freshnessResult.rows[0] || null;

  return evidence;
}

/**
 * Update evidence fields (partial update).
 */
export async function updateEvidence(tenantId: string, evidenceId: string, fields: Record<string, unknown>, _userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Allowlist of updatable columns
  const allowedFields: Record<string, string> = {
    title: 'title',
    description: 'description',
    evidenceCode: 'evidence_code',
    evidenceType: 'evidence_type',
    sourceSystemName: 'source_system_name',
    sourceRef: 'source_ref',
    ownerUserId: 'owner_user_id',
    confidentialityLevelId: 'confidentiality_level_id',
    validFrom: 'valid_from',
    validTo: 'valid_to',
    reusableFlag: 'reusable_flag',
    qualityStatus: 'quality_status',
    freshnessStatus: 'freshness_status',
  };

  const setClauses: string[] = ['updated_at = NOW()'];
  const vals: unknown[] = [];
  let idx = 1;

  for (const [key, col] of Object.entries(allowedFields)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${col} = $${idx++}`);
      vals.push(fields[key]);
    }
  }

  if (setClauses.length <= 1) throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 });

  vals.push(evidenceId);
  const result = await safeQuery(
    `UPDATE "${schema}".evidence SET ${setClauses.join(', ')} WHERE evidence_id = $${idx} AND deleted_at IS NULL RETURNING *`,
    vals
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Evidence not found'), { statusCode: 404 });
  return result.rows[0];
}

/**
 * Search evidence catalog with filters.
 */
export async function searchCatalog(tenantId: string, filters: {
  query?: string;
  evidenceType?: string;
  sourceType?: string;
  sourceSystem?: string;
  ownerUserId?: string;
  freshnessStatus?: string;
  qualityStatus?: string;
  reusableOnly?: boolean;
  frameworkCode?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['e.deleted_at IS NULL'];
  const vals: unknown[] = [];
  let idx = 1;

  if (filters.query) {
    conditions.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx} OR e.evidence_code ILIKE $${idx})`);
    vals.push(`%${filters.query}%`);
    idx++;
  }
  if (filters.evidenceType) { conditions.push(`e.evidence_type = $${idx++}`); vals.push(filters.evidenceType); }
  if (filters.sourceSystem) { conditions.push(`e.source_system_name = $${idx++}`); vals.push(filters.sourceSystem); }
  if (filters.ownerUserId) { conditions.push(`e.owner_user_id = $${idx++}`); vals.push(filters.ownerUserId); }
  if (filters.freshnessStatus) { conditions.push(`e.freshness_status = $${idx++}`); vals.push(filters.freshnessStatus); }
  if (filters.qualityStatus) { conditions.push(`e.quality_status = $${idx++}`); vals.push(filters.qualityStatus); }
  if (filters.reusableOnly) { conditions.push(`e.reusable_flag = true`); }
  if (filters.frameworkCode) { conditions.push(`e.framework_code = $${idx++}`); vals.push(filters.frameworkCode); }
  if (filters.status) { conditions.push(`e.status = $${idx++}`); vals.push(filters.status); }

  const whereClause = conditions.join(' AND ');
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  // Count total
  const countResult = await safeQuery(
    `SELECT COUNT(*) AS total FROM "${schema}".evidence e WHERE ${whereClause}`,
    vals
  );
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  // Fetch items
  vals.push(limit, offset);
  const result = await safeQuery(
    `SELECT e.evidence_id, e.evidence_code, e.title, e.description, e.evidence_type,
            e.source_system_name, e.status, e.freshness_status, e.quality_status,
            e.reusable_flag, e.owner_user_id, e.framework_code, e.control_id,
            e.valid_from, e.valid_to, e.created_at, e.updated_at,
            (SELECT COUNT(*) FROM "${schema}".evidence_links el WHERE el.evidence_id = e.evidence_id) AS link_count
     FROM "${schema}".evidence e
     WHERE ${whereClause}
     ORDER BY e.updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    vals
  );

  return { items: result.rows, total };
}

/**
 * Add tags to an evidence item.
 */
export async function addTags(tenantId: string, evidenceId: string, tags: { key: string; value?: string }[]): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const inserted: unknown[] = [];
  for (const tag of tags) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".evidence_tags (evidence_id, tag_key, tag_value)
       VALUES ($1, $2, $3) RETURNING *`,
      [evidenceId, tag.key, tag.value || null]
    );
    if (result.rows.length > 0) inserted.push(result.rows[0]);
  }

  return inserted;
}

/**
 * Remove a tag from an evidence item.
 */
export async function removeTag(tenantId: string, evidenceId: string, tagId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".evidence_tags WHERE id = $1 AND evidence_id = $2`,
    [tagId, evidenceId]
  );
}

/**
 * Get all tags for an evidence item.
 */
export async function getTags(tenantId: string, evidenceId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, tag_key, tag_value, created_at FROM "${schema}".evidence_tags WHERE evidence_id = $1 ORDER BY tag_key`,
    [evidenceId]
  );
  return result.rows;
}

/**
 * Get evidence taxonomy reference data (types, source types, confidentiality levels).
 */
export async function getTaxonomy(tenantId: string): Promise<{
  evidenceTypes: unknown[];
  sourceTypes: unknown[];
  confidentialityLevels: unknown[];
  qualityRules: unknown[];
  rejectionReasons: unknown[];
}> {
  const schema = tenantSchema(tenantId);
  const [types, sources, levels, rules, reasons] = await Promise.all([
    safeQuery(`SELECT * FROM "${schema}".evidence_types WHERE is_active = true ORDER BY label_en`, []),
    safeQuery(`SELECT * FROM "${schema}".evidence_source_types WHERE is_active = true ORDER BY label_en`, []),
    safeQuery(`SELECT * FROM "${schema}".evidence_confidentiality_levels ORDER BY sort_order`, []),
    safeQuery(`SELECT * FROM "${schema}".evidence_quality_rules WHERE is_active = true ORDER BY rule_name`, []),
    safeQuery(`SELECT * FROM "${schema}".evidence_rejection_reasons WHERE is_active = true ORDER BY label_en`, []),
  ]);
  return {
    evidenceTypes: types.rows,
    sourceTypes: sources.rows,
    confidentialityLevels: levels.rows,
    qualityRules: rules.rows,
    rejectionReasons: reasons.rows,
  };
}

/**
 * Get admin settings for evidence module.
 */
export async function getAdminSettings(tenantId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT setting_key, setting_value, description, updated_at FROM "${schema}".evidence_admin_settings ORDER BY setting_key`,
    []
  );
  const settings: Record<string, unknown> = {};
  for (const row of result.rows) {
    settings[row.setting_key] = { value: row.setting_value, description: row.description, updatedAt: row.updated_at };
  }
  return settings;
}

/**
 * Update admin settings.
 */
export async function updateAdminSettings(tenantId: string, key: string, value: unknown, userId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".evidence_admin_settings
     SET setting_value = $1, updated_by = $2, updated_at = NOW()
     WHERE setting_key = $3 RETURNING *`,
    [JSON.stringify(value), userId, key]
  );
  if (result.rows.length === 0) throw Object.assign(new Error(`Setting '${key}' not found`), { statusCode: 404 });
  return result.rows[0];
}

/**
 * Add a taxonomy entry (evidence type, source type, or confidentiality level).
 */
export async function addTaxonomyEntry(tenantId: string, type: string, data: { code: string; labelEn: string; labelAr?: string; [key: string]: any }): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const tableMap: Record<string, string> = {
    'evidence-types': 'evidence_types',
    'source-types': 'evidence_source_types',
    'confidentiality-levels': 'evidence_confidentiality_levels',
    'rejection-reasons': 'evidence_rejection_reasons',
  };
  const table = tableMap[type];
  if (!table) throw Object.assign(new Error(`Unknown taxonomy type: ${type}`), { statusCode: 400 });

  if (type === 'confidentiality-levels') {
    const result = await safeQuery(
      `INSERT INTO "${schema}".${table} (code, label_en, label_ar, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.code, data.labelEn, data.labelAr || null, data.sortOrder || 0]
    );
    return getFirstRow(result);
  }

  if (type === 'evidence-types') {
    const result = await safeQuery(
      `INSERT INTO "${schema}".${table} (code, label_en, label_ar, description, category) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.code, data.labelEn, data.labelAr || null, data.description || null, data.category || 'general']
    );
    return getFirstRow(result);
  }

  // Generic insert for source-types and rejection-reasons
  const result = await safeQuery(
    `INSERT INTO "${schema}".${table} (code, label_en, label_ar) VALUES ($1, $2, $3) RETURNING *`,
    [data.code, data.labelEn, data.labelAr || null]
  );
  return getFirstRow(result);
}

/**
 * Update a taxonomy entry.
 */
export async function updateTaxonomyEntry(tenantId: string, type: string, id: string, data: { labelEn?: string; labelAr?: string; isActive?: boolean }): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const tableMap: Record<string, string> = {
    'evidence-types': 'evidence_types',
    'source-types': 'evidence_source_types',
    'confidentiality-levels': 'evidence_confidentiality_levels',
    'rejection-reasons': 'evidence_rejection_reasons',
  };
  const table = tableMap[type];
  if (!table) throw Object.assign(new Error(`Unknown taxonomy type: ${type}`), { statusCode: 400 });

  const setClauses: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  if (data.labelEn !== undefined) { setClauses.push(`label_en = $${idx++}`); vals.push(data.labelEn); }
  if (data.labelAr !== undefined) { setClauses.push(`label_ar = $${idx++}`); vals.push(data.labelAr); }
  if (data.isActive !== undefined) { setClauses.push(`is_active = $${idx++}`); vals.push(data.isActive); }
  if (setClauses.length === 0) throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 });

  vals.push(id);
  const result = await safeQuery(
    `UPDATE "${schema}".${table} SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Entry not found'), { statusCode: 404 });
  return result.rows[0];
}

// ============================================
// Soft Delete / Archive / Restore
// ============================================

/**
 * Soft-delete evidence (set deleted_at timestamp).
 */
export async function softDeleteEvidence(tenantId: string, evidenceId: string, userId: string, reason?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  return withTransaction(tenantId, async (client) => {
    const result = await safeQueryWithClient(
      `UPDATE "${schema}".evidence
       SET deleted_at = NOW(), status = 'disposed', updated_at = NOW()
       WHERE evidence_id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [evidenceId], client
    );
    if (result.rows.length === 0) throw Object.assign(new Error('Evidence not found or already deleted'), { statusCode: 404 });

    await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_status_log (evidence_id, from_status, to_status, changed_by, reason)
       VALUES ($1, (SELECT status FROM "${schema}".evidence WHERE evidence_id = $1), 'disposed', $2, $3)`,
      [evidenceId, userId, reason || 'Soft deleted'], client
    );

    return result.rows[0];
  });
}

export async function archiveEvidence(tenantId: string, evidenceId: string, userId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  return withTransaction(tenantId, async (client) => {
    const result = await safeQueryWithClient(
      `UPDATE "${schema}".evidence
       SET status = 'archived', updated_at = NOW()
       WHERE evidence_id = $1 AND status NOT IN ('deleted', 'disposed', 'archived') AND deleted_at IS NULL
       RETURNING *`,
      [evidenceId], client
    );
    if (result.rows.length === 0) throw Object.assign(new Error('Evidence not found or cannot be archived'), { statusCode: 404 });

    await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_status_log (evidence_id, from_status, to_status, changed_by, reason)
       VALUES ($1, (SELECT status FROM "${schema}".evidence WHERE evidence_id = $1), 'archived', $2, 'Archived')`,
      [evidenceId, userId], client
    );

    return result.rows[0];
  });
}

export async function restoreEvidence(tenantId: string, evidenceId: string, userId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  return withTransaction(tenantId, async (client) => {
    const result = await safeQueryWithClient(
      `UPDATE "${schema}".evidence
       SET deleted_at = NULL, status = 'draft', updated_at = NOW()
       WHERE evidence_id = $1 AND deleted_at IS NOT NULL
       RETURNING *`,
      [evidenceId], client
    );
    if (result.rows.length === 0) throw Object.assign(new Error('Evidence not found or not deleted'), { statusCode: 404 });

    await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_status_log (evidence_id, from_status, to_status, changed_by, reason)
       VALUES ($1, 'disposed', 'draft', $2, 'Restored from deletion')`,
      [evidenceId, userId], client
    );

    return result.rows[0];
  });
}
