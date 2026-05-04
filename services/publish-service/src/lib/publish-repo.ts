import { masterQuery } from '@dos/db/master';

const ALLOWED_KINDS = new Set(['page', 'component', 'route', 'brand-kit', 'nav', 'archetype-props']);

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export async function ensureTarget(targetKind: string, targetKey: string, displayName: string, ownerTeam?: string | null): Promise<void> {
  await actor();
  await masterQuery(
    `INSERT INTO dos.publish_target (target_kind, target_key, display_name, owner_team)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (target_kind, target_key) DO UPDATE SET display_name=EXCLUDED.display_name, owner_team=EXCLUDED.owner_team`,
    [targetKind, targetKey, displayName, ownerTeam ?? null],
  );
}

export interface CreateRevisionInput {
  target_kind: string;
  target_key: string;
  payload: Record<string, unknown>;
  created_by: string;
  change_request_id?: string | null;
}

export interface PublishRevisionRow {
  id: string;
  revision_no: number;
  status: string;
}

export async function createRevision(input: CreateRevisionInput): Promise<PublishRevisionRow> {
  if (!ALLOWED_KINDS.has(input.target_kind)) {
    throw new Error(`unknown target_kind: ${input.target_kind}`);
  }
  await actor();
  const next = await masterQuery(
    `SELECT COALESCE(MAX(revision_no),0)+1 AS n FROM dos.publish_revision WHERE target_kind=$1 AND target_key=$2`,
    [input.target_kind, input.target_key],
  );
  const revisionNo = Number((next.rows[0] as { n: number }).n);
  const r = await masterQuery(
    `INSERT INTO dos.publish_revision (target_kind, target_key, revision_no, payload, created_by, change_request_id, status)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6::uuid,'draft')
     RETURNING id, revision_no, status`,
    [input.target_kind, input.target_key, revisionNo, JSON.stringify(input.payload), input.created_by, input.change_request_id ?? null],
  );
  return r.rows[0] as unknown as PublishRevisionRow;
}

export async function publishRevision(revisionId: string): Promise<{ id: string; status: string; superseded: number }> {
  await actor();
  const cur = await masterQuery(
    `SELECT id, target_kind, target_key, status FROM dos.publish_revision WHERE id=$1::uuid`,
    [revisionId],
  );
  if (!cur.rows.length) throw new Error('revision_not_found');
  const row = cur.rows[0] as unknown as { id: string; target_kind: string; target_key: string; status: string };
  if (row.status === 'live') return { id: row.id, status: 'live', superseded: 0 };
  if (row.status === 'rolled_back' || row.status === 'superseded') {
    throw new Error(`cannot publish revision in status=${row.status}`);
  }
  // Atomic: supersede prior live, mark this live.
  const sup = await masterQuery(
    `UPDATE dos.publish_revision
        SET status='superseded'
      WHERE target_kind=$1 AND target_key=$2 AND status='live' AND id<>$3::uuid`,
    [row.target_kind, row.target_key, revisionId],
  );
  await masterQuery(
    `UPDATE dos.publish_revision SET status='live' WHERE id=$1::uuid`,
    [revisionId],
  );
  // Fan out invalidation so workspace-bff/marketing-shell pick up new content.
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
     VALUES ('global', $1, $2, 'v1', 0)`,
    [`${row.target_kind}:${row.target_key}`, `publish_revision:${revisionId}`],
  );
  return { id: revisionId, status: 'live', superseded: sup.rowCount ?? 0 };
}

export async function rollbackRevision(revisionId: string, rolledBackBy: string, reason: string): Promise<{ id: string; status: string }> {
  await actor();
  const cur = await masterQuery(
    `SELECT id, target_kind, target_key, status FROM dos.publish_revision WHERE id=$1::uuid`,
    [revisionId],
  );
  if (!cur.rows.length) throw new Error('revision_not_found');
  const row = cur.rows[0] as unknown as { id: string; target_kind: string; target_key: string; status: string };
  if (row.status !== 'live') throw new Error(`cannot rollback revision in status=${row.status}`);
  await masterQuery(
    `INSERT INTO dos.publish_rollback (revision_id, rolled_back_by, reason) VALUES ($1::uuid, $2, $3)`,
    [revisionId, rolledBackBy, reason],
  );
  await masterQuery(
    `UPDATE dos.publish_revision SET status='rolled_back' WHERE id=$1::uuid`,
    [revisionId],
  );
  // Restore the most recent superseded revision for the same target, if any.
  await masterQuery(
    `UPDATE dos.publish_revision SET status='live'
      WHERE id = (
        SELECT id FROM dos.publish_revision
         WHERE target_kind=$1 AND target_key=$2 AND status='superseded'
         ORDER BY revision_no DESC LIMIT 1
      )`,
    [row.target_kind, row.target_key],
  );
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
     VALUES ('global', $1, $2, 'v1', 0)`,
    [`${row.target_kind}:${row.target_key}`, `publish_rollback:${revisionId}`],
  );
  return { id: revisionId, status: 'rolled_back' };
}

export async function listRevisions(targetKind?: string, targetKey?: string) {
  const r = targetKind && targetKey
    ? await masterQuery(
        `SELECT id, target_kind, target_key, revision_no, status, created_at, created_by
           FROM dos.publish_revision
          WHERE target_kind=$1 AND target_key=$2
          ORDER BY revision_no DESC LIMIT 100`,
        [targetKind, targetKey],
      )
    : await masterQuery(
        `SELECT id, target_kind, target_key, revision_no, status, created_at, created_by
           FROM dos.publish_revision
          ORDER BY created_at DESC LIMIT 100`,
      );
  return r.rows;
}
