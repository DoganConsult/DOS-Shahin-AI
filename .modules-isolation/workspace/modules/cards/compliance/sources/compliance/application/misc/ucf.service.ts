// ============================================
// Shahin — Unified Control Framework (UCF) Service
// Manages bilingual control dictionary, crosswalk
// mapping validation, framework queries, activation
// enforcement, and control dictionary export.
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import type {
  UCFControl,
  CrosswalkMapping,
  ValidationResult,
  MappingRelationship,
  ControlLifecycleState,
} from "@dos/types";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

const VALID_RELATIONSHIPS: MappingRelationship[] = [
  "equivalent",
  "partial",
  "related",
  "derived_from",
];

// ── Helper: map a DB row to UCFControl ─────────────────────────────────────

function rowToControl(row: any, mappings: CrosswalkMapping[] = []): UCFControl {
  return {
    controlId: row.control_id,
    code: row.code,
    objectiveEn: row.objective_en,
    objectiveAr: row.objective_ar,
    activityEn: row.activity_en,
    activityAr: row.activity_ar,
    owner: row.owner,
    frequency: row.frequency,
    evidenceRequirements: row.evidence_requirements ?? [],
    testSteps: row.test_steps ?? [],
    exceptionRules: row.exception_rules ?? [],
    mappings,
    lifecycleState: row.lifecycle_state as ControlLifecycleState,
  };
}

function rowToMapping(row: Record<string, unknown>): CrosswalkMapping {
  return {

    mappingId: row.mapping_id,

    sourceControlId: row.source_control_id,

    targetRequirementId: row.target_requirement_id,
    relationship: row.relationship as MappingRelationship,
    confidence: parseFloat((row as any).confidence),
  };
}

// ── Get Controls with filters (Req 2.4, 2.5) ──────────────────────────────

export async function getControls(
  tenantId: string,
  filters: {
    framework?: string;
    domain?: string;
    entity?: string;
    owner?: string;
    lang?: "ar" | "en";
  } = {}
): Promise<UCFControl[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.owner) {
    conditions.push(`c.owner = $${paramIdx++}`);
    params.push(filters.owner);
  }
  if (filters.domain) {
    conditions.push(`c.code LIKE $${paramIdx++}`);
    params.push(`${filters.domain}%`);
  }
  if (filters.entity) {
    conditions.push(`c.owner = $${paramIdx++}`);
    params.push(filters.entity);
  }

  // Framework filter: join through crosswalk_mappings
  let joinClause = "";
  if (filters.framework) {
    joinClause = `INNER JOIN ${schema}.crosswalk_mappings m
                   ON m.source_control_id = c.control_id`;
    conditions.push(`m.target_requirement_id LIKE $${paramIdx++}`);
    params.push(`${filters.framework}%`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT DISTINCT c.* FROM ${schema}.ucf_controls c
    ${joinClause}
    ${whereClause}
    ORDER BY c.code
  `;

  const result = await safeQuery(sql, params);

  // Fetch mappings for each control
  const controls: UCFControl[] = [];
  for (const row of result.rows) {
    const mappingsResult = await safeQuery(
      `SELECT * FROM ${schema}.crosswalk_mappings WHERE source_control_id = $1`,
      [row.control_id]
    );
    const mappings = mappingsResult.rows.map(rowToMapping);
    controls.push(rowToControl(row, mappings));
  }

  return controls;
}

// ── Get Control by ID (Req 2.5) ────────────────────────────────────────────

export async function getControlById(
  tenantId: string,
  controlId: string
): Promise<UCFControl | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM ${schema}.ucf_controls WHERE control_id = $1`,
    [controlId]
  );
  if (result.rows.length === 0) return null;

  const mappingsResult = await safeQuery(
    `SELECT * FROM ${schema}.crosswalk_mappings WHERE source_control_id = $1`,
    [controlId]
  );
  const mappings = mappingsResult.rows.map(rowToMapping);

  return rowToControl(getFirstRow(result), mappings);
}

// ── Create Control (Req 2.1) ───────────────────────────────────────────────

export async function createControl(
  tenantId: string,
  control: Partial<UCFControl>
): Promise<UCFControl> {
  const schema = tenantSchema(tenantId);

  const controlId =
    control.controlId || `UCF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = control.code || controlId;
  const lifecycleState: ControlLifecycleState = control.lifecycleState || "design";

  const result = await safeQuery(
    `INSERT INTO ${schema}.ucf_controls
     (control_id, code, objective_en, objective_ar, activity_en, activity_ar,
      owner, frequency, lifecycle_state, evidence_requirements, test_steps, exception_rules)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      controlId,
      code,
      control.objectiveEn || "",
      control.objectiveAr || "",
      control.activityEn || "",
      control.activityAr || "",
      control.owner || "",
      control.frequency || "quarterly",
      lifecycleState,
      JSON.stringify(control.evidenceRequirements || []),
      JSON.stringify(control.testSteps || []),
      JSON.stringify(control.exceptionRules || []),
    ]
  );

  return rowToControl(getFirstRow(result), []);
}

