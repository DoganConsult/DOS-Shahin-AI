// ============================================
// Shahin-Ai — Inbox Digest Service
// Daily/weekly digest generation, grouping by
// module/priority, stats, digest preferences
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type DigestFrequency = "daily" | "weekly" | "never";

export interface DigestPreference {
  preferenceId: string;
  userId: string;
  frequency: DigestFrequency;
  sendAt: string;
  includeRead: boolean;
  groupByModule: boolean;
  updatedAt: string;
}

export interface DigestGroup {
  module: string;
  priority: string;
  count: number;
  items: DigestItem[];
}

export interface DigestItem {
  id: string;
  title: string;
  messageType: string;
  priority: string;
  sender: string;
  createdAt: string;
  isRead: boolean;
}

export interface DigestSummary {
  userId: string;
  period: "daily" | "weekly";
  totalUnread: number;
  totalPending: number;
  groups: DigestGroup[];
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    byModule: Record<string, number>;
  };
  generatedAt: string;
}

// === Pure Functions ===

export function groupItemsByModule(items: DigestItem[]): DigestGroup[] {
  const map = new Map<string, DigestItem[]>();
  for (const item of items) {
    const key = item.messageType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([module, groupItems]) => ({
    module,
    priority: groupItems[0]?.priority ?? "medium",
    count: groupItems.length,
    items: groupItems,
  }));
}

export function computeDigestStats(items: DigestItem[]): DigestSummary["stats"] {
  const byModule: Record<string, number> = {};
  let critical = 0, high = 0, medium = 0, low = 0;
  for (const item of items) {
    if (item.priority === "critical") critical++;
    else if (item.priority === "high") high++;
    else if (item.priority === "medium") medium++;
    else low++;
    byModule[item.messageType] = (byModule[item.messageType] || 0) + 1;
  }
  return { critical, high, medium, low, byModule };
}

export function shouldSendDigest(preference: DigestPreference, now: Date): boolean {
  if (preference.frequency === "never") return false;
  const sendHour = parseInt(preference.sendAt.split(":")[0], 10);
  if (preference.frequency === "daily") return now.getHours() === sendHour;
  if (preference.frequency === "weekly") return now.getDay() === 1 && now.getHours() === sendHour;
  return false;
}

// === DB-backed Functions ===

function mapPreference( r: Record<string, unknown>): DigestPreference {
  return {

    preferenceId: r.preference_id,

    userId: r.user_id,

    frequency: r.frequency,

    sendAt: r.send_at || "08:00",

    includeRead: r.include_read || false,

    groupByModule: r.group_by_module ?? true,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

export async function getDigestPreference(
  tenantId: string,
  userId: string
): Promise<DigestPreference | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_digest_preferences WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  const row = getFirstRow(result)!;
  return row ? mapPreference(row) : null;
}

export async function upsertDigestPreference(
  tenantId: string,
  userId: string,
  data: { frequency: DigestFrequency; sendAt?: string; includeRead?: boolean; groupByModule?: boolean }
): Promise<DigestPreference> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".inbox_digest_preferences
      (user_id, frequency, send_at, include_read, group_by_module)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET frequency = EXCLUDED.frequency,
                   send_at = EXCLUDED.send_at,
                   include_read = EXCLUDED.include_read,
                   group_by_module = EXCLUDED.group_by_module,
                   updated_at = NOW()
     RETURNING *`,
    [
      userId,
      data.frequency,
      data.sendAt || "08:00",
      data.includeRead ?? false,
      data.groupByModule ?? true,
    ]
  );
  return mapPreference(getFirstRow(result)!);
}

export async function generateDigest(
  tenantId: string,
  userId: string,
  period: "daily" | "weekly"
): Promise<DigestSummary> {
  const schema = tenantSchema(tenantId);
  const since = new Date(
    Date.now() - (period === "daily" ? 1 : 7) * 24 * 60 * 60 * 1000
  ).toISOString();

  const result = await safeQuery(
    `SELECT id, title, message_type, priority, sender, created_at, read_at
     FROM "${schema}".inbox_inbox
     WHERE recipient = $1
       AND created_at >= $2
       AND deleted_at IS NULL
     ORDER BY priority DESC, created_at DESC`,
    [userId, since]
  );

  const items: DigestItem[] = result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    messageType: r.message_type,
    priority: r.priority || "medium",
    sender: r.sender,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
    isRead: !!r.read_at,
  }));

  const unread = items.filter(i => !i.isRead);
  const pending = items.filter(i => !i.isRead);

  return {
    userId,
    period,
    totalUnread: unread.length,
    totalPending: pending.length,
    groups: groupItemsByModule(unread),
    stats: computeDigestStats(items),
    generatedAt: new Date().toISOString(),
  };
}

export async function getDigestRecipients(
  tenantId: string,
  frequency: DigestFrequency
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT user_id FROM "${schema}".inbox_digest_preferences WHERE frequency = $1`,
    [frequency]
  );

  return result.rows.map(( r: Record<string, unknown>) => r.user_id);
}
