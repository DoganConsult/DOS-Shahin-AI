// ============================================
// Shahin-Ai — Inbox Broadcast Service
// System-wide announcements, bulk messages to
// role groups, targeted alerts, broadcast history
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type BroadcastScope = "all_users" | "role" | "module_permission" | "custom_list";

export interface BroadcastMessage {
  broadcastId: string;
  title: string;
  body: string;
  messageType: string;
  priority: string;
  scope: BroadcastScope;
  targetRoles: string[];
  targetModules: string[];
  targetUserIds: string[];
  sentCount: number;
  createdBy: string;
  createdAt: string;
  scheduledAt: string | null;
  sentAt: string | null;
}

export interface BroadcastDelivery {
  deliveryId: string;
  broadcastId: string;
  recipientId: string;
  status: "pending" | "delivered" | "failed";
  deliveredAt: string | null;
}

// === Pure Functions ===

export function buildRecipientQuery(scope: BroadcastScope, targets: string[]): {
  clause: string;
  params: unknown[];
} {
  if (scope === "all_users") {
    return { clause: "1=1", params: [] };
  }
  if (scope === "role" && targets.length > 0) {
    return {
      clause: `role = ANY($1::text[])`,
      params: [targets],
    };
  }
  if (scope === "custom_list" && targets.length > 0) {
    return {
      clause: `user_id = ANY($1::text[])`,
      params: [targets],
    };
  }
  return { clause: "false", params: [] };
}

export function validateBroadcastData(data: {
  title: string;
  body: string;
  scope: BroadcastScope;
  targetRoles?: string[];
  targetUserIds?: string[];
}): string[] {
  const errors: string[] = [];
  if (!data.title || data.title.trim() === "") errors.push("title is required");
  if (!data.body || data.body.trim() === "") errors.push("body is required");
  if (data.scope === "role" && (!data.targetRoles || data.targetRoles.length === 0)) {
    errors.push("targetRoles required for role-scoped broadcast");
  }
  if (data.scope === "custom_list" && (!data.targetUserIds || data.targetUserIds.length === 0)) {
    errors.push("targetUserIds required for custom_list broadcast");
  }
  return errors;
}

// === DB-backed Functions ===

function mapBroadcast( r: Record<string, unknown>): BroadcastMessage {
  return {

    broadcastId: r.broadcast_id,

    title: r.title,

    body: r.body,

    messageType: r.message_type || "announcement",

    priority: r.priority || "medium",

    scope: r.scope,

    targetRoles: r.target_roles || [],

    targetModules: r.target_modules || [],

    targetUserIds: r.target_user_ids || [],

    sentCount: r.sent_count || 0,

    createdBy: r.created_by,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
    scheduledAt: r.scheduled_at ? new Date((r as any).scheduled_at).toISOString() : null,
    sentAt: r.sent_at ? new Date((r as any).sent_at).toISOString() : null,
  };
}

export async function createBroadcast(
  tenantId: string,
  data: {
    title: string;
    body: string;
    messageType?: string;
    priority?: string;
    scope: BroadcastScope;
    targetRoles?: string[];
    targetModules?: string[];
    targetUserIds?: string[];
    createdBy: string;
    scheduledAt?: string;
  }
): Promise<BroadcastMessage> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.inbox_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function sendBroadcast(
  tenantId: string,
  broadcastId: string
): Promise<{ sentCount: number }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.inbox_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function getBroadcastHistory(
  tenantId: string,
  limit = 50
): Promise<BroadcastMessage[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_broadcasts
     WHERE sent_at IS NOT NULL
     ORDER BY sent_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapBroadcast);
}

export async function cancelScheduledBroadcast(
  tenantId: string,
  broadcastId: string
): Promise<BroadcastMessage> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.inbox_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
