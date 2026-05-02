import type { DbPool } from '../db.js';

export interface Draft {
  id: string;
  draft_key: string;
  target_type: string;
  target_key: string;
  status: string;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  created_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftCreate {
  draft_key: string;
  target_type: string;
  target_key: string;
  payload?: Record<string, unknown>;
}

export interface DraftPatch {
  payload?: Record<string, unknown>;
  status?: string;
}

export interface PublishedVersion {
  id: string;
  target_type: string;
  target_key: string;
  version_number: number;
  draft_id: string | null;
  payload: Record<string, unknown>;
  published_by: string | null;
  published_at: string;
  is_current: boolean;
}

export class UiOsAdminManager {
  constructor(private readonly pool: DbPool) {}

  async listDrafts(tenantId: string, targetType?: string | null): Promise<Draft[]> {
    const { rows } = await this.pool.query<Draft>(
      `SELECT id::text AS id, draft_key, target_type, target_key, status,
              payload, validation, created_by, submitted_by,
              submitted_at::text AS submitted_at,
              created_at::text AS created_at,
              updated_at::text AS updated_at
         FROM dos.ui_draft_versions
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR target_type = $2)
        ORDER BY updated_at DESC
        LIMIT 200`,
      [tenantId, targetType ?? null],
    );
    return rows;
  }

  async createDraft(tenantId: string, userId: string, body: DraftCreate): Promise<Draft> {
    const { rows } = await this.pool.query<Draft>(
      `INSERT INTO dos.ui_draft_versions
        (tenant_id, draft_key, target_type, target_key, status, payload, created_by)
       VALUES ($1,$2,$3,$4,'draft',$5::jsonb,$6)
       RETURNING id::text AS id, draft_key, target_type, target_key, status,
                 payload, validation, created_by, submitted_by,
                 submitted_at::text AS submitted_at,
                 created_at::text AS created_at,
                 updated_at::text AS updated_at`,
      [tenantId, body.draft_key, body.target_type, body.target_key,
       JSON.stringify(body.payload ?? {}), userId],
    );
    await this.log(tenantId, userId, 'draft.create', body.target_type, body.target_key, { draft_key: body.draft_key });
    return rows[0];
  }

  async updateDraft(tenantId: string, draftId: string, patch: DraftPatch): Promise<Draft | null> {
    const { rows } = await this.pool.query<Draft>(
      `UPDATE dos.ui_draft_versions
          SET payload = COALESCE($3::jsonb, payload),
              status  = COALESCE($4, status),
              updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING id::text AS id, draft_key, target_type, target_key, status,
                  payload, validation, created_by, submitted_by,
                  submitted_at::text AS submitted_at,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at`,
      [tenantId, draftId,
       patch.payload !== undefined ? JSON.stringify(patch.payload) : null,
       patch.status ?? null],
    );
    return rows[0] ?? null;
  }

