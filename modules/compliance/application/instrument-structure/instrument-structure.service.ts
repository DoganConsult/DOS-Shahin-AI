/**
 * Instrument-Structure service — legal text hierarchy
 * (instrument → chapter → article → clause) over
 * `<tenant_schema>.instrument_structure`. Powers PDPL/ECC clause-level
 * mapping where requirements/controls cite a single clause node.
 */
import type { DbClient } from '../../db/runner';

export type InstrumentNodeType = 'instrument' | 'chapter' | 'article' | 'clause';
const NODE_TYPES: ReadonlyArray<InstrumentNodeType> = [
  'instrument', 'chapter', 'article', 'clause',
];

export interface InstrumentNodeRow {
  nodeId: string;
  instrumentCode: string;
  nodeType: InstrumentNodeType;
  parentNodeId: string | null;
  label: string;
  ordinal: number;
  body: string | null;
  language: string;
  createdAt: string;
}

export interface ListInstrumentNodesInput {
  tenantSchema: string;
  instrumentCode?: string;
  nodeType?: InstrumentNodeType;
  parentNodeId?: string;
  language?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateInstrumentNodeInput {
  tenantSchema: string;
  actorId: string;
  instrumentCode: string;
  nodeType: InstrumentNodeType;
  parentNodeId?: string;
  label: string;
  ordinal?: number;
  body?: string;
  language?: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `node_id, instrument_code, node_type, parent_node_id,
              label, ordinal, body, language, created_at`;

const mapRow = (x: {
  node_id: string; instrument_code: string; node_type: string;
  parent_node_id: string | null; label: string; ordinal: string | number;
  body: string | null; language: string; created_at: string;
}): InstrumentNodeRow => ({
  nodeId: x.node_id, instrumentCode: x.instrument_code,
  nodeType: x.node_type as InstrumentNodeType,
  parentNodeId: x.parent_node_id, label: x.label,
  ordinal: Number(x.ordinal), body: x.body, language: x.language,
  createdAt: x.created_at,
});

export async function listInstrumentNodes(
  client: DbClient,
  input: ListInstrumentNodesInput,
): Promise<{ rows: InstrumentNodeRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 1000);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.instrumentCode) { params.push(input.instrumentCode); where += ` AND instrument_code = $${params.length}`; }
  if (input.nodeType) { params.push(input.nodeType); where += ` AND node_type = $${params.length}`; }
  if (input.parentNodeId) { params.push(input.parentNodeId); where += ` AND parent_node_id = $${params.length}`; }
  if (input.language) { params.push(input.language); where += ` AND language = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND label ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".instrument_structure
     WHERE ${where} ORDER BY instrument_code ASC, ordinal ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".instrument_structure WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getInstrumentNode(
  client: DbClient,
  input: { tenantSchema: string; nodeId: string },
): Promise<InstrumentNodeRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".instrument_structure
     WHERE node_id = $1`,
    [input.nodeId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createInstrumentNode(
  client: DbClient,
  input: CreateInstrumentNodeInput,
): Promise<InstrumentNodeRow> {
  assertSchema(input.tenantSchema);
  if (!input.instrumentCode || !input.label) {
    throw Object.assign(new Error('instrumentCode, label required'), { code: 'bad_input' });
  }
  if (!NODE_TYPES.includes(input.nodeType)) {
    throw Object.assign(new Error(`bad node_type: ${input.nodeType}`), { code: 'bad_node_type' });
  }
  if (input.nodeType === 'instrument' && input.parentNodeId) {
    throw Object.assign(new Error('instrument node must have no parent'), { code: 'bad_parent' });
  }
  if (input.nodeType !== 'instrument' && !input.parentNodeId) {
    throw Object.assign(new Error(`${input.nodeType} requires parent_node_id`), { code: 'bad_parent' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".instrument_structure
       (instrument_code, node_type, parent_node_id, label, ordinal, body, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.instrumentCode, input.nodeType,
      input.parentNodeId ?? null, input.label,
      input.ordinal ?? 0, input.body ?? null,
      input.language ?? 'en',
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteInstrumentNode(
  client: DbClient,
  input: { tenantSchema: string; nodeId: string },
): Promise<InstrumentNodeRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".instrument_structure
      WHERE node_id = $1
      RETURNING ${COLS}`,
    [input.nodeId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