// ── Validate Mapping (Req 2.2) ─────────────────────────────────────────────

export function validateMapping(
  mapping: Partial<CrosswalkMapping>
): ValidationResult {
  const errors: string[] = [];

  if (!mapping.sourceControlId || mapping.sourceControlId.trim() === "") {
    errors.push("sourceControlId is required");
  }
  if (!mapping.targetRequirementId || mapping.targetRequirementId.trim() === "") {
    errors.push("targetRequirementId is required");
  }
  if (
    !mapping.relationship ||
    !VALID_RELATIONSHIPS.includes(mapping.relationship)
  ) {
    errors.push(
      `relationship must be one of: ${VALID_RELATIONSHIPS.join(", ")}`
    );
  }
  if (
    mapping.confidence !== undefined &&
    (mapping.confidence < 0 || mapping.confidence > 1)
  ) {
    errors.push("confidence must be between 0.0 and 1.0");
  }

  return { valid: errors.length === 0, errors };
}

// ── Add Mapping (Req 2.2) ──────────────────────────────────────────────────

export async function addMapping(
  tenantId: string,
  mapping: Partial<CrosswalkMapping>
): Promise<CrosswalkMapping> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO ${schema}.crosswalk_mappings
     (source_control_id, target_requirement_id, relationship, confidence)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      mapping.sourceControlId,
      mapping.targetRequirementId,
      mapping.relationship ?? 'related',
      mapping.confidence ?? 1.0,
    ],
  );
  return rowToMapping(getFirstRow(result) as Record<string, unknown>);
}

// ── Query by Framework (Req 2.4) ───────────────────────────────────────────

export async function queryByFramework(
  tenantId: string,
  frameworkId: string,
  lang: "ar" | "en" = "en"
): Promise<UCFControl[]> {
  return getControls(tenantId, { framework: frameworkId, lang });
}

// ── Get Control Dictionary (Req 2.1, 2.7) ─────────────────────────────────
// Returns controls in audit-testable format:
// control objective → control activity → owner → frequency → evidence → test steps → exceptions

export async function getControlDictionary(
  tenantId: string,
  lang: "ar" | "en" = "en"
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  // secrets-scan-allow: schema tenantSchema()-validated; module param bound via $N
  const result = await safeQuery(
    `SELECT c.*, 
       (SELECT json_agg(json_build_object(
          'mappingId', m.mapping_id,
          'sourceControlId', m.source_control_id,
          'targetRequirementId', m.target_requirement_id,
          'relationship', m.relationship,
          'confidence', m.confidence
        )) FROM ${schema}.crosswalk_mappings m WHERE m.source_control_id = c.control_id
       ) AS mappings
     FROM ${schema}.ucf_controls c
     ORDER BY c.code`
  );

  return result.rows.map((row: GenericRow) => ({
    controlId: row.control_id,
    code: row.code,
    objective: lang === "ar" ? row.objective_ar : row.objective_en,
    activity: lang === "ar" ? row.activity_ar : row.activity_en,
    owner: row.owner,
    frequency: row.frequency,
    evidenceRequirements: row.evidence_requirements ?? [],
    testSteps: row.test_steps ?? [],
    exceptionRules: row.exception_rules ?? [],
    mappings: row.mappings ?? [],
    lifecycleState: row.lifecycle_state,
  }));
}

// ── Activate Control (Req 2.6) ─────────────────────────────────────────────
// Enforces at least one mapping before activation

export async function activateControl(
  tenantId: string,
  controlId: string
): Promise<UCFControl> {
  const schema = tenantSchema(tenantId);
  const mappingsRes = await safeQuery(
    `SELECT COUNT(*)::INT AS cnt FROM ${schema}.crosswalk_mappings WHERE source_control_id = $1`,
    [controlId],
  );
  const mappingCount: number = (mappingsRes.rows[0] as Record<string, unknown>)?.cnt as number ?? 0;
  if (mappingCount === 0) {
    throw Object.assign(
      new Error('Control must have at least one crosswalk mapping before activation'),
      { statusCode: 422 },
    );
  }
  const result = await safeQuery(
    `UPDATE ${schema}.ucf_controls
     SET lifecycle_state = 'active', updated_at = NOW()
     WHERE control_id = $1
     RETURNING *`,
    [controlId],
  );
  const row = getFirstRow(result)!;
  if (!row) throw Object.assign(new Error(`Control ${controlId} not found`), { statusCode: 404 });
  const mappingsResult = await safeQuery(
    `SELECT * FROM ${schema}.crosswalk_mappings WHERE source_control_id = $1`,
    [controlId],
  );
  return rowToControl(row, mappingsResult.rows.map(rowToMapping));
}
