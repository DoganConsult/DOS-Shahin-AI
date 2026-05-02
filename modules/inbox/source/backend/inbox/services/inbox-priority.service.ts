// ============================================
// Shahin-Ai — Inbox Priority Service
// SLA-based scoring, priority queue management,
// auto-priority from source module, escalation
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export interface PriorityScore {
  score: number;
  level: PriorityLevel;
  factors: string[];
}

export interface SlaPolicy {
  policyId: string;
  messageType: string;
  priorityLevel: PriorityLevel;
  responseTargetHours: number;
  escalationHours: number;
  createdAt: string;
}

export interface PrioritizedItem {
  id: string;
  title: string;
  priority: PriorityLevel;
  score: number;
  recipient: string;
  createdAt: string;
  slaDeadline: string | null;
  isEscalated: boolean;
}

// === Pure Functions ===

export function computePriorityScore(
  messageType: string,
  sourceModule: string,
  ageHours: number,
  slaTargetHours: number
): PriorityScore {
  const factors: string[] = [];
  let score = 0;

  const typeWeights: Record<string, number> = {
    approval: 40,
    alert: 35,
    task: 25,
    notification: 10,
    announcement: 5,
    system: 20,
  };
  const typeScore = typeWeights[messageType] ?? 10;
  score += typeScore;
  factors.push(`type:${messageType}(+${typeScore})`);

  const moduleWeights: Record<string, number> = {
    risk: 20,
    incident: 25,
    compliance: 15,
    audit: 15,
    exception: 20,
    controls: 10,
    vendor: 10,
  };
  const moduleScore = moduleWeights[sourceModule] ?? 5;
  score += moduleScore;
  factors.push(`module:${sourceModule}(+${moduleScore})`);

  if (slaTargetHours > 0 && ageHours > 0) {
    const slaUsageRatio = ageHours / slaTargetHours;
    if (slaUsageRatio >= 1.0) {
      score += 30;
      factors.push("sla:breached(+30)");
    } else if (slaUsageRatio >= 0.75) {
      score += 20;
      factors.push("sla:near(+20)");
    } else if (slaUsageRatio >= 0.5) {
      score += 10;
      factors.push("sla:half(+10)");
    }
  }

  let level: PriorityLevel;
  if (score >= 75) level = "critical";
  else if (score >= 50) level = "high";
  else if (score >= 25) level = "medium";
  else level = "low";

  return { score, level, factors };
}

export function autoAssignPriority(messageType: string, sourceModule: string): PriorityLevel {
  if (messageType === "alert" && (sourceModule === "incident" || sourceModule === "risk")) return "critical";
  if (messageType === "approval") return "high";
  if (messageType === "task" && sourceModule === "compliance") return "medium";
  if (messageType === "announcement") return "low";
  return "medium";
}

export function slaDeadline(createdAt: Date, responseTargetHours: number): Date {
  return new Date(createdAt.getTime() + responseTargetHours * 60 * 60 * 1000);
}

// === DB-backed Functions ===

function mapSla( r: Record<string, unknown>): SlaPolicy {
  return {

    policyId: r.policy_id,

    messageType: r.message_type,

    priorityLevel: r.priority_level,

    responseTargetHours: r.response_target_hours,

    escalationHours: r.escalation_hours,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getSlaPolicy(
  tenantId: string,
  messageType: string,
  priorityLevel: PriorityLevel
): Promise<SlaPolicy | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_sla_policies
     WHERE message_type = $1 AND priority_level = $2 LIMIT 1`,
    [messageType, priorityLevel]
  );
  const row = getFirstRow(result)!;
  return row ? mapSla(row) : null;
}

export async function upsertSlaPolicy(
  tenantId: string,
  data: {
    messageType: string;
    priorityLevel: PriorityLevel;
    responseTargetHours: number;
    escalationHours: number;
  }
): Promise<SlaPolicy> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".inbox_sla_policies
      (message_type, priority_level, response_target_hours, escalation_hours)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (message_type, priority_level)
     DO UPDATE SET response_target_hours = EXCLUDED.response_target_hours,
                   escalation_hours = EXCLUDED.escalation_hours,
                   updated_at = NOW()
     RETURNING *`,
    [data.messageType, data.priorityLevel, data.responseTargetHours, data.escalationHours]
  );
  return mapSla(getFirstRow(result)!);
}

export async function getPriorityQueue(
  tenantId: string,
  userId: string
): Promise<PrioritizedItem[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT i.id, i.title, i.priority, i.recipient, i.message_type, i.created_at,
            i.metadata->>'sla_deadline' AS sla_deadline,
            (i.metadata->>'escalated')::boolean AS is_escalated
     FROM "${schema}".inbox_inbox i
     WHERE i.recipient = $1
       AND i.status = 'pending'
       AND i.deleted_at IS NULL
     ORDER BY
       CASE i.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       i.created_at ASC`,
    [userId]
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    priority: r.priority || "medium",
    score: 0,
    recipient: r.recipient,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
    slaDeadline: r.sla_deadline || null,
    isEscalated: r.is_escalated || false,
  }));
}

export async function escalateOverduePriorityItems(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();
  const result = await safeQuery(
    `UPDATE "${schema}".inbox_inbox
     SET priority = 'critical',
         metadata = metadata || '{"escalated": true}',
         updated_at = NOW()
     WHERE status = 'pending'
       AND deleted_at IS NULL
       AND (metadata->>'sla_deadline') IS NOT NULL
       AND (metadata->>'sla_deadline')::timestamptz < $1
       AND priority != 'critical'`,
    [now]
  );
  return result.rowCount ?? 0;
}

export async function recalculatePriorities(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const pending = await safeQuery(
    `SELECT id, message_type, metadata->>'source_module' AS source_module, created_at
     FROM "${schema}".inbox_inbox
     WHERE status = 'pending' AND deleted_at IS NULL`
  );
  let updated = 0;
  for (const row of pending.rows) {
    const ageHours = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
    const newPriority = autoAssignPriority(row.message_type, row.source_module || "");
    const { score } = computePriorityScore(row.message_type, row.source_module || "", ageHours, 24);
    await safeQuery(
      `UPDATE "${schema}".inbox_inbox
       SET priority = $1, metadata = metadata || $2, updated_at = NOW()
       WHERE id = $3`,
      [newPriority, JSON.stringify({ priority_score: score }), row.id]
    );
    updated++;
  }
  return updated;
}
