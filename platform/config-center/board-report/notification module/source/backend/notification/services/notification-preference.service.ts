// ============================================
// Shahin — Notification Preference Service
// User preference management (per channel, module,
// event type), opt-in/opt-out, quiet hours,
// frequency limits, role-based inheritance
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export interface NotificationPreference {
  preferenceId: string;
  userId: string;
  eventType: string | null;
  moduleCode: string | null;
  channel: string;
  enabled: boolean;
  frequencyLimit: number | null;
  frequencyWindowHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuietHours {
  quietHoursId: string;
  userId: string;
  startHour: number;
  endHour: number;
  timezone: string;
  daysOfWeek: number[];
  enabled: boolean;
  createdAt: string;
}

export interface RolePreference {
  rolePreferenceId: string;
  role: string;
  eventType: string | null;
  moduleCode: string | null;
  channel: string;
  enabled: boolean;
  createdAt: string;
}

// === Pure Functions ===

export function isWithinQuietHours(
  quietHours: QuietHours,
  now: Date = new Date()
): boolean {
  if (!quietHours.enabled) return false;
  const dayOfWeek = now.getDay();
  if (!quietHours.daysOfWeek.includes(dayOfWeek)) return false;
  const hour = now.getHours();
  if (quietHours.startHour <= quietHours.endHour) {
    return hour >= quietHours.startHour && hour < quietHours.endHour;
  }
  return hour >= quietHours.startHour || hour < quietHours.endHour;
}

export function shouldRespectFrequencyLimit(
  sentCount: number,
  limit: number | null
): boolean {
  if (limit === null) return false;
  return sentCount >= limit;
}

// === Mappers ===

function mapPref( r: Record<string, unknown>): NotificationPreference {
  return {

    preferenceId: r.preference_id,

    userId: r.user_id,

    eventType: r.event_type || null,

    moduleCode: r.module_code || null,

    channel: r.channel,
    enabled: r.enabled !== false,
    frequencyLimit: r.frequency_limit ? parseInt((r as any).frequency_limit, 10) : null,
    frequencyWindowHours: r.frequency_window_hours ? parseInt((r as any).frequency_window_hours, 10) : null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

function mapQuietHours( r: Record<string, unknown>): QuietHours {
  return {

    quietHoursId: r.quiet_hours_id,

    userId: r.user_id,

    startHour: r.start_hour,

    endHour: r.end_hour,

    timezone: r.timezone || 'UTC',

    daysOfWeek: r.days_of_week || [0, 1, 2, 3, 4, 5, 6],
    enabled: r.enabled !== false,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

// === Preference CRUD ===

export async function upsertPreference(
  tenantId: string,
  data: {
    userId: string;
    eventType?: string;
    moduleCode?: string;
    channel: string;
    enabled: boolean;
    frequencyLimit?: number;
    frequencyWindowHours?: number;
  }
): Promise<NotificationPreference> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".notification_preferences
       (preference_id, user_id, event_type, module_code, channel, enabled,
        frequency_limit, frequency_window_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id, channel, COALESCE(event_type,''), COALESCE(module_code,''))
     DO UPDATE SET enabled = EXCLUDED.enabled,
                   frequency_limit = EXCLUDED.frequency_limit,
                   frequency_window_hours = EXCLUDED.frequency_window_hours,
                   updated_at = NOW()
     RETURNING *`,
    [
      uuid(), data.userId, data.eventType || null, data.moduleCode || null,
      data.channel, data.enabled,
      data.frequencyLimit || null, data.frequencyWindowHours || null,
    ]
  );
  return mapPref(getFirstRow(result));
}

export async function getUserPreferences(
  tenantId: string,
  userId: string
): Promise<NotificationPreference[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_preferences WHERE user_id = $1 ORDER BY channel ASC`,
      [userId]
    );
    return result.rows.map(mapPref);
  } catch { return []; }
}

export async function getEffectivePreference(
  tenantId: string,
  userId: string,
  eventType: string,
  moduleCode: string,
  channel: string,
  userRole?: string
): Promise<{ enabled: boolean; frequencyLimit: number | null }> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_preferences
       WHERE user_id = $1 AND channel = $2
         AND (event_type = $3 OR event_type IS NULL)
         AND (module_code = $4 OR module_code IS NULL)
       ORDER BY
         (event_type IS NOT NULL)::int DESC,
         (module_code IS NOT NULL)::int DESC
       LIMIT 1`,
      [userId, channel, eventType, moduleCode]
    );

    const pref = getFirstRow(result)!;
    if (pref) {
      return { enabled: pref.enabled, frequencyLimit: pref.frequency_limit ? parseInt(pref.frequency_limit, 10) : null };
    }

    if (userRole) {
      const roleResult = await safeQuery(
        `SELECT * FROM "${schema}".notification_role_preferences
         WHERE role = $1 AND channel = $2
           AND (event_type = $3 OR event_type IS NULL)
           AND (module_code = $4 OR module_code IS NULL)
         ORDER BY (event_type IS NOT NULL)::int DESC LIMIT 1`,
        [userRole, channel, eventType, moduleCode]
      );
      const rolePref = getFirstRow(roleResult)!;
      if (rolePref) return { enabled: rolePref.enabled, frequencyLimit: null };
    }
  } catch { /* tables may not exist */ }

  return { enabled: true, frequencyLimit: null };
}

export async function optOut(
  tenantId: string,
  userId: string,
  channel: string,
  eventType?: string
): Promise<void> {
  await upsertPreference(tenantId, { userId, channel, enabled: false, eventType });
}

export async function optIn(
  tenantId: string,
  userId: string,
  channel: string,
  eventType?: string
): Promise<void> {
  await upsertPreference(tenantId, { userId, channel, enabled: true, eventType });
}

// === Quiet Hours ===

export async function upsertQuietHours(
  tenantId: string,
  data: {
    userId: string;
    startHour: number;
    endHour: number;
    timezone?: string;
    daysOfWeek?: number[];
    enabled?: boolean;
  }
): Promise<QuietHours> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".notification_quiet_hours
       (quiet_hours_id, user_id, start_hour, end_hour, timezone, days_of_week, enabled)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
     ON CONFLICT (user_id) DO UPDATE
       SET start_hour = EXCLUDED.start_hour,
           end_hour = EXCLUDED.end_hour,
           timezone = EXCLUDED.timezone,
           days_of_week = EXCLUDED.days_of_week,
           enabled = EXCLUDED.enabled,
           updated_at = NOW()
     RETURNING *`,
    [
      uuid(), data.userId, data.startHour, data.endHour,
      data.timezone || 'UTC',
      JSON.stringify(data.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]),
      data.enabled !== false,
    ]
  );
  return mapQuietHours(getFirstRow(result));
}

export async function getQuietHours(
  tenantId: string,
  userId: string
): Promise<QuietHours | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_quiet_hours WHERE user_id = $1`,
      [userId]
    );
    const row = getFirstRow(result)!;
    return row ? mapQuietHours(row) : null;
  } catch { return null; }
}

export async function isUserInQuietHours(
  tenantId: string,
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const qh = await getQuietHours(tenantId, userId);
  if (!qh) return false;
  return isWithinQuietHours(qh, now);
}

// === Frequency Check ===

export async function isFrequencyLimitReached(
  tenantId: string,
  userId: string,
  eventType: string,
  channel: string,
  windowHours: number,
  limit: number
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".notifications
       WHERE user_id = $1 AND type = $2
         AND created_at > NOW() - INTERVAL '${windowHours} hours'`,
      [userId, eventType]
    );
    const cnt = parseInt(getFirstRow(result)?.cnt || '0', 10);
    return shouldRespectFrequencyLimit(cnt, limit);
  } catch { return false; }
}
