import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> { await masterQuery(`SET dos.actor = 'dos-master'`); }

export async function listRecords(status?: string) {
  const r = await masterQuery(
    `SELECT id, record_key, version, title, kind, trust_zone, status,
            created_by, created_at, published_at
       FROM dos.marketplace_record
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY record_key, version DESC`,
    [status ?? null],
  );
  return r.rows;
}

export async function getRecord(recordKey: string, version?: number) {
  const r = version
    ? await masterQuery(`SELECT * FROM dos.marketplace_record WHERE record_key=$1 AND version=$2`, [recordKey, version])
    : await masterQuery(`SELECT * FROM dos.marketplace_record WHERE record_key=$1 ORDER BY version DESC LIMIT 1`, [recordKey]);
  return r.rows[0] ?? null;
}

export async function createRecord(input: { record_key: string; title: string; kind: string; trust_zone: 'public'|'tenant'|'admin'; config: unknown; created_by: string; }) {
  await actor();
  const v = await masterQuery(
    `SELECT COALESCE(MAX(version),0)::int + 1 AS next FROM dos.marketplace_record WHERE record_key=$1`,
    [input.record_key],
  );
  const next = (v.rows[0] as { next: number }).next;
  const r = await masterQuery(
    `INSERT INTO dos.marketplace_record (record_key, version, title, kind, trust_zone, status, config, created_by)
     VALUES ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7) RETURNING *`,
    [input.record_key, next, input.title, input.kind, input.trust_zone, JSON.stringify(input.config ?? {}), input.created_by],
  );
  return r.rows[0];
}

export async function publishRecord(recordKey: string, version: number) {
  await actor();
  const r = await masterQuery(
    `UPDATE dos.marketplace_record SET status='published', published_at=now()
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
       FROM dos.marketplace_event e
       LEFT JOIN dos.marketplace_record d ON d.id = e.record_id
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
    `INSERT INTO dos.marketplace_event (record_id, record_key, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,$3,$4::jsonb,$5) RETURNING *`,
    [rec ? (rec as { id: string }).id : null, input.record_key, input.kind,
     JSON.stringify(input.payload ?? {}), input.emitted_by],
  );
  return r.rows[0];
}

// ── Phase 3 / L30 — marketplace domain logic: deterministic record evaluator.
// Mirrors the feature-flag-os reference (L28). Decision is derived from
// (kind, config, ctx) and an audit ledger row is emitted.
export interface RecordEvalCtx { tenant_id?: string; user_id?: string; cohort?: string }
export interface RecordEvalResult { record_key: string; version: number; kind: string; decision: 'on'|'off'; reason: string; evaluated_at: string }

function _hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export async function evaluateRecord(recordKey: string, ctx: RecordEvalCtx): Promise<RecordEvalResult> {
  await actor();
  const r = await masterQuery(
    `SELECT record_key, version, kind, status, config
       FROM dos.marketplace_record
      WHERE record_key=$1 AND status='published'
      ORDER BY version DESC LIMIT 1`,
    [recordKey],
  );
  if (!r.rows.length) throw new Error('record_not_published');
  const row = r.rows[0] as { record_key: string; version: number; kind: string; config: Record<string, unknown> };
  const cfg = row.config ?? {};
  let decision: 'on'|'off' = 'on';
  let reason = `${row.kind}:default_on`;
  // Universal disable switches honoured across every OS.
  if (cfg.disabled === true)        { decision = 'off'; reason = `${row.kind}:disabled`; }
  else if (cfg.killed === true)     { decision = 'off'; reason = `${row.kind}:killed`; }
  else if (cfg.enabled === false)   { decision = 'off'; reason = `${row.kind}:enabled=false`; }
  else if (typeof cfg.percentage === 'number') {
    const pct = Math.max(0, Math.min(100, Number(cfg.percentage)));
    const seed = `${recordKey}|${ctx.tenant_id ?? ''}|${ctx.user_id ?? ''}`;
    const bucket = _hash32(seed) % 100;
    decision = bucket < pct ? 'on' : 'off';
    reason = `${row.kind}:percentage=${pct},bucket=${bucket}`;
  } else if (Array.isArray(cfg.cohorts)) {
    const cohorts = cfg.cohorts as string[];
    decision = cohorts.includes(ctx.cohort ?? '') ? 'on' : 'off';
    reason = `${row.kind}:cohort=${ctx.cohort ?? '∅'}`;
  }
  const evaluatedAt = new Date().toISOString();
  // Audit ledger row via the same emitEvent path so writer-actor + triggers fire.
  const rec = await getRecord(recordKey);
  await masterQuery(
    `INSERT INTO dos.marketplace_event (record_id, record_key, kind, payload, emitted_by)
     VALUES ($1::uuid,$2,$3,$4::jsonb,$5)`,
    [rec ? (rec as { id: string }).id : null, recordKey, 'marketplace_evaluated',
     JSON.stringify({ ctx, decision, reason, version: row.version }), 'marketplace-os-service'],
  );
  return { record_key: row.record_key, version: row.version, kind: row.kind, decision, reason, evaluated_at: evaluatedAt };
}
