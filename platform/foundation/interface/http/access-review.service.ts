import { randomUUID } from 'crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface AccessReview {
  review_id: string;
  tenant_id: string;
  campaign_name: string;
  description: string | null;
  scope: unknown;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface AccessReviewItem {
  item_id: string;
  tenant_id: string;
  review_id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  entitlement: string | null;
  decision: string | null;
  decided_by: string | null;
  decided_at: string | null;
  notes: string | null;
}

export interface CreateAccessReviewInput {
  campaign_name?: string;
  title?: string;          // FE alias accepted
  description?: string;
  scope?: unknown;
  due_date?: string;
  review_type?: 'periodic' | 'event_triggered' | 'ad_hoc';
}

export type UpdateAccessReviewInput = Partial<CreateAccessReviewInput>;

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function listReviews(tenantId: string, opts: { page?: number; pageSize?: number; status?: string } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const offset = (page - 1) * pageSize;
  const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  if (opts.status) { params.push(opts.status); conditions.push(`status = $${params.length}`); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return track('foundation.review.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const countRes = await c.query(`SELECT COUNT(*)::int AS count FROM dos.access_reviews ${where}`, params);
      const listParams = [...params, pageSize, offset];
      const listRes = await c.query(
        `SELECT * FROM dos.access_reviews ${where}
          ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      );
      return { data: listRes.rows as AccessReview[], total: countRes.rows[0]?.count ?? 0 };
    }),
  );
}

export async function getReview(tenantId: string, id: string): Promise<AccessReview | null> {
  return track('foundation.review.getById', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.access_reviews WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      return (r.rows[0] as AccessReview) ?? null;
    }),
  );
}

export async function listItems(tenantId: string, reviewId: string) {
  return track('foundation.review.items', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT ari.*, u.email, u.display_name
           FROM dos.access_review_items ari
           LEFT JOIN dos.users u ON u.user_id = ari.user_id
          WHERE ari.review_id = $1 AND ari.tenant_id = $2
          ORDER BY ari.created_at DESC`,
        [reviewId, tenantId],
      );
      return r.rows;
    }),
  );
}

export async function createReview(tenantId: string, input: CreateAccessReviewInput, actorId: string): Promise<AccessReview> {
  const id = randomUUID();
  const name = (input.campaign_name ?? input.title ?? '').trim();
  if (!name) {
    const err: any = new Error('campaign_name (or title) required');
    err.statusCode = 400; err.code = 'VALIDATION_FAILED';
    throw err;
  }
  return track('foundation.review.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.access_reviews
           (review_id, tenant_id, campaign_name, description, scope, status, created_by, due_date, review_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), 'draft', $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [id, tenantId, name, input.description ?? null,
         input.scope ? JSON.stringify(input.scope) : null,
         actorId,
         input.due_date ?? null,
         (input as any).review_type ?? 'periodic'],
      );
      return r.rows[0] as AccessReview;
    }),
  );
}

export async function updateReview(tenantId: string, id: string, input: UpdateAccessReviewInput): Promise<AccessReview | null> {
  return track('foundation.review.update', async () =>
    withTenantClient(tenantId, async (c) => {
      // Only draft campaigns are mutable.
      const cur = await c.query(
        `SELECT status FROM dos.access_reviews WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      if (cur.rows.length === 0) return null;
      if (cur.rows[0].status !== 'draft') {
        const err: any = new Error('Only draft campaigns can be modified');
        err.statusCode = 409; err.code = 'INVALID_STATE';
        throw err;
      }
      const r = await c.query(
        `UPDATE dos.access_reviews
            SET campaign_name = COALESCE($3, campaign_name),
                description   = COALESCE($4, description),
                scope         = COALESCE($5::jsonb, scope),
                due_date      = COALESCE($6, due_date),
                updated_at    = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING *`,
        [id, tenantId,
         (input.campaign_name ?? input.title) ?? null,
         input.description ?? null,
         input.scope ? JSON.stringify(input.scope) : null,
         input.due_date ?? null],
      );
      return (r.rows[0] as AccessReview) ?? null;
    }),
  );
}

export async function startReview(tenantId: string, id: string): Promise<AccessReview | null> {
  return track('foundation.review.start', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.access_reviews
            SET status = 'active', updated_at = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status = 'draft'
        RETURNING *`,
        [id, tenantId],
      );
      return (r.rows[0] as AccessReview) ?? null;
    }),
  );
}

export async function deleteReview(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.review.delete', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.access_reviews
            SET status = 'cancelled', deleted_at = NOW(), updated_at = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING review_id`,
        [id, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}

export async function decideItem(
  tenantId: string,
  reviewId: string,
  itemId: string,
  decision: 'approve' | 'revoke' | 'flag',
  comment: string | null,
  actorId: string,
): Promise<AccessReviewItem | null> {
  return track('foundation.review.decide', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.access_review_items
            SET decision = $3, decided_by = $4, decided_at = NOW(),
                notes = COALESCE($5, notes), updated_at = NOW()
          WHERE item_id = $1 AND tenant_id = $2 AND review_id = $6
        RETURNING *`,
        [itemId, tenantId, decision, actorId, comment, reviewId],
      );
      return (r.rows[0] as AccessReviewItem) ?? null;
    }),
  );
}

export async function closeReview(tenantId: string, id: string): Promise<AccessReview | null> {
  return track('foundation.review.close', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.access_reviews SET status = 'closed', closed_at = NOW(), updated_at = NOW()
          WHERE review_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'open'
        RETURNING *`,
        [id, tenantId],
      );
      return (r.rows[0] as AccessReview) ?? null;
    }),
  );
}
