// ============================================
// Shahin-Ai — Inbox Routing Service
// Smart routing based on message type/priority,
// role-based routing, load distribution, rules
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type MessageType = "task" | "alert" | "notification" | "approval" | "announcement" | "system";
export type RoutingStrategy = "direct" | "role_based" | "load_balanced" | "round_robin";

export interface RoutingRule {
  ruleId: string;
  name: string;
  messageType: MessageType;
  priority: string;
  strategy: RoutingStrategy;
  targetRole?: string;
  targetUserId?: string;
  conditions: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface RoutingResult {
  recipientIds: string[];
  strategy: RoutingStrategy;
  ruleId: string | null;
  reason: string;
}

export interface LoadStats {
  userId: string;
  pendingCount: number;
  lastAssignedAt: string | null;
}

// === Pure Functions ===

export function selectRoutingStrategy(
  messageType: MessageType,
  priority: string
): RoutingStrategy {
  if (messageType === "approval") return "direct";
  if (messageType === "system" || messageType === "announcement") return "role_based";
  if (priority === "critical" || priority === "high") return "direct";
  return "load_balanced";
}

export function pickLeastLoaded(stats: LoadStats[]): string | null {
  if (stats.length === 0) return null;
  return stats.reduce((a, b) => (a.pendingCount <= b.pendingCount ? a : b)).userId;
}

export function pickRoundRobin(stats: LoadStats[], lastAssignedIndex: number): string | null {
  if (stats.length === 0) return null;
  return stats[(lastAssignedIndex + 1) % stats.length].userId;
}

// === DB-backed Functions ===

function mapRule( r: Record<string, unknown>): RoutingRule {
  return {

    ruleId: r.rule_id,

    name: r.name,

    messageType: r.message_type,

    priority: r.priority,

    strategy: r.strategy,

    targetRole: r.target_role || undefined,

    targetUserId: r.target_user_id || undefined,

    conditions: r.conditions || {},

    isActive: r.is_active,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getRoutingRules(tenantId: string): Promise<RoutingRule[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_routing_rules WHERE is_active = true ORDER BY created_at ASC`
  );
  return result.rows.map(mapRule);
}

export async function createRoutingRule(
  tenantId: string,
  data: {
    name: string;
    messageType: MessageType;
    priority: string;
    strategy: RoutingStrategy;
    targetRole?: string;
    targetUserId?: string;
    conditions?: Record<string, unknown>;
  }
): Promise<RoutingRule> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".inbox_routing_rules
      (name, message_type, priority, strategy, target_role, target_user_id, conditions, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      data.name,
      data.messageType,
      data.priority,
      data.strategy,
      data.targetRole || null,
      data.targetUserId || null,
      JSON.stringify(data.conditions || {}),
    ]
  );
  return mapRule(getFirstRow(result)!);
}

export async function resolveRecipients(
  tenantId: string,
  messageType: MessageType,
  priority: string,
  _senderRole?: string
): Promise<RoutingResult> {
  const schema = tenantSchema(tenantId);

  const rules = await safeQuery(
    `SELECT * FROM "${schema}".inbox_routing_rules
     WHERE is_active = true AND message_type = $1
     ORDER BY created_at ASC LIMIT 1`,
    [messageType]
  );

  const rule: RoutingRule | null = rules.rows.length > 0 ? mapRule(rules.rows[0]) : null;
  const strategy = rule?.strategy ?? selectRoutingStrategy(messageType, priority);

  if (strategy === "direct" && rule?.targetUserId) {
    return { recipientIds: [rule.targetUserId], strategy, ruleId: rule.ruleId, reason: "direct rule match" };
  }

  if (strategy === "role_based" && rule?.targetRole) {
    const members = await safeQuery(
      `SELECT user_id FROM "${schema}".team_members WHERE role = $1 AND status = 'active'`,
      [rule.targetRole]
    );
    return {

      recipientIds: members.rows.map(( r: Record<string, unknown>) => r.user_id),
      strategy,
      ruleId: rule.ruleId,
      reason: `role_based: ${rule.targetRole}`,
    };
  }

  if (strategy === "load_balanced") {
    const stats = await safeQuery(
      `SELECT u.user_id,
              COUNT(i.id) FILTER (WHERE i.status = 'pending') AS pending_count,
              MAX(i.created_at) AS last_assigned_at
       FROM "${schema}".team_members u
       LEFT JOIN "${schema}".inbox_inbox i ON i.recipient = u.user_id
       WHERE u.status = 'active'
       GROUP BY u.user_id
       ORDER BY pending_count ASC LIMIT 10`
    );

    const loadStats: LoadStats[] = stats.rows.map(( r: Record<string, unknown>) => ({
      userId: r.user_id,
      pendingCount: parseInt((r as any).pending_count, 10) || 0,

      lastAssignedAt: r.last_assigned_at?.toISOString?.() || null,
    }));
    const picked = pickLeastLoaded(loadStats);
    return {
      recipientIds: picked ? [picked] : [],
      strategy,
      ruleId: rule?.ruleId ?? null,
      reason: "load_balanced selection",
    };
  }

  return { recipientIds: [], strategy, ruleId: null, reason: "no rule matched" };
}

export async function getLoadDistribution(tenantId: string): Promise<LoadStats[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT u.user_id,
            COUNT(i.id) FILTER (WHERE i.status = 'pending') AS pending_count,
            MAX(i.created_at) AS last_assigned_at
     FROM "${schema}".team_members u
     LEFT JOIN "${schema}".inbox_inbox i ON i.recipient = u.user_id
     WHERE u.status = 'active'
     GROUP BY u.user_id
     ORDER BY pending_count DESC`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    userId: r.user_id,
    pendingCount: parseInt((r as any).pending_count, 10) || 0,

    lastAssignedAt: r.last_assigned_at?.toISOString?.() || null,
  }));
}

export async function deactivateRoutingRule(
  tenantId: string,
  ruleId: string
): Promise<RoutingRule> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.inbox_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
