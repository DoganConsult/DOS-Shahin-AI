// ============================================================
// AGRC-OS Unified Squad Registry Service
// Single roster for all ecosystem participants across deployments
// ============================================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit as _recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import type { SquadMember, DeploymentMode, ParticipantStatus } from '@dos/types/agent';
import { getFirstRow } from '@dos/db';

// ── Register Participant ───────────────────────────────────────────────────
export async function registerParticipant(tenantId: string, participant: {
  userId: string;
  displayNameEn: string;
  displayNameAr: string;
  role: string;
  deploymentMode?: DeploymentMode;
  capabilities?: string[];
  isAgent?: boolean;
  specialization?: string;
  deliveryChannel?: 'websocket' | 'webhook' | 'polling';
  webhookUrl?: string;
}): Promise<SquadMember> {
  const schema = tenantSchema(tenantId);
  const mode = participant.deploymentMode || 'saas';

  // Log warning if deployment mode undetermined
  if (!participant.deploymentMode) {
    await eventBus.publish(({
          tenantId, eventType: 'unified_squad.deployment_mode_defaulted',
          severity: 'info', entityId: participant.userId,
          payload: { message: `Deployment mode defaulted to saas for ${participant.userId}` },
        } as any));
  }

  const res = await safeQuery(
    `INSERT INTO "${schema}".unified_squad_members
      (user_id, display_name_en, display_name_ar, role, deployment_mode, is_agent,
       capabilities, specialization, delivery_channel, webhook_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id) DO UPDATE SET
       display_name_en = EXCLUDED.display_name_en,
       display_name_ar = EXCLUDED.display_name_ar,
       role = EXCLUDED.role,
       deployment_mode = EXCLUDED.deployment_mode,
       capabilities = EXCLUDED.capabilities,
       specialization = EXCLUDED.specialization,
       delivery_channel = EXCLUDED.delivery_channel,
       webhook_url = EXCLUDED.webhook_url,
       updated_at = NOW()
     RETURNING *`,
    [
      participant.userId, participant.displayNameEn, participant.displayNameAr,
      participant.role, mode, participant.isAgent ?? false,
      JSON.stringify(participant.capabilities || []), participant.specialization || null,
      participant.deliveryChannel || 'websocket', participant.webhookUrl || null,
    ]
  );

  return mapRow(getFirstRow(res));
}

// ── List Participants ──────────────────────────────────────────────────────
export async function listParticipants(tenantId: string, filters?: {
  deploymentMode?: string; role?: string; isAgent?: boolean; status?: string;
}): Promise<SquadMember[]> {
  const schema = tenantSchema(tenantId);
  const conds: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.deploymentMode) { conds.push(`deployment_mode = $${idx++}`); params.push(filters.deploymentMode); }
  if (filters?.role) { conds.push(`role = $${idx++}`); params.push(filters.role); }
  if (filters?.isAgent !== undefined) { conds.push(`is_agent = $${idx++}`); params.push(filters.isAgent); }
  if (filters?.status) { conds.push(`current_status = $${idx++}`); params.push(filters.status); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const res = await safeQuery(
    `SELECT * FROM "${schema}".unified_squad_members ${where} ORDER BY display_name_en`, params
  );
  return res.rows.map(mapRow);
}

// ── Sync Remote Roster ─────────────────────────────────────────────────────
export async function syncRemoteRoster(tenantId: string, instanceId: string, roster: Array<{
  userId: string; displayNameEn: string; displayNameAr: string; role: string;
  capabilities?: string[]; isAgent?: boolean;
}>): Promise<{ synced: number; created: number; updated: number }> {
  let created = 0, updated = 0;
  for (const p of roster) {
    const schema = tenantSchema(tenantId);
    const existing = await safeQuery(
      `SELECT member_id FROM "${schema}".unified_squad_members WHERE user_id = $1`, [p.userId]
    );
    const mode: DeploymentMode = instanceId.startsWith('reseller') ? 'reseller' : 'on_prem_sdk';
    await registerParticipant(tenantId, { ...p, deploymentMode: mode, deliveryChannel: mode === 'reseller' ? 'polling' : 'webhook' });
    if (existing.rows.length) updated++; else created++;
  }
  return { synced: roster.length, created, updated };
}

// ── Assign Task Cross-Deployment ───────────────────────────────────────────
export async function assignTask(tenantId: string, taskId: string, assigneeUserId: string): Promise<{
  delivered: boolean; channel: string; queuedForLater: boolean;
}> {
      throw new Error("Not implemented: Stubbed during microservice extraction");
}

// ── Queue Assignment (disconnected instance) ───────────────────────────────
export async function queueAssignment(tenantId: string, instanceId: string, assignment: {
  assigneeUserId: string; taskId: string; payload?: Record<string, unknown>;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".pending_assignment_queue (instance_id, assignee_user_id, task_id, payload)
     VALUES ($1,$2,$3,$4)`,
    [instanceId, assignment.assigneeUserId, assignment.taskId, JSON.stringify(assignment.payload || {})]
  );
}

// ── Flush Queued Assignments ───────────────────────────────────────────────
export async function flushQueuedAssignments(tenantId: string, instanceId: string): Promise<{
  flushed: number; delivered: number; failed: number;
}> {
  const schema = tenantSchema(tenantId);
  const pending = await safeQuery(
    `SELECT * FROM "${schema}".pending_assignment_queue WHERE instance_id = $1 AND status = 'queued' ORDER BY created_at`,
    [instanceId]
  );

  let delivered = 0, failed = 0;
  for (const row of pending.rows) {
    try {
      await assignTask(tenantId, row.task_id, row.assignee_user_id);
      await safeQuery(
        `UPDATE "${schema}".pending_assignment_queue SET status = 'delivered', delivered_at = NOW() WHERE queue_id = $1`,
        [row.queue_id]
      );
      delivered++;
    } catch {
      await safeQuery(
        `UPDATE "${schema}".pending_assignment_queue SET status = 'failed', retry_count = retry_count + 1 WHERE queue_id = $1`,
        [row.queue_id]
      );
      failed++;
    }
  }
  return { flushed: pending.rows.length, delivered, failed };
}

// ── Update Participant Status ──────────────────────────────────────────────
export async function updateParticipantStatus(tenantId: string, userId: string, status: ParticipantStatus): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".unified_squad_members SET current_status = $1, last_activity_at = NOW(), updated_at = NOW() WHERE user_id = $2`,
    [status, userId]
  );
  await eventBus.publish(({
      tenantId, eventType: 'unified_squad.status_changed', severity: 'info',
      entityId: userId, payload: { userId, newStatus: status },
    } as any));
}

// ── Row Mapper ─────────────────────────────────────────────────────────────
function mapRow(row: Record<string, unknown>): SquadMember {
  return {
    memberId: row.member_id,
    userId: row.user_id,
    displayNameEn: row.display_name_en,
    displayNameAr: row.display_name_ar,

    role: row.role,
    deploymentMode: row.deployment_mode,
    isAgent: row.is_agent,

    capabilities: row.capabilities || [],
    specialization: row.specialization || undefined,
    currentStatus: row.current_status,
    deliveryChannel: row.delivery_channel,
    webhookUrl: row.webhook_url || undefined,
    taskQueue: row.task_queue || [],

    lastActivityAt: row.last_activity_at?.toISOString?.() || row.last_activity_at,
  };
}
