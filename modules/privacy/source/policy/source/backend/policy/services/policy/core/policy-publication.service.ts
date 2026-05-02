/**
 * Policy Publication Service
 *
 * Manages policy publication campaigns: creating publications with
 * audience targeting, tracking delivery records, sending reminders,
 * and recalling publications. Supports multiple publish channels
 * (email, portal, push, etc.) with per-user delivery tracking.
 */

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { emitEvent } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PublicationAudience {
  audienceType: string;
  audienceRef: string;
  audienceName: string;
  userCount?: number;
}

export interface CreatePublicationData {
  policyId: string;
  policyVersionId?: string;
  campaignName: string;
  publishedBy: string;
  publishChannel: string;
  audiences: PublicationAudience[];
  message?: string;
  scheduledAt?: string;
}

export interface PublicationFilters {
  policyId?: string;
  status?: string;
  channel?: string;
}

export interface PublicationStatusResult {
  publication: Record<string, unknown>;
  delivery: {
    total: number;
    delivered: number;
    viewed: number;
    acknowledged: number;
    declined: number;
    pending: number;
    completionRate: number;
  };
}

// ── Functions ────────────────────────────────────────────────────────────────

/**
 * Create a new policy publication with audience records.
 * Inserts into policy_publications and policy_publication_audiences,
 * then emits a GRC event for downstream automation.
 */
export async function createPublication(
  tenantId: string,
  data: CreatePublicationData,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const publicationId = uuid();
  const status = data.scheduledAt ? 'scheduled' : 'active';

  const res = await safeQuery(
    `INSERT INTO "${schema}".policy_publications
     (publication_id, policy_id, policy_version_id, campaign_name,
      published_by, publish_channel, message, status,
      scheduled_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      publicationId,
      data.policyId,
      data.policyVersionId ?? null,
      data.campaignName,
      data.publishedBy,
      data.publishChannel,
      data.message ?? null,
      status,
      data.scheduledAt ?? null,
    ],
  );

  const row = getFirstRow(res)!;

  // Insert audience records
  for (const audience of data.audiences) {
    await safeQuery(
      `INSERT INTO "${schema}".policy_publication_audiences
       (audience_id, publication_id, audience_type, audience_ref,
        audience_name, user_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        uuid(),
        publicationId,
        audience.audienceType,
        audience.audienceRef,
        audience.audienceName,
        audience.userCount ?? 0,
      ],
    );
  }

  await emitEvent(({
      tenantId,
      userId: data.publishedBy,
      module: 'policies',
      event: 'created',
      entityType: 'policy_publication',
      entityId: publicationId,
      data: {
        policyId: data.policyId,
        channel: data.publishChannel,
        audienceCount: data.audiences.length,
      },
    } as any));

  return row!;
}

/**
 * List policy publications with optional filters.
 * Includes aggregated audience count per publication.
 */
