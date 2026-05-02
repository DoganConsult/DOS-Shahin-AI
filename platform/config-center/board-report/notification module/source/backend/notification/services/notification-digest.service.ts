// ============================================
// Shahin — Notification Digest Service
// Digest generation (daily/weekly),
// group by module/priority, summary statistics,
// digest scheduling, unsubscribe management
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export type DigestFrequency = 'daily' | 'weekly';

export interface DigestSubscription {
  subscriptionId: string;
  userId: string;
  frequency: DigestFrequency;
  moduleFilter: string[] | null;
  enabled: boolean;
  lastSentAt: string | null;
  nextScheduledAt: string | null;
  createdAt: string;
}

export interface DigestItem {
  notificationId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  moduleCode: string | null;
  priority: string;
  createdAt: string;
  read: boolean;
}

export interface DigestGroup {
  moduleCode: string;
  items: DigestItem[];
  unreadCount: number;
  criticalCount: number;
}

export interface GeneratedDigest {
  digestId: string;
  userId: string;
  frequency: DigestFrequency;
  generatedAt: string;
  totalItems: number;
  unreadItems: number;
  groups: DigestGroup[];
  summary: DigestSummary;
}

export interface DigestSummary {
  totalNotifications: number;
  unreadCount: number;
  criticalCount: number;
  byModule: Record<string, number>;
  byType: Record<string, number>;
  oldestUnread: string | null;
}

// === Pure Functions ===

export function computeNextScheduledAt(
  frequency: DigestFrequency,
  from: Date = new Date()
): Date {
  const next = new Date(from);
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
  } else {
    const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(8, 0, 0, 0);
  }
  return next;
}

export function groupDigestItems(
  items: DigestItem[],
  _priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
): DigestGroup[] {
  const groups: Record<string, DigestGroup> = {};

  for (const item of items) {
    const module = item.moduleCode || 'general';
    if (!groups[module]) {
      groups[module] = { moduleCode: module, items: [], unreadCount: 0, criticalCount: 0 };
    }
    groups[module].items.push(item);
    if (!item.read) groups[module].unreadCount++;
    if (item.priority === 'critical') groups[module].criticalCount++;
  }

  return Object.values(groups).sort((a, b) => b.criticalCount - a.criticalCount || b.unreadCount - a.unreadCount);
}

export function buildDigestSummary(items: DigestItem[]): DigestSummary {
  const byModule: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let unreadCount = 0;
  let criticalCount = 0;
  let oldestUnread: string | null = null;

  for (const item of items) {
    const m = item.moduleCode || 'general';
    byModule[m] = (byModule[m] || 0) + 1;
    byType[item.type] = (byType[item.type] || 0) + 1;
    if (!item.read) {
      unreadCount++;
      if (!oldestUnread || item.createdAt < oldestUnread) oldestUnread = item.createdAt;
    }
    if (item.priority === 'critical') criticalCount++;
  }

  return {
    totalNotifications: items.length,
    unreadCount,
    criticalCount,
    byModule,
    byType,
    oldestUnread,
  };
}

// === Subscriptions ===

function mapSubscription( r: Record<string, unknown>): DigestSubscription {
  return {

    subscriptionId: r.subscription_id,

    userId: r.user_id,

    frequency: r.frequency,

    moduleFilter: r.module_filter || null,
    enabled: r.enabled !== false,

    lastSentAt: r.last_sent_at?.toISOString?.() || r.last_sent_at || null,

    nextScheduledAt: r.next_scheduled_at?.toISOString?.() || r.next_scheduled_at || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function upsertDigestSubscription(
  tenantId: string,
  data: {
    userId: string;
    frequency: DigestFrequency;
    moduleFilter?: string[];
    enabled?: boolean;
  }
): Promise<DigestSubscription> {
  const schema = tenantSchema(tenantId);
  const nextScheduledAt = computeNextScheduledAt(data.frequency);
  const result = await safeQuery(
    `INSERT INTO "${schema}".notification_digest_subscriptions
       (subscription_id, user_id, frequency, module_filter, enabled, next_scheduled_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6)
     ON CONFLICT (user_id, frequency) DO UPDATE
       SET module_filter = EXCLUDED.module_filter,
           enabled = EXCLUDED.enabled,
           next_scheduled_at = EXCLUDED.next_scheduled_at,
           updated_at = NOW()
     RETURNING *`,
    [
      uuid(), data.userId, data.frequency,
      data.moduleFilter ? JSON.stringify(data.moduleFilter) : null,
      data.enabled !== false,
      nextScheduledAt.toISOString(),
    ]
  );
  return mapSubscription(getFirstRow(result));
}

export async function getDigestSubscriptions(
  tenantId: string,
  userId?: string
): Promise<DigestSubscription[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [];
  const where = userId ? `WHERE user_id = $1 AND enabled = true` : `WHERE enabled = true`;
  if (userId) params.push(userId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_digest_subscriptions ${where} ORDER BY frequency ASC`,
      params
    );
    return result.rows.map(mapSubscription);
  } catch { return []; }
}

export async function unsubscribeDigest(
  tenantId: string,
  userId: string,
  frequency?: DigestFrequency
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const extra = frequency ? `AND frequency = $2` : '';
  const params: unknown[] = [userId];
  if (frequency) params.push(frequency);
  try {
    await safeQuery(
      `UPDATE "${schema}".notification_digest_subscriptions
       SET enabled = false, updated_at = NOW()
       WHERE user_id = $1 ${extra}`,
      params
    );
  } catch { /* best-effort */ }
}

// === Digest Generation ===

export async function generateDigestForUser(
  tenantId: string,
  userId: string,
  frequency: DigestFrequency
): Promise<GeneratedDigest> {
  const schema = tenantSchema(tenantId);
  const windowHours = frequency === 'daily' ? 24 : 168;

  const result = await safeQuery(
    `SELECT
       n.notification_id, n.type, n.title, n.body, n.link, n.read, n.created_at,
       COALESCE(n.type, 'general') AS module_code,
       'medium' AS priority
     FROM "${schema}".notifications n
     WHERE n.user_id = $1
       AND n.created_at > NOW() - INTERVAL '${windowHours} hours'
     ORDER BY n.created_at DESC`,
    [userId]
  );

  const items: DigestItem[] = result.rows.map(( r: Record<string, unknown>) => ({
    notificationId: r.notification_id,
    type: r.type,
    title: r.title,
    body: r.body || null,
    link: r.link || null,
    moduleCode: r.module_code || null,
    priority: r.priority || 'medium',

    createdAt: r.created_at?.toISOString?.() || r.created_at,
    read: r.read || false,
  }));

  const groups = groupDigestItems(items);
  const summary = buildDigestSummary(items);

  const digest: GeneratedDigest = {
    digestId: uuid(),
    userId,
    frequency,
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    unreadItems: summary.unreadCount,
    groups,
    summary,
  };

  try {
    await safeQuery(
      `UPDATE "${schema}".notification_digest_subscriptions
       SET last_sent_at = NOW(),
           next_scheduled_at = $1,
           updated_at = NOW()
       WHERE user_id = $2 AND frequency = $3`,
      [computeNextScheduledAt(frequency).toISOString(), userId, frequency]
    );
  } catch { /* best-effort */ }

  return digest;
}

export async function getDueDigestSubscriptions(
  tenantId: string
): Promise<DigestSubscription[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_digest_subscriptions
       WHERE enabled = true
         AND (next_scheduled_at IS NULL OR next_scheduled_at <= NOW())
       ORDER BY next_scheduled_at ASC`,
      []
    );
    return result.rows.map(mapSubscription);
  } catch { return []; }
}
