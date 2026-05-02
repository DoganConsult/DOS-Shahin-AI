import { safeQuery, tenantSchema } from '@dos/db';

export type AvailabilityStatus = 'available' | 'busy' | 'away' | 'offline' | 'do_not_disturb';

export interface UserAvailability {
  userId: string;
  tenantId: string;
  status: AvailabilityStatus;
  statusMessage: string | null;
  availableUntil: string | null;
  updatedAt: string;
}

export async function getUserAvailability(tenantId: string, userId: string): Promise<UserAvailability | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".user_availability WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    userId,
    tenantId,
    status: (row['status'] as AvailabilityStatus) ?? 'offline',
    statusMessage: row['status_message'] != null ? String(row['status_message']) : null,
    availableUntil: row['available_until'] != null ? String(row['available_until']) : null,
    updatedAt: String(row['updated_at'] ?? ''),
  };
}

export async function setUserAvailability(
  tenantId: string,
  userId: string,
  availability: { status: AvailabilityStatus; statusMessage?: string | null; availableUntil?: string | null },
): Promise<UserAvailability> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".user_availability
       (user_id, status, status_message, available_until)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET status = EXCLUDED.status,
           status_message = EXCLUDED.status_message,
           available_until = EXCLUDED.available_until,
           updated_at = NOW()
     RETURNING *`,
    [userId, availability.status, availability.statusMessage ?? null, availability.availableUntil ?? null],
  );
  const row = rows[0] ?? {};
  return {
    userId,
    tenantId,
    status: (row['status'] as AvailabilityStatus) ?? availability.status,
    statusMessage: row['status_message'] != null ? String(row['status_message']) : availability.statusMessage ?? null,
    availableUntil: row['available_until'] != null ? String(row['available_until']) : availability.availableUntil ?? null,
    updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
  };
}
