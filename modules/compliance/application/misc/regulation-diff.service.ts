// ============================================
// Shahin-Ai — Regulation Version Diff Service
// Function 9: Compare two versions of a regulation
// document to identify added, removed, and modified
// clauses. Assess impact severity on linked controls
// and obligations.
// ============================================

import { v4 as uuid } from "uuid";
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ============================================================================
// Types
// ============================================================================

export interface ClauseChange {
  /** Clause reference (section number) */
  clauseRef: string;
  /** Text from version 1 (null for added clauses) */
  textV1: string | null;
  /** Text from version 2 (null for removed clauses) */
  textV2: string | null;
  /** Type of change */
  changeType: "added" | "removed" | "modified";
  /** Clause type (obligation, prohibition, etc.) */
  clauseType: string;
  /** Severity of the clause (mandatory/recommended/optional) */
  severity: string;
  /** Whether the change is semantically significant */
  semanticSignificance: "high" | "medium" | "low";
}

export interface DiffResult {
  diffId: string;
  /** Source document version 1 */
  docV1Id: string;
  /** Source document version 2 */
  docV2Id: string;
  /** Clauses present in v2 but not v1 */
  added: ClauseChange[];
  /** Clauses present in v1 but not v2 */
  removed: ClauseChange[];
  /** Clauses with same ref but different text */
  modified: ClauseChange[];
  /** Human-readable impact summary in English */
  impactSummaryEn: string;
  /** Human-readable impact summary in Arabic */
  impactSummaryAr: string;
  /** Overall impact severity */
  impactSeverity: "critical" | "high" | "medium" | "low";
}

export interface AffectedEntity {
  entityType: "control" | "obligation";
  entityId: string;
  entityTitle: string;
  /** The clause reference that triggers the impact */
  clauseRef: string;
  /** How the entity is affected */
  impactType: "requires_update" | "requires_review" | "deprecated" | "new_requirement";
}

// ============================================================================
// Table Initialization
// ============================================================================

let tablesInitialized = false;

