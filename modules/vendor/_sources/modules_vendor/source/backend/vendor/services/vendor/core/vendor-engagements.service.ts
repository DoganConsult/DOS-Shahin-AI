// ============================================
// Shahin — Vendor Engagements Service
// Contract/engagement lifecycle tracking,
// milestones, expiry monitoring
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

// ============================================================
// Engagement CRUD
// ============================================================

/**
 * List vendor engagements with optional filters and pagination.
 * Returns { rows, total } for frontend table consumption.
 */
export async function getEngagements(
  tenantId: string,
  filters?: { vendorId?: string; status?: string; page?: number; pageSize?: number }
): Promise<{ rows: GenericRow[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE e.deleted_at IS NULL';
  const params: unknown[] = [];

  if (filters?.vendorId) {
    params.push(filters.vendorId);
    whereClause += ` AND e.vendor_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    whereClause += ` AND e.status = $${params.length}`;
  }

  const countRes = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".vendor_engagements e ${whereClause}`,
    params
  );
  const total = getFirstRow(countRes)?.total ?? 0;

  params.push(pageSize, offset);
  const dataRes = await safeQuery(
    `SELECT e.*, v.name AS vendor_name
     FROM "${schema}".vendor_engagements e
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
     ${whereClause}
     ORDER BY e.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total };
}

/**
 * Get a single engagement by ID with its milestones joined.
 */
export async function getEngagementById(
  tenantId: string,
  engagementId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const engRes = await safeQuery(
    `SELECT e.*, v.name AS vendor_name
     FROM "${schema}".vendor_engagements e
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
     WHERE e.engagement_id = $1 AND e.deleted_at IS NULL`,
    [engagementId]
  );
  const engagement = getFirstRow(engRes)!;
  if (!engagement) return undefined;

  const milestonesRes = await safeQuery(
    `SELECT * FROM "${schema}".vendor_engagement_milestones
     WHERE engagement_id = $1 ORDER BY due_date ASC NULLS LAST, created_at ASC`,
    [engagementId]
  );
  engagement.milestones = milestonesRes.rows;

  return engagement;
}

/**
 * Create a new vendor engagement and increment the vendor's engagement_count.
 */
export async function createEngagement(
  tenantId: string,
  data: {
    vendorId: string; title: string; engagementType?: string; contractRef?: string;
    startDate?: string; endDate?: string; autoRenewal?: boolean; renewalNoticeDays?: number;
    totalValue?: number; currency?: string; status?: string; ownerUserId?: string;
    description?: string; createdBy?: string;
  }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const r = await safeQuery(
    `INSERT INTO "${schema}".vendor_engagements
       (vendor_id, title, engagement_type, contract_ref, start_date, end_date,
        auto_renewal, renewal_notice_days, total_value, currency, status,
        owner_user_id, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      data.vendorId, data.title, data.engagementType || 'contract',
      data.contractRef || null, data.startDate || null, data.endDate || null,
      data.autoRenewal ?? false, data.renewalNoticeDays ?? 90,
      data.totalValue ?? null, data.currency || 'SAR', data.status || 'draft',
      data.ownerUserId || null, data.description || null, data.createdBy || null,
    ]
  );

  // Increment engagement counter on the vendor
  await safeQuery(
    `UPDATE "${schema}".vendors
     SET engagement_count = COALESCE(engagement_count, 0) + 1, updated_at = NOW()
     WHERE vendor_id = $1`,
    [data.vendorId]
  );

  const engagement = getFirstRow(r)!;
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'vendor.engagement_created', tenantId, sourceService: 'vendor-engagements',
      entityType: 'vendor_engagement', entityId: engagement?.engagement_id, severity: 'info',
      payload: { vendorId: data.vendorId, title: data.title, engagementType: data.engagementType },
    } as any)), { tenantId, operation: 'eventBus:vendor.engagement_created' });

  return engagement;
}

/**
 * Update an engagement. Only provided fields are modified (dynamic SET).
 */
export async function updateEngagement(
  tenantId: string,
  engagementId: string,
  data: Partial<{
    title: string; engagementType: string; contractRef: string;
    startDate: string; endDate: string; autoRenewal: boolean; renewalNoticeDays: number;
    totalValue: number; currency: string; status: string; ownerUserId: string;
    description: string; metadata: Record<string, unknown>;
  }>
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  // Map camelCase keys to snake_case columns
  const fieldMap: Record<string, string> = {
    title: 'title', engagementType: 'engagement_type', contractRef: 'contract_ref',
    startDate: 'start_date', endDate: 'end_date', autoRenewal: 'auto_renewal',
    renewalNoticeDays: 'renewal_notice_days', totalValue: 'total_value', currency: 'currency',
    status: 'status', ownerUserId: 'owner_user_id', description: 'description', metadata: 'metadata',
  };

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((data as Record<string, unknown>)[key] !== undefined) {
      params.push(col === 'metadata' ? JSON.stringify((data as Record<string, unknown>)[key]) : (data as Record<string, unknown>)[key]);
      setClauses.push(`${col} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) return getEngagementById(tenantId, engagementId) as Promise<GenericRow | undefined>;

  setClauses.push('updated_at = NOW()');
  params.push(engagementId);

  return getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_engagements SET ${setClauses.join(', ')} WHERE engagement_id = $${params.length} AND deleted_at IS NULL RETURNING *`,
    params
  ));
}

// ============================================================
// Milestones
// ============================================================

/**
 * Add a milestone to an engagement.
 */
export async function addMilestone(
  tenantId: string,
  engagementId: string,
  data: { milestoneType?: string; title: string; dueDate?: string; notes?: string }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow(await safeQuery(
    `INSERT INTO "${schema}".vendor_engagement_milestones
       (engagement_id, milestone_type, title, due_date, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [engagementId, data.milestoneType || 'review', data.title, data.dueDate || null, data.notes || null]
  ));
}

/**
 * Update a milestone's status and/or completion details.
 */
export async function updateMilestone(
  tenantId: string,
  milestoneId: string,
  data: { status?: string; completedBy?: string; notes?: string }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const completedAt = data.status === 'completed' ? 'NOW()' : 'NULL';
  return getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_engagement_milestones
     SET status = COALESCE($1, status),
         completed_by = COALESCE($2, completed_by),
         notes = COALESCE($3, notes),
         completed_at = ${completedAt}
     WHERE milestone_id = $4 RETURNING *`,
    [data.status || null, data.completedBy || null, data.notes || null, milestoneId]
  ));
}

// ============================================================
// Expiry Monitoring
// ============================================================

/**
 * Get engagements expiring within `daysAhead` days (default 60).
 * Useful for proactive renewal and offboarding workflows.
 */
export async function getExpiringEngagements(
  tenantId: string,
  daysAhead: number = 60
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT e.*, v.name AS vendor_name
     FROM "${schema}".vendor_engagements e
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = e.vendor_id
     WHERE e.end_date IS NOT NULL
       AND e.end_date BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
       AND e.status NOT IN ('terminated', 'expired')
       AND e.deleted_at IS NULL
     ORDER BY e.end_date ASC`,
    [daysAhead]
  )).rows;
}
