/**
 * Crosswalk-Mappings service — UCF→requirement mapping over
 * `<tenant_schema>.crosswalk_mappings`.
 */
import type { DbClient } from '../../db/runner';

export type CrosswalkRelationship = 'equivalent' | 'partial' | 'related' | 'derived_from';
const RELATIONSHIPS: ReadonlyArray<CrosswalkRelationship> = [
  'equivalent', 'partial', 'related', 'derived_from',
];

export interface CrosswalkMappingRow {
  mappingId: string;
  sourceControlId: string;
  targetRequirementId: string;
  relationship: CrosswalkRelationship;
  confidence: number;
  createdAt: string;
}

export interface ListCrosswalkMappingsInput {
  tenantSchema: string;
  sourceControlId?: string;
  targetRequirementId?: string;
  relationship?: CrosswalkRelationship;
  limit?: number;
  offset?: number;
}

export interface CreateCrosswalkMappingInput {
  tenantSchema: string;
  actorId: string;
  sourceControlId: string;
  targetRequirementId: string;
  relationship?: CrosswalkRelationship;
  confidence?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `mapping_id, source_control_id, target_requirement_id,
              relationship, confidence, created_at`;

const mapRow = (x: {
  mapping_id: string; source_control_id: string; target_requirement_id: string;
  relationship: string; confidence: string | number; created_at: string;
}): CrosswalkMappingRow => ({
  mappingId: x.mapping_id, sourceControlId: x.source_control_id,
  targetRequirementId: x.target_requirement_id,
  relationship: x.relationship as CrosswalkRelationship,
  confidence: Number(x.confidence), createdAt: x.created_at,
});

export async function listCrosswalkMappings(
  client: DbClient,
  input: ListCrosswalkMappingsInput,
): Promise<{ rows: CrosswalkMappingRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.sourceControlId) {
    params.push(input.sourceControlId);
    where += ` AND source_control_id = $${params.length}`;
  }
  if (input.targetRequirementId) {
    params.push(input.targetRequirementId);
    where += ` AND target_requirement_id = $${params.length}`;
  }
  if (input.relationship) {
    params.push(input.relationship);
    where += ` AND relationship = $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".crosswalk_mappings
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".crosswalk_mappings WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getCrosswalkMapping(
  client: DbClient,
  input: { tenantSchema: string; mappingId: string },
): Promise<CrosswalkMappingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".crosswalk_mappings
     WHERE mapping_id = $1`,
    [input.mappingId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createCrosswalkMapping(
  client: DbClient,
  input: CreateCrosswalkMappingInput,
): Promise<CrosswalkMappingRow> {
  assertSchema(input.tenantSchema);
  if (!input.sourceControlId || !input.targetRequirementId) {
    throw Object.assign(new Error('sourceControlId, targetRequirementId required'), { code: 'bad_input' });
  }
  if (input.relationship && !RELATIONSHIPS.includes(input.relationship)) {
    throw Object.assign(new Error(`bad relationship: ${input.relationship}`), { code: 'bad_relationship' });
  }
  if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 1)) {
    throw Object.assign(new Error(`bad confidence: ${input.confidence}`), { code: 'bad_confidence' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".crosswalk_mappings
       (source_control_id, target_requirement_id, relationship, confidence)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLS}`,
    [
      input.sourceControlId, input.targetRequirementId,
      input.relationship ?? 'related',
      input.confidence ?? 1.0,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteCrosswalkMapping(
  client: DbClient,
  input: { tenantSchema: string; mappingId: string },
): Promise<CrosswalkMappingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".crosswalk_mappings
      WHERE mapping_id = $1
      RETURNING ${COLS}`,
    [input.mappingId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
