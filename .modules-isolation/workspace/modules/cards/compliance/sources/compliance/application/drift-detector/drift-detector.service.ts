/**
 * Drift-Detector service — compares the current state of a tenant's
 * compliance content (frameworks + requirements) against the most recent
 * successful content-pack import baseline and snapshots the deltas as
 * `added` / `removed` / `changed` rows in `<tenant_schema>.drift_records`.
 *
 * The detector is deterministic and tenant-safe. It accepts an optional
 * baseline produced by the caller (e.g., shipped pack files) so that the
 * service can be exercised without the public KSA pack distribution.
 */
import type { DbClient } from '../../db/runner';

export type DriftEntityType = 'framework' | 'requirement';
const ENTITY_TYPES: ReadonlyArray<DriftEntityType> = ['framework', 'requirement'];

export type DriftKind = 'added' | 'removed' | 'changed';
const DRIFT_KINDS: ReadonlyArray<DriftKind> = ['added', 'removed', 'changed'];

export interface BaselineFramework {
  code: string;
  title: string;
  regulator?: string;
  version?: string;
}
export interface BaselineRequirement {
  frameworkCode: string;
  code: string;
  title: string;
  criticality?: string;
}
export interface DriftBaseline {
  packCode: string;
  packVersion: string;
  frameworks: BaselineFramework[];
  requirements: BaselineRequirement[];
}

export interface DriftRecordRow {
  driftId: string;
  packCode: string;
  packVersion: string;
  entityType: DriftEntityType;
  entityKey: string;
  driftKind: DriftKind;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  detectedAt: string;
  detectedBy: string;
}

export interface ListDriftRecordsInput {
  tenantSchema: string;
  packCode?: string;
  entityType?: DriftEntityType;
  driftKind?: DriftKind;
  limit?: number;
  offset?: number;
}