async function ensureTables(tenantId: string): Promise<void> {
  if (tablesInitialized) return;
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".regulation_diffs (
      diff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_v1_id UUID NOT NULL,
      doc_v2_id UUID NOT NULL,
      added JSONB DEFAULT '[]',
      removed JSONB DEFAULT '[]',
      modified JSONB DEFAULT '[]',
      impact_summary_en TEXT,
      impact_summary_ar TEXT,
      impact_severity VARCHAR(20) DEFAULT 'low',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reg_diffs_docs
      ON "${schema}".regulation_diffs (doc_v1_id, doc_v2_id);

    CREATE TABLE IF NOT EXISTS "${schema}".regulation_diff_affected (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      diff_id UUID NOT NULL REFERENCES "${schema}".regulation_diffs(diff_id) ON DELETE CASCADE,
      entity_type VARCHAR(30) NOT NULL,
      entity_id UUID NOT NULL,
      entity_title TEXT,
      clause_ref VARCHAR(100),
      impact_type VARCHAR(30) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reg_diff_affected_diff_id
      ON "${schema}".regulation_diff_affected (diff_id);
  `);

  tablesInitialized = true;
}

// ============================================================================
// Semantic Significance Detection
// ============================================================================

/**
 * Determine semantic significance of a clause text change.
 * Compares the old and new text to detect whether the change
 * represents a material regulatory shift.
 */
function assessSemanticSignificance(
  textV1: string,
  textV2: string,
): "high" | "medium" | "low" {
  const lower1 = textV1.toLowerCase();
  const lower2 = textV2.toLowerCase();

  // High significance: change in modality (shall/must vs may/should)
  const mandatoryV1 = /\b(shall|must|required)\b/.test(lower1) || /يجب/.test(textV1);
  const mandatoryV2 = /\b(shall|must|required)\b/.test(lower2) || /يجب/.test(textV2);
  const permissiveV1 = /\b(may|should|recommended)\b/.test(lower1) || /يجوز/.test(textV1);
  const permissiveV2 = /\b(may|should|recommended)\b/.test(lower2) || /يجوز/.test(textV2);

  if (mandatoryV1 !== mandatoryV2 || permissiveV1 !== permissiveV2) {
    return "high";
  }

  // High significance: introduction of penalties or new timelines
  const penaltyV1 = /\b(penalty|fine|sanction)\b/.test(lower1) || /عقوبة|غرامة/.test(textV1);
  const penaltyV2 = /\b(penalty|fine|sanction)\b/.test(lower2) || /عقوبة|غرامة/.test(textV2);
  if (!penaltyV1 && penaltyV2) {
    return "high";
  }

  // Medium significance: more than 30% text changed by Levenshtein approximation
  const words1 = lower1.split(/\s+/);
  const words2 = lower2.split(/\s+/);
  const allWords = new Set([...words1, ...words2]);
  const commonWords = words1.filter((w) => words2.includes(w));
  const changeRatio =
    allWords.size > 0 ? 1 - commonWords.length / allWords.size : 0;

  if (changeRatio > 0.4) {
    return "high";
  }
  if (changeRatio > 0.15) {
    return "medium";
  }

  return "low";
}

/**
 * Determine overall impact severity from the set of clause changes.
 */
function computeOverallSeverity(
  added: ClauseChange[],
  removed: ClauseChange[],
  modified: ClauseChange[],
): "critical" | "high" | "medium" | "low" {
  // Critical: mandatory clauses added or removed
  const hasMandatoryAdded = added.some((c) => c.severity === "mandatory");
  const hasMandatoryRemoved = removed.some((c) => c.severity === "mandatory");
  const hasHighSignificanceModified = modified.some(
    (c) => c.semanticSignificance === "high" && c.severity === "mandatory",
  );

  if (hasMandatoryRemoved || hasHighSignificanceModified) {
    return "critical";
  }
  if (hasMandatoryAdded) {
    return "high";
  }
  if (
    modified.some((c) => c.semanticSignificance === "medium") ||
    added.length > 5 ||
    removed.length > 3
  ) {
    return "medium";
  }
  return "low";
}

/**
 * Generate human-readable impact summaries.
 */
function generateImpactSummaries(
  added: ClauseChange[],
  removed: ClauseChange[],
  modified: ClauseChange[],
  severity: string,
): { en: string; ar: string } {
  const totalChanges = added.length + removed.length + modified.length;
  const mandatoryChanges = [...added, ...removed, ...modified].filter(
    (c) => c.severity === "mandatory",
  ).length;

  const en = [
    `Regulation version comparison identified ${totalChanges} changes:`,
    `${added.length} new clause(s) added,`,
    `${removed.length} clause(s) removed,`,
    `${modified.length} clause(s) modified.`,
    mandatoryChanges > 0
      ? `${mandatoryChanges} mandatory requirement(s) affected.`
      : "",
    `Overall impact severity: ${severity}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const ar = [
    `حدد مقارنة إصدارات التنظيم ${totalChanges} تغييرات:`,
    `تمت إضافة ${added.length} بند(ود) جديد(ة)،`,
    `تمت إزالة ${removed.length} بند(ود)،`,
    `تم تعديل ${modified.length} بند(ود).`,
    mandatoryChanges > 0
      ? `تأثرت ${mandatoryChanges} متطلب(ات) إلزامي(ة).`
      : "",
    `مستوى التأثير العام: ${severity === "critical" ? "حرج" : severity === "high" ? "عالي" : severity === "medium" ? "متوسط" : "منخفض"}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { en, ar };
}

// ============================================================================
// Core Diff Engine
// ============================================================================

/**
 * Compare two versions of a regulation document by diffing their clauses.
 *
 * The function:
 * 1. Fetches clauses from both document versions
 * 2. Matches clauses by clause_ref (section number)
 * 3. Classifies changes as added, removed, or modified
 * 4. Detects semantic significance for modified clauses
 * 5. Assesses overall impact severity
 * 6. Identifies affected controls and obligations
 * 7. Persists the diff result to regulation_diffs table
 *
 * @param tenantId - Tenant identifier for schema scoping
 * @param docV1Id  - Document ID of version 1 (older)
 * @param docV2Id  - Document ID of version 2 (newer)
 * @returns Diff result with added, removed, and modified clauses
 */
export async function diffRegulationVersions(
  tenantId: string,
  docV1Id: string,
  docV2Id: string,
): Promise<DiffResult> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);
  const diffId = uuid();

  // Fetch clauses from both documents
  const [v1Result, v2Result] = await Promise.all([
    safeQuery(
      `SELECT clause_id, clause_ref, text, clause_type, severity
       FROM "${schema}".regulatory_clauses
       WHERE document_id = $1
       ORDER BY sort_order ASC`,
      [docV1Id],
    ),
    safeQuery(
      `SELECT clause_id, clause_ref, text, clause_type, severity
       FROM "${schema}".regulatory_clauses
       WHERE document_id = $1
       ORDER BY sort_order ASC`,
      [docV2Id],
    ),
  ]);

  // Build clause maps keyed by clause_ref
  const v1Map = new Map<string, { text: string; clauseType: string; severity: string }>();
  for (const row of v1Result.rows) {
    v1Map.set(row.clause_ref, {
      text: row.text,
      clauseType: row.clause_type,
      severity: row.severity,
    });
  }

  const v2Map = new Map<string, { text: string; clauseType: string; severity: string }>();
  for (const row of v2Result.rows) {
    v2Map.set(row.clause_ref, {
      text: row.text,
      clauseType: row.clause_type,
      severity: row.severity,
    });
  }

  // Classify changes
  const added: ClauseChange[] = [];
  const removed: ClauseChange[] = [];
  const modified: ClauseChange[] = [];

  // Find added clauses (in v2 but not v1)
  for (const [ref, v2Clause] of v2Map.entries()) {
    if (!v1Map.has(ref)) {
      added.push({
        clauseRef: ref,
        textV1: null,
        textV2: v2Clause.text,
        changeType: "added",
        clauseType: v2Clause.clauseType,
        severity: v2Clause.severity,
        semanticSignificance: v2Clause.severity === "mandatory" ? "high" : "medium",
      });
    }
  }

  // Find removed clauses (in v1 but not v2)
  for (const [ref, v1Clause] of v1Map.entries()) {
    if (!v2Map.has(ref)) {
      removed.push({
        clauseRef: ref,
        textV1: v1Clause.text,
        textV2: null,
        changeType: "removed",
        clauseType: v1Clause.clauseType,
        severity: v1Clause.severity,
        semanticSignificance: v1Clause.severity === "mandatory" ? "high" : "medium",
      });
    }
  }

  // Find modified clauses (same ref, different text)
  for (const [ref, v1Clause] of v1Map.entries()) {
    const v2Clause = v2Map.get(ref);
    if (v2Clause && v1Clause.text !== v2Clause.text) {
      modified.push({
        clauseRef: ref,
        textV1: v1Clause.text,
        textV2: v2Clause.text,
        changeType: "modified",
        clauseType: v2Clause.clauseType,
        severity: v2Clause.severity,
        semanticSignificance: assessSemanticSignificance(v1Clause.text, v2Clause.text),
      });
    }
  }

  // Compute overall impact severity
  const impactSeverity = computeOverallSeverity(added, removed, modified);

  // Generate impact summaries
  const summaries = generateImpactSummaries(added, removed, modified, impactSeverity);

  // Persist diff result
  await safeQuery(
    `INSERT INTO "${schema}".regulation_diffs
     (diff_id, doc_v1_id, doc_v2_id, added, removed, modified,
      impact_summary_en, impact_summary_ar, impact_severity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      diffId,
      docV1Id,
      docV2Id,
      JSON.stringify(added),
      JSON.stringify(removed),
      JSON.stringify(modified),
      summaries.en,
      summaries.ar,
      impactSeverity,
    ],
  );

  // Assess impact on controls and obligations
  await identifyAffectedEntities(tenantId, schema, diffId, added, removed, modified);

  // Emit event
  await eventBus.publish({
    eventType: "delta.detected" as any,
    tenantId,

    sourceService: "RegulationDiffService",
    entityType: "regulation_diff",
    entityId: diffId,
    severity: impactSeverity === "critical" ? "critical" : impactSeverity === "high" ? "warning" : "info",
    payload: {
      docV1Id,
      docV2Id,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      impactSeverity,
    },
  });

  return {
    diffId,
    docV1Id,
    docV2Id,
    added,
    removed,
    modified,
    impactSummaryEn: summaries.en,
    impactSummaryAr: summaries.ar,
    impactSeverity,
  };
}

/**
 * Identify controls and obligations affected by clause changes.
 * Traverses the obligation-to-control linkage graph to find impacted entities.
 */
async function identifyAffectedEntities(
  tenantId: string,
  schema: string,
  diffId: string,
  added: ClauseChange[],
  removed: ClauseChange[],
  modified: ClauseChange[],
): Promise<void> {
  // Collect all changed clause refs
  const changedRefs = [
    ...added.map((c) => c.clauseRef),
    ...removed.map((c) => c.clauseRef),
    ...modified.map((c) => c.clauseRef),
  ];

  if (changedRefs.length === 0) return;

  // Find obligations linked to changed clause refs via requirement_ref
  const obligationResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT obligation_id, requirement_ref, title_en, mapped_controls
     FROM "${schema}".compliance_obligations
     WHERE requirement_ref = ANY($1)
       AND deleted_at IS NULL`,
    [changedRefs],
  ), { tenantId: tenantId, operation: 'query compliance_obligations' });

  for (const obl of obligationResult.rows) {
    // Determine impact type based on what happened to the clause
    const isRemoved = removed.some((c) => c.clauseRef === obl.requirement_ref);
    const isModified = modified.some((c) => c.clauseRef === obl.requirement_ref);
    const impactType = isRemoved
      ? "deprecated"
      : isModified
        ? "requires_update"
        : "requires_review";

    await safeQuery(
      `INSERT INTO "${schema}".regulation_diff_affected
       (diff_id, entity_type, entity_id, entity_title, clause_ref, impact_type)
       VALUES ($1, 'obligation', $2, $3, $4, $5)`,
      [diffId, obl.obligation_id, obl.title_en, obl.requirement_ref, impactType],
    );

    // Track affected controls through mapped_controls
    const mappedControls = obl.mapped_controls || [];

    for (const controlId of mappedControls) {
      const controlResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT control_id, title FROM "${schema}".controls WHERE control_id = $1`,
        [controlId],
      ), { tenantId: tenantId, operation: 'query controls' });

      if (controlResult.rows.length > 0) {
        await safeQuery(
          `INSERT INTO "${schema}".regulation_diff_affected
           (diff_id, entity_type, entity_id, entity_title, clause_ref, impact_type)
           VALUES ($1, 'control', $2, $3, $4, $5)`,
          [
            diffId,
            controlResult.rows[0].control_id,
            controlResult.rows[0].title,
            obl.requirement_ref,
            "requires_review",
          ],
        );
      }
    }
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Retrieve a previously computed diff result by its ID.
 *
 * @param tenantId - Tenant identifier for schema scoping
 * @param diffId   - UUID of the diff to retrieve
 * @returns Stored diff result or throws 404
 */
