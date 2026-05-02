/**
 * Compliance-Universe service — denormalized projection of every compliance
 * entity (framework, control, obligation, requirement, sector, instrument,
 * gap, finding, regulator) into a single browseable graph over
 * `<tenant_schema>.compliance_universe_nodes`. Powers global cross-entity
 * search, breadcrumbs, and unified what-if exploration.
 */
import type { DbClient } from '../../db/runner';

export type UniverseNodeType =
  | 'framework' | 'control' | 'obligation' | 'requirement'
  | 'sector' | 'instrument' | 'gap' | 'finding'
  | 'regulator' | 'workspace' | 'entity';
const NODE_TYPES: ReadonlyArray<UniverseNodeType> = [
  'framework', 'control', 'obligation', 'requirement',
  'sector', 'instrument', 'gap', 'finding',
  'regulator', 'workspace', 'entity',
];

export type UniverseNodeStatus = 'active' | 'deprecated';
const STATUSES: ReadonlyArray<UniverseNodeStatus> = ['active', 'deprecated'];

export interface UniverseNodeRow {
  nodeId: string;
  nodeType: UniverseNodeType;
  nodeCode: string;
  label: string;
  parentNodeId: string | null;
  attributes: Record<string, unknown>;
  status: UniverseNodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListUniverseNodesInput {
  tenantSchema: string;
  nodeType?: UniverseNodeType;
  parentNodeId?: string;
  status?: UniverseNodeStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateUniverseNodeInput {
  tenantSchema: string;
  actorId: string;
  nodeType: UniverseNodeType;
  nodeCode: string;
  label: string;
  parentNodeId?: string;
  attributes?: Record<string, unknown>;
  status?: UniverseNodeStatus;
}

export interface UpdateUniverseNodeStatusInput {
  tenantSchema: string;
  actorId: string;
  nodeId: string;
  status: UniverseNodeStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `node_id, node_type, node_code, label, parent_node_id,
              attributes, status, created_at, updated_at`;

const mapRow = (x: {
  node_id: string; node_type: string; node_code: string; label: string;
  parent_node_id: string | null; attributes: Record<string, unknown> | null;
  status: string; created_at: string; updated_at: string;
}): UniverseNodeRow => ({
  nodeId: x.node_id, nodeType: x.node_type as UniverseNodeType,
  nodeCode: x.node_code, label: x.label,
  parentNodeId: x.parent_node_id,
  attributes: x.attributes ?? {},
  status: x.status as UniverseNodeStatus,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listUniverseNodes(
  client: DbClient,
  input: ListUniverseNodesInput,
): Promise<{ rows: UniverseNodeRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.nodeType) { params.push(input.nodeType); where += ` AND node_type = $${params.length}`; }
  if (input.parentNodeId) { params.push(input.parentNodeId); where += ` AND parent_node_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND (label ILIKE $${params.length} OR node_code ILIKE $${params.length})`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_universe_nodes
     WHERE ${where} ORDER BY node_type ASC, label ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_universe_nodes WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getUniverseNode(
  client: DbClient,
  input: { tenantSchema: string; nodeId: string },
): Promise<UniverseNodeRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_universe_nodes
     WHERE node_id = $1`,
    [input.nodeId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createUniverseNode(
  client: DbClient,
  input: CreateUniverseNodeInput,
): Promise<UniverseNodeRow> {
  assertSchema(input.tenantSchema);
  if (!input.nodeType || !input.nodeCode || !input.label) {
    throw Object.assign(
      new Error('nodeType, nodeCode, label required'), { code: 'bad_input' },
    );
  }
  if (!NODE_TYPES.includes(input.nodeType)) {
    throw Object.assign(new Error(`bad nodeType: ${input.nodeType}`), { code: 'bad_node_type' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_universe_nodes
       (node_type, node_code, label, parent_node_id, attributes, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING ${COLS}`,
    [
      input.nodeType, input.nodeCode, input.label,
      input.parentNodeId ?? null,
      JSON.stringify(input.attributes ?? {}),
      input.status ?? 'active',
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateUniverseNodeStatus(
  client: DbClient,
  input: UpdateUniverseNodeStatusInput,
): Promise<UniverseNodeRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_universe_nodes
        SET status = $2, updated_at = NOW()
      WHERE node_id = $1
      RETURNING ${COLS}`,
    [input.nodeId, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteUniverseNode(
  client: DbClient,
  input: { tenantSchema: string; nodeId: string },
): Promise<UniverseNodeRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".compliance_universe_nodes
      WHERE node_id = $1
      RETURNING ${COLS}`,
    [input.nodeId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