export async function listPublications(
  tenantId: string,
  filters?: PublicationFilters,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['1 = 1'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.policyId) {
    conditions.push(`pp.policy_id = $${idx++}`);
    params.push(filters.policyId);
  }
  if (filters?.status) {
    conditions.push(`pp.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.channel) {
    conditions.push(`pp.publish_channel = $${idx++}`);
    params.push(filters.channel);
  }

  const res = await safeQuery(
    `SELECT pp.*,
            COALESCE(aud.audience_count, 0)::int AS audience_count,
            COALESCE(aud.total_user_count, 0)::int AS total_user_count
     FROM "${schema}".policy_publications pp
     LEFT JOIN (
       SELECT publication_id,
              COUNT(*)::int AS audience_count,
              SUM(COALESCE(user_count, 0))::int AS total_user_count
       FROM "${schema}".policy_publication_audiences
       GROUP BY publication_id
     ) aud ON aud.publication_id = pp.publication_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY pp.created_at DESC`,
    params,
  );

  return res.rows;
}

/**
 * Get detailed publication status with delivery record aggregates.
 * Returns publication metadata plus delivery counts and completion rate.
 */
export async function getPublicationStatus(
  tenantId: string,
  publicationId: string,
): Promise<PublicationStatusResult | null> {
  const schema = tenantSchema(tenantId);

  const pubRes = await safeQuery(
    `SELECT * FROM "${schema}".policy_publications
     WHERE publication_id = $1`,
    [publicationId],
  );

  const publication = getFirstRow(pubRes)!;
  if (!publication) return null;

  // Aggregate delivery record statuses
  const deliveryRes = await safeQuery(
    `SELECT status, COUNT(*)::int AS cnt
     FROM "${schema}".policy_delivery_records
     WHERE publication_id = $1
     GROUP BY status`,
    [publicationId],
  );

  const counts: Record<string, number> = {};
  for (const r of deliveryRes.rows) {
    counts[r.status as string] = r.cnt as number;
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  const acknowledged = counts['acknowledged'] ?? 0;
  const completionRate = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

  return {
    publication,
    delivery: {
      total,
      delivered: counts['delivered'] ?? 0,
      viewed: counts['viewed'] ?? 0,
      acknowledged,
      declined: counts['declined'] ?? 0,
      pending: counts['pending'] ?? 0,
      completionRate,
    },
  };
}

/**
 * Bulk-create delivery records for a publication.
 * Each user receives one delivery record with status 'pending'.
 */
export async function createDeliveryRecords(
  tenantId: string,
  publicationId: string,
  userIds: string[],
): Promise<{ insertedCount: number }> {
  const schema = tenantSchema(tenantId);
  let insertedCount = 0;

  for (const userId of userIds) {
    const deliveryId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".policy_delivery_records
       (delivery_id, publication_id, user_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [deliveryId, publicationId, userId],
    );
    insertedCount++;
  }

  return { insertedCount };
}

/**
 * Update the delivery status of a single delivery record.
 * Tracks status transitions with appropriate timestamps.
 */
export async function updateDeliveryStatus(
  tenantId: string,
  deliveryId: string,
  status: string,
  data?: { declinedReason?: string },
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_delivery_records
     SET status = $2,
         delivered_at = CASE WHEN $2 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
         viewed_at = CASE WHEN $2 = 'viewed' AND viewed_at IS NULL THEN NOW() ELSE viewed_at END,
         acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
         declined_at = CASE WHEN $2 = 'declined' THEN NOW() ELSE declined_at END,
         declined_reason = CASE WHEN $2 = 'declined' THEN $3 ELSE declined_reason END,
         updated_at = NOW()
     WHERE delivery_id = $1
     RETURNING *`,
    [deliveryId, status, data?.declinedReason ?? null],
  );

  return getFirstRow(res);
}

/**
 * Send reminders for overdue (pending/delivered but not acknowledged) delivery records.
 * Increments reminder_count and updates last_reminded_at.
 */
export async function sendPublicationReminders(
  tenantId: string,
  publicationId: string,
): Promise<{ remindedCount: number }> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_delivery_records
     SET reminder_count = COALESCE(reminder_count, 0) + 1,
         last_reminded_at = NOW(),
         updated_at = NOW()
     WHERE publication_id = $1
       AND status IN ('pending', 'delivered', 'viewed')
     RETURNING delivery_id`,
    [publicationId],
  );

  return { remindedCount: res.rows.length };
}

/**
 * Recall a publication, preventing further delivery and acknowledgment.
 * Sets status to 'recalled' with recall metadata.
 */
export async function recallPublication(
  tenantId: string,
  publicationId: string,
  userId: string,
  reason: string,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".policy_publications
     SET status = 'recalled',
         recalled_at = NOW(),
         recalled_by = $2,
         recall_reason = $3,
         updated_at = NOW()
     WHERE publication_id = $1 AND status NOT IN ('recalled')
     RETURNING *`,
    [publicationId, userId, reason],
  );

  const row = getFirstRow(res)!;
  if (!row) return null;

  await emitEvent(({
      tenantId,
      userId,
      module: 'policies',
      event: 'status_changed',
      entityType: 'policy_publication',
      entityId: publicationId,
      data: { newStatus: 'recalled', reason },
    } as any));

  return row;
}
