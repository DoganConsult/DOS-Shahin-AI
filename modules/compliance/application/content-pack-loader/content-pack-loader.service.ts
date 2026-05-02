/**
 * Content-Pack Loader service — idempotent ingest of KSA regulatory content
 * packs (NCA-ECC, SAMA-CSF, PDPL, CITC, etc.) into a tenant's compliance
 * tables (frameworks, requirements, sectors, instrument_structure,
 * bilingual_content). Each load is journaled into
 * `<tenant_schema>.content_pack_imports` with a content hash to allow
 * re-detection of identical loads (no-op) and drift detection (mismatch).
 */
import type { DbClient } from '../../db/runner';
import { createHash } from 'node:crypto';

export type ImportStatus = 'success' | 'noop' | 'failed';

export interface ContentPackFrameworkSpec {
  code: string;
  title: string;
  regulator?: string;
  version?: string;
  sectorCode?: string;
}
export interface ContentPackRequirementSpec {
  frameworkCode: string;
  code: string;
  title: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
}
export interface ContentPackInstrumentSpec {
  instrumentCode: string;
  parentNodeCode?: string;
  nodeType: 'instrument' | 'chapter' | 'article' | 'clause';
  ordinal?: number;
  label: string;
  body?: string;
  language?: 'en' | 'ar';
}

export interface ContentPack {
  packCode: string;
  version: string;
  description?: string;
  frameworks?: ContentPackFrameworkSpec[];
  requirements?: ContentPackRequirementSpec[];
  instrument?: ContentPackInstrumentSpec[];
}

export interface ImportRow {
  importId: string;
  packCode: string;
  version: string;
  contentHash: string;
  status: ImportStatus;
  insertedFrameworks: number;
  insertedRequirements: number;
  insertedInstrumentNodes: number;
  errorMessage: string | null;
  importedAt: string;
  importedBy: string;
}

export interface LoadContentPackInput {
  tenantSchema: string;
  actorId: string;
  pack: ContentPack;
}

export interface ListImportsInput {
  tenantSchema: string;
  packCode?: string;
  status?: ImportStatus;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

export function hashPack(pack: ContentPack): string {
  const canonical = JSON.stringify({
    packCode: pack.packCode, version: pack.version,
    frameworks: pack.frameworks ?? [],
    requirements: pack.requirements ?? [],
    instrument: pack.instrument ?? [],
  });
  return createHash('sha256').update(canonical).digest('hex');
}

const COLS = `import_id, pack_code, version, content_hash, status,
              inserted_frameworks, inserted_requirements, inserted_instrument_nodes,
              error_message, imported_at, imported_by`;

const mapRow = (x: {
  import_id: string; pack_code: string; version: string; content_hash: string;
  status: string;
  inserted_frameworks: string | number; inserted_requirements: string | number;
  inserted_instrument_nodes: string | number;
  error_message: string | null; imported_at: string; imported_by: string;
}): ImportRow => ({
  importId: x.import_id, packCode: x.pack_code, version: x.version,
  contentHash: x.content_hash, status: x.status as ImportStatus,
  insertedFrameworks: Number(x.inserted_frameworks),
  insertedRequirements: Number(x.inserted_requirements),
  insertedInstrumentNodes: Number(x.inserted_instrument_nodes),
  errorMessage: x.error_message, importedAt: x.imported_at, importedBy: x.imported_by,
});

export async function listContentPackImports(
  client: DbClient,
  input: ListImportsInput,
): Promise<{ rows: ImportRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.packCode) { params.push(input.packCode); where += ` AND pack_code = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".content_pack_imports
     WHERE ${where} ORDER BY imported_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".content_pack_imports WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getContentPackImport(
  client: DbClient,
  input: { tenantSchema: string; importId: string },
): Promise<ImportRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".content_pack_imports
     WHERE import_id = $1`,
    [input.importId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function loadContentPack(
  client: DbClient,
  input: LoadContentPackInput,
): Promise<ImportRow> {
  assertSchema(input.tenantSchema);
  const { pack } = input;
  if (!pack || !pack.packCode || !pack.version) {
    throw Object.assign(new Error('packCode, version required'), { code: 'bad_input' });
  }
  const contentHash = hashPack(pack);

  // Idempotency: if same pack_code + content_hash already imported successfully,
  // record a no-op and return it.
  const existing = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".content_pack_imports
     WHERE pack_code = $1 AND content_hash = $2 AND status = 'success'
     ORDER BY imported_at DESC LIMIT 1`,
    [pack.packCode, contentHash],
  );
  if (existing.rowCount > 0) {
    const r = await client.query(
      `INSERT INTO "${input.tenantSchema}".content_pack_imports
         (pack_code, version, content_hash, status,
          inserted_frameworks, inserted_requirements, inserted_instrument_nodes,
          imported_by)
       VALUES ($1, $2, $3, 'noop', 0, 0, 0, $4)
       RETURNING ${COLS}`,
      [pack.packCode, pack.version, contentHash, input.actorId],
    );
    return mapRow(r.rows[0] as never);
  }

  let insertedFrameworks = 0;
  let insertedRequirements = 0;
  let insertedInstrumentNodes = 0;

  for (const fw of pack.frameworks ?? []) {
    const ins = await client.query<{ n: string }>(
      `INSERT INTO "${input.tenantSchema}".frameworks
         (code, title, regulator, version, sector_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO NOTHING
       RETURNING 1::text AS n`,
      [fw.code, fw.title, fw.regulator ?? null, fw.version ?? null, fw.sectorCode ?? null],
    );
    if (ins.rowCount > 0) insertedFrameworks++;
  }

  for (const rq of pack.requirements ?? []) {
    const ins = await client.query<{ n: string }>(
      `INSERT INTO "${input.tenantSchema}".requirements
         (framework_code, code, title, criticality)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (framework_code, code) DO NOTHING
       RETURNING 1::text AS n`,
      [rq.frameworkCode, rq.code, rq.title, rq.criticality ?? 'medium'],
    );
    if (ins.rowCount > 0) insertedRequirements++;
  }

  for (const node of pack.instrument ?? []) {
    const ins = await client.query<{ n: string }>(
      `INSERT INTO "${input.tenantSchema}".instrument_structure
         (instrument_code, parent_node_code, node_type, ordinal, label, body, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (instrument_code, COALESCE(parent_node_code, ''), label, language) DO NOTHING
       RETURNING 1::text AS n`,
      [
        node.instrumentCode, node.parentNodeCode ?? null, node.nodeType,
        node.ordinal ?? 0, node.label, node.body ?? null, node.language ?? 'en',
      ],
    );
    if (ins.rowCount > 0) insertedInstrumentNodes++;
  }

  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".content_pack_imports
       (pack_code, version, content_hash, status,
        inserted_frameworks, inserted_requirements, inserted_instrument_nodes,
        imported_by)
     VALUES ($1, $2, $3, 'success', $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      pack.packCode, pack.version, contentHash,
      insertedFrameworks, insertedRequirements, insertedInstrumentNodes,
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}
