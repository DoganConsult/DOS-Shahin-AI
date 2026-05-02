// ============================================
// Shahin — Notification Channel Service
// Multi-channel delivery management (in-app, email,
// SMS, MS Teams webhook), channel configuration
// per tenant, health monitoring, delivery status tracking
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export type ChannelType = 'in_app' | 'email' | 'sms' | 'teams_webhook' | 'slack_webhook';

export type ChannelStatus = 'active' | 'inactive' | 'error' | 'rate_limited';

export interface ChannelConfig {
  channelId: string;
  tenantId: string;
  channelType: ChannelType;
  status: ChannelStatus;
  config: Record<string, unknown>;
  rateLimitPerHour: number | null;
  healthCheckedAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRecord {
  deliveryId: string;
  notificationId: string;
  channelType: ChannelType;
  recipientId: string;
  status: 'pending' | 'delivered' | 'failed' | 'bounced';
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface ChannelHealthSummary {
  channelType: ChannelType;
  status: ChannelStatus;
  deliverySuccessRate: number;
  totalSent: number;
  totalFailed: number;
  lastChecked: string | null;
}

// === Pure Functions ===

export function computeDeliverySuccessRate(sent: number, failed: number): number {
  if (sent === 0) return 100;
  return Math.round(((sent - failed) / sent) * 100);
}

export function isChannelHealthy(successRate: number, status: ChannelStatus): boolean {
  return status === 'active' && successRate >= 95;
}

// === Mappers ===

function mapChannel( r: Record<string, unknown>): ChannelConfig {
  return {

    channelId: r.channel_id,

    tenantId: r.tenant_id,

    channelType: r.channel_type,

    status: r.status,
    config: typeof r.config === 'string' ? JSON.parse(r.config) : (r.config || {}),
    rateLimitPerHour: r.rate_limit_per_hour ? parseInt((r as any).rate_limit_per_hour, 10) : null,

    healthCheckedAt: r.health_checked_at?.toISOString?.() || r.health_checked_at || null,

    lastErrorMessage: r.last_error_message || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

function mapDelivery( r: Record<string, unknown>): DeliveryRecord {
  return {

    deliveryId: r.delivery_id,

    notificationId: r.notification_id,

    channelType: r.channel_type,

    recipientId: r.recipient_id,

    status: r.status,

    sentAt: r.sent_at?.toISOString?.() || r.sent_at || null,

    deliveredAt: r.delivered_at?.toISOString?.() || r.delivered_at || null,

    failureReason: r.failure_reason || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

// === Channel Config CRUD ===

export async function upsertChannelConfig(
  tenantId: string,
  channelType: ChannelType,
  config: Record<string, unknown>,
  rateLimitPerHour?: number
): Promise<ChannelConfig> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".notification_channel_configs
       (channel_id, tenant_id, channel_type, status, config, rate_limit_per_hour)
     VALUES ($1,$2,$3,'active',$4::jsonb,$5)
     ON CONFLICT (channel_type) DO UPDATE
       SET config = EXCLUDED.config,
           rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
           status = 'active',
           updated_at = NOW()
     RETURNING *`,
    [uuid(), tenantId, channelType, JSON.stringify(config), rateLimitPerHour || null]
  );
  return mapChannel(getFirstRow(result));
}

export async function getChannelConfig(
  tenantId: string,
  channelType: ChannelType
): Promise<ChannelConfig | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_channel_configs WHERE channel_type = $1`,
      [channelType]
    );
    const row = getFirstRow(result)!;
    return row ? mapChannel(row) : null;
  } catch { return null; }
}

export async function getAllChannelConfigs(tenantId: string): Promise<ChannelConfig[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_channel_configs ORDER BY channel_type ASC`,
      []
    );
    return result.rows.map(mapChannel);
  } catch { return []; }
}

export async function setChannelStatus(
  tenantId: string,
  channelType: ChannelType,
  status: ChannelStatus,
  errorMessage?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".notification_channel_configs
       SET status = $1, last_error_message = $2, health_checked_at = NOW(), updated_at = NOW()
       WHERE channel_type = $3`,
      [status, errorMessage || null, channelType]
    );
  } catch { /* best-effort */ }
}

// === Delivery Tracking ===

export async function recordDelivery(
  tenantId: string,
  data: {
    notificationId: string;
    channelType: ChannelType;
    recipientId: string;
    status: DeliveryRecord['status'];
    failureReason?: string;
  }
): Promise<DeliveryRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".notification_deliveries
       (delivery_id, notification_id, channel_type, recipient_id, status,
        sent_at, failure_reason)
     VALUES ($1,$2,$3,$4,$5,
       CASE WHEN $5 IN ('delivered','pending') THEN NOW() ELSE NULL END,
       $6)
     RETURNING *`,
    [
      uuid(), data.notificationId, data.channelType,
      data.recipientId, data.status, data.failureReason || null,
    ]
  );
  return mapDelivery(getFirstRow(result));
}

export async function updateDeliveryStatus(
  tenantId: string,
  deliveryId: string,
  status: DeliveryRecord['status'],
  failureReason?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".notification_deliveries
     SET status = $1,
         delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
         failure_reason = COALESCE($2, failure_reason),
         updated_at = NOW()
     WHERE delivery_id = $3`,
    [status, failureReason || null, deliveryId]
  );
}

export async function getDeliveryRecords(
  tenantId: string,
  notificationId: string
): Promise<DeliveryRecord[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".notification_deliveries
       WHERE notification_id = $1 ORDER BY created_at DESC`,
      [notificationId]
    );
    return result.rows.map(mapDelivery);
  } catch { return []; }
}

// === Health Monitoring ===

export async function getChannelHealthSummaries(
  tenantId: string
): Promise<ChannelHealthSummary[]> {
  const schema = tenantSchema(tenantId);
  try {
    const [configResult, deliveryResult] = await Promise.all([
      safeQuery(`SELECT channel_type, status, health_checked_at FROM "${schema}".notification_channel_configs`, []),
      safeQuery(
        `SELECT channel_type,
                COUNT(*) AS total_sent,
                COUNT(*) FILTER (WHERE status = 'failed') AS total_failed
         FROM "${schema}".notification_deliveries
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY channel_type`,
        []
      ),
    ]);

    const deliveryMap: Record<string, { totalSent: number; totalFailed: number }> = {};
    for (const r of deliveryResult.rows as Record<string, unknown>[][]) {

      deliveryMap[r.channel_type] = {

        totalSent: parseInt(r.total_sent, 10),

        totalFailed: parseInt(r.total_failed, 10),
      };
    }

    return configResult.rows.map(( r: Record<string, unknown>) => {
      const stats = deliveryMap[(r as any).channel_type] || { totalSent: 0, totalFailed: 0 };
      return {
        channelType: r.channel_type as ChannelType,
        status: r.status as ChannelStatus,
        deliverySuccessRate: computeDeliverySuccessRate(stats.totalSent, stats.totalFailed),
        totalSent: stats.totalSent,
        totalFailed: stats.totalFailed,

        lastChecked: r.health_checked_at?.toISOString?.() || r.health_checked_at || null,
      };
    });
  } catch { return []; }
}