  async validateDraft(tenantId: string, draftId: string): Promise<{ ok: boolean; errors: string[] } | null> {
    const { rows } = await this.pool.query<{ payload: Record<string, unknown>; target_type: string }>(
      `SELECT payload, target_type FROM dos.ui_draft_versions
        WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
      [tenantId, draftId],
    );
    if (rows.length === 0) return null;
    const errors: string[] = [];
    const p = rows[0].payload ?? {};
    if (typeof p !== 'object') errors.push('payload must be an object');
    const result = { ok: errors.length === 0, errors };
    await this.pool.query(
      `UPDATE dos.ui_draft_versions
          SET validation = $3::jsonb, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid`,
      [tenantId, draftId, JSON.stringify(result)],
    );
    return result;
  }

  async submitDraft(tenantId: string, userId: string, draftId: string): Promise<Draft | null> {
    const { rows } = await this.pool.query<Draft>(
      `UPDATE dos.ui_draft_versions
          SET status = 'submitted', submitted_by = $3, submitted_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status IN ('draft','rejected')
        RETURNING id::text AS id, draft_key, target_type, target_key, status,
                  payload, validation, created_by, submitted_by,
                  submitted_at::text AS submitted_at,
                  created_at::text AS created_at,
                  updated_at::text AS updated_at`,
      [tenantId, draftId, userId],
    );
    if (!rows[0]) return null;
    await this.log(tenantId, userId, 'draft.submit', rows[0].target_type, rows[0].target_key, { draft_id: draftId });
    return rows[0];
  }

  async publish(tenantId: string, userId: string, draftId: string): Promise<PublishedVersion | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const dr = await client.query<{ target_type: string; target_key: string; payload: Record<string, unknown> }>(
        `SELECT target_type, target_key, payload FROM dos.ui_draft_versions
          WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, draftId],
      );
      if (dr.rows.length === 0) { await client.query('ROLLBACK'); return null; }
      const d = dr.rows[0];
      const next = await client.query<{ n: number }>(
        `SELECT COALESCE(MAX(version_number),0)+1 AS n
           FROM dos.ui_published_versions
          WHERE tenant_id = $1 AND target_type = $2 AND target_key = $3`,
        [tenantId, d.target_type, d.target_key],
      );
      await client.query(
        `UPDATE dos.ui_published_versions SET is_current = FALSE
          WHERE tenant_id = $1 AND target_type = $2 AND target_key = $3`,
        [tenantId, d.target_type, d.target_key],
      );
      const ins = await client.query<PublishedVersion>(
        `INSERT INTO dos.ui_published_versions
          (tenant_id, target_type, target_key, version_number, draft_id, payload, published_by, is_current)
         VALUES ($1,$2,$3,$4,$5::uuid,$6::jsonb,$7,TRUE)
         RETURNING id::text AS id, target_type, target_key, version_number,
                   draft_id::text AS draft_id, payload,
                   published_by, published_at::text AS published_at, is_current`,
        [tenantId, d.target_type, d.target_key, next.rows[0].n, draftId,
         JSON.stringify(d.payload ?? {}), userId],
      );
      await client.query(
        `UPDATE dos.ui_draft_versions SET status='published', updated_at=NOW()
          WHERE tenant_id=$1 AND id=$2::uuid`,
        [tenantId, draftId],
      );
      await client.query('COMMIT');
      await this.log(tenantId, userId, 'draft.publish', d.target_type, d.target_key,
        { draft_id: draftId, version: next.rows[0].n });
      return ins.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async rollback(tenantId: string, userId: string, versionId: string, reason?: string): Promise<PublishedVersion | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const target = await client.query<{ target_type: string; target_key: string }>(
        `SELECT target_type, target_key FROM dos.ui_published_versions
          WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, versionId],
      );
      if (target.rows.length === 0) { await client.query('ROLLBACK'); return null; }
      const t = target.rows[0];
      const cur = await client.query<{ id: string }>(
        `SELECT id::text AS id FROM dos.ui_published_versions
          WHERE tenant_id = $1 AND target_type = $2 AND target_key = $3 AND is_current = TRUE
          LIMIT 1`,
        [tenantId, t.target_type, t.target_key],
      );
      await client.query(
        `UPDATE dos.ui_published_versions SET is_current = FALSE
          WHERE tenant_id = $1 AND target_type = $2 AND target_key = $3`,
        [tenantId, t.target_type, t.target_key],
      );
      const restored = await client.query<PublishedVersion>(
        `UPDATE dos.ui_published_versions SET is_current = TRUE
          WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING id::text AS id, target_type, target_key, version_number,
                  draft_id::text AS draft_id, payload,
                  published_by, published_at::text AS published_at, is_current`,
        [tenantId, versionId],
      );
      if (cur.rows[0]) {
        await client.query(
          `INSERT INTO dos.ui_rollback_points
            (tenant_id, version_id, rolled_back_to, rolled_back_by, reason)
           VALUES ($1,$2::uuid,$3::uuid,$4,$5)`,
          [tenantId, cur.rows[0].id, versionId, userId, reason ?? null],
        );
      }
      await client.query('COMMIT');
      await this.log(tenantId, userId, 'version.rollback', t.target_type, t.target_key,
        { version_id: versionId, from: cur.rows[0]?.id ?? null, reason: reason ?? null });
      return restored.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async log(tenantId: string, actor: string, action: string,
                    targetType: string | null, targetKey: string | null,
                    payload: Record<string, unknown>): Promise<void> {
    await this.pool.query(
      `INSERT INTO dos.ui_admin_activity_log
        (tenant_id, actor, action, target_type, target_key, payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [tenantId, actor, action, targetType, targetKey, JSON.stringify(payload)],
    );
  }
}