export async function getDiffResults(
  tenantId: string,
  diffId: string,
): Promise<DiffResult> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT diff_id, doc_v1_id, doc_v2_id, added, removed, modified,
            impact_summary_en, impact_summary_ar, impact_severity
     FROM "${schema}".regulation_diffs
     WHERE diff_id = $1`,
    [diffId],
  );

  if (result.rows.length === 0) {
    const err: unknown = new Error(`Diff ${diffId} not found`);

    err.status = 404;
    throw err;
  }

  const row = result.rows[0];
  return {
    diffId: row.diff_id,
    docV1Id: row.doc_v1_id,
    docV2Id: row.doc_v2_id,
    added: typeof row.added === "string" ? JSON.parse(row.added) : row.added || [],
    removed: typeof row.removed === "string" ? JSON.parse(row.removed) : row.removed || [],
    modified: typeof row.modified === "string" ? JSON.parse(row.modified) : row.modified || [],
    impactSummaryEn: row.impact_summary_en,
    impactSummaryAr: row.impact_summary_ar,
    impactSeverity: row.impact_severity,
  };
}

/**
 * List all entities (controls and obligations) affected by a regulation diff.
 *
 * @param tenantId - Tenant identifier for schema scoping
 * @param diffId   - UUID of the diff to inspect
 * @returns Array of affected entities with impact classification
 */
export async function getAffectedEntities(
  tenantId: string,
  diffId: string,
): Promise<AffectedEntity[]> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT entity_type, entity_id, entity_title, clause_ref, impact_type
     FROM "${schema}".regulation_diff_affected
     WHERE diff_id = $1
     ORDER BY entity_type, clause_ref`,
    [diffId],
  );

  return result.rows.map((row: GenericRow) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityTitle: row.entity_title,
    clauseRef: row.clause_ref,
    impactType: row.impact_type,
  }));
}
