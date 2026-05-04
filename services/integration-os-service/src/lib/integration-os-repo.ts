import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> { await masterQuery(`SET dos.actor = 'dos-master'`); }

export async function listRecords(status?: string) {
  const r = await masterQuery(
    `SELECT id, record_key, version, title, kind, trust_zone, status,
            created_by, created_at, published_at
       FROM dos.integration_record
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY record_key, version DESC`,
    [status ?? null],
  );
  return r.rows;
}

export async function getRecord(recordKey: string, version?: number) {
  const r = version
    ? await masterQuery(`SELECT * FROM dos.integration_record WHERE record_key=$1 AND version=$2`, [recordKey, version])
    : await masterQuery(`SELECT * FROM dos.integration_record WHERE record_key=$1 ORDER BY version DESC LIMIT 1`, [recordKey]);
  return r.rows[0] ?? null;
}

export async function createRecord(input: { record_key: string; title: string; kind: string; trust_zone: 'public'|'tenant'|'admin'; config: unknown; created_by: string; }) {
  await actor();
  const v = await masterQuery(
    `SELECT COALESCE(MAX(version),0)::int + 1 AS next FROM dos.integration_record WHERE record_key=$1`,
    [input.record_key],
  );
  const next = (v.rows[0] as { next: number }).next;
  const r = await masterQuery(
    `INSERT INTO dos.integration_record (record_key, version, title, kind, trust_zone, status, config, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7) RETURNING *`,
    [input.record_key, next, input.title, input.kind, input.trust_zone, JSON.stringify(input.config ?? {}), input.created_by],
  );
  return r.rows[0];
}

export async function publishRecord(recordKey: string, version: number) {
  await actor();
  const r = await masterQuery(
    `UPDATE dos.integration_record SET status='published', published_at=now()
      WHERE record_key=$1 AND version=$2 AND status='draft' RETURNING *`,
    [recordKey, version],
  );
  if (!r.rows.length) throw new Error('not_found_or_not_draft');
  return r.rows[0];
}

export async function listEvents(recordKey?: string, limit = 100) {
  const r = await masterQuery(
    `SELECT e.id, e.record_id, COALESCE(e.record_key, d.record_key) AS record_key,
            e.kind, e.payload, e.emitted_by, e.emitted_at
       FROM dos.integration_event e
       LEFT JOIN dos.integration_record d ON d.id = e.record_id
      WHERE ($1::text IS NULL OR COALESCE(e.record_key, d.record_key) = $1)
      ORDER BY e.emitted_at DESC LIMIT $2`,
    [recordKey ?? null, Math.min(500, limit)],
  );
  return r.rows;
}

export async function emitEvent(input: { record_key: string; kind: string; payload?: Record<string, unknown>; emitted_by: string; }) {
  await actor();
  const rec = await getRecord(input.record_key);
  const r = await masterQuery(
    `INSERT INTO dos.integration_event (record_id, record_key, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,$3,$4::jsonb,$5) RETURNING *`,
    [rec ? (rec as { id: string }).id : null, input.record_key, input.kind,
     JSON.stringify(input.payload ?? {}), input.emitted_by],
  );
  return r.rows[0];
}