export interface RunDriftDetectionInput {
  tenantSchema: string;
  actorId: string;
  baseline: DriftBaseline;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `drift_id, pack_code, pack_version, entity_type, entity_key, drift_kind,
              before_value, after_value, detected_at, detected_by`;

const mapRow = (x: {
  drift_id: string; pack_code: string; pack_version: string;
  entity_type: string; entity_key: string; drift_kind: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  detected_at: string; detected_by: string;
}): DriftRecordRow => ({
  driftId: x.drift_id, packCode: x.pack_code, packVersion: x.pack_version,
  entityType: x.entity_type as DriftEntityType, entityKey: x.entity_key,
  driftKind: x.drift_kind as DriftKind,
  before: x.before_value, after: x.after_value,
  detectedAt: x.detected_at, detectedBy: x.detected_by,
});

export async function listDriftRecords(
  client: DbClient,
  input: ListDriftRecordsInput,
): Promise<{ rows: DriftRecordRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.packCode) { params.push(input.packCode); where += ` AND pack_code = $${params.length}`; }
  if (input.entityType) { params.push(input.entityType); where += ` AND entity_type = $${params.length}`; }
  if (input.driftKind) { params.push(input.driftKind); where += ` AND drift_kind = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".drift_records
     WHERE ${where} ORDER BY detected_at DESC, entity_type ASC, entity_key ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".drift_records WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

interface DriftDelta {
  entityType: DriftEntityType;
  entityKey: string;
  kind: DriftKind;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export function diffBaselineFrameworks(
  baseline: BaselineFramework[],
  current: BaselineFramework[],
): DriftDelta[] {
  const out: DriftDelta[] = [];
  const baseMap = new Map(baseline.map((b) => [b.code, b] as const));
  const curMap = new Map(current.map((c) => [c.code, c] as const));
  for (const [code, b] of baseMap) {
    const c = curMap.get(code);
    if (!c) {
      out.push({
        entityType: 'framework', entityKey: code, kind: 'removed',
        before: b as unknown as Record<string, unknown>, after: null,
      });
    } else if (b.title !== c.title || (b.version ?? null) !== (c.version ?? null)
            || (b.regulator ?? null) !== (c.regulator ?? null)) {
      out.push({
        entityType: 'framework', entityKey: code, kind: 'changed',
        before: b as unknown as Record<string, unknown>,
        after: c as unknown as Record<string, unknown>,
      });
    }
  }
  for (const [code, c] of curMap) {
    if (!baseMap.has(code)) {
      out.push({
        entityType: 'framework', entityKey: code, kind: 'added',
        before: null, after: c as unknown as Record<string, unknown>,
      });
    }
  }
  return out;
}

export function diffBaselineRequirements(
  baseline: BaselineRequirement[],
  current: BaselineRequirement[],
): DriftDelta[] {
  const out: DriftDelta[] = [];
  const k = (r: BaselineRequirement): string => `${r.frameworkCode}::${r.code}`;
  const baseMap = new Map(baseline.map((b) => [k(b), b] as const));
  const curMap = new Map(current.map((c) => [k(c), c] as const));
  for (const [key, b] of baseMap) {
    const c = curMap.get(key);
    if (!c) {
      out.push({
        entityType: 'requirement', entityKey: key, kind: 'removed',
        before: b as unknown as Record<string, unknown>, after: null,
      });
    } else if (b.title !== c.title || (b.criticality ?? null) !== (c.criticality ?? null)) {
      out.push({
        entityType: 'requirement', entityKey: key, kind: 'changed',
        before: b as unknown as Record<string, unknown>,
        after: c as unknown as Record<string, unknown>,
      });
    }
  }
  for (const [key, c] of curMap) {
    if (!baseMap.has(key)) {
      out.push({
        entityType: 'requirement', entityKey: key, kind: 'added',
        before: null, after: c as unknown as Record<string, unknown>,
      });
    }
  }
  return out;
}

export async function runDriftDetection(
  client: DbClient,
  input: RunDriftDetectionInput,
): Promise<{ inserted: number; deltas: DriftRecordRow[] }> {
  assertSchema(input.tenantSchema);
  if (!input.baseline || !input.baseline.packCode || !input.baseline.packVersion) {
    throw Object.assign(new Error('baseline.packCode, baseline.packVersion required'), { code: 'bad_input' });
  }

  const fwR = await client.query<BaselineFramework & { code: string; title: string }>(
    `SELECT code, title, regulator, version
       FROM "${input.tenantSchema}".frameworks`,
    [],
  );
  const reqR = await client.query<BaselineRequirement & { framework_code: string; code: string; title: string }>(
    `SELECT framework_code, code, title, criticality
       FROM "${input.tenantSchema}".requirements`,
    [],
  );
  const currentFw: BaselineFramework[] = fwR.rows.map((r) => ({
    code: r.code, title: r.title,
    regulator: (r as { regulator?: string }).regulator,
    version: (r as { version?: string }).version,
  }));
  const currentReq: BaselineRequirement[] = reqR.rows.map((r) => ({
    frameworkCode: (r as { framework_code: string }).framework_code,
    code: r.code, title: r.title,
    criticality: (r as { criticality?: string }).criticality,
  }));

  const deltas: DriftDelta[] = [
    ...diffBaselineFrameworks(input.baseline.frameworks, currentFw),
    ...diffBaselineRequirements(input.baseline.requirements, currentReq),
  ];

  const inserted: DriftRecordRow[] = [];
  for (const d of deltas) {
    if (!ENTITY_TYPES.includes(d.entityType)) continue;
    if (!DRIFT_KINDS.includes(d.kind)) continue;
    const r = await client.query(
      `INSERT INTO "${input.tenantSchema}".drift_records
         (pack_code, pack_version, entity_type, entity_key, drift_kind,
          before_value, after_value, detected_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
       RETURNING ${COLS}`,
      [
        input.baseline.packCode, input.baseline.packVersion,
        d.entityType, d.entityKey, d.kind,
        d.before === null ? null : JSON.stringify(d.before),
        d.after === null ? null : JSON.stringify(d.after),
        input.actorId,
      ],
    );
    inserted.push(mapRow(r.rows[0] as never));
  }
  return { inserted: inserted.length, deltas: inserted };
}
