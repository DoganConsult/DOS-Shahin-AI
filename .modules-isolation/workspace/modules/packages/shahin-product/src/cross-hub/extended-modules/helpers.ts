// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — AGRC-OS Cross-Hub Integration Helpers
// Shared utilities used by all hub subscriber files.
// ============================================

import { query, safeQuery, tenantSchema } from '@dos/db';
import { createProcessTask, type ProcessTaskType } from '@dos/platform-core/workflows';
import { logger, recordAudit } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/module-sdk';
import { eventBus, type PlatformEvent } from '@dos/platform-core/events';
import { getFirstRow } from '@dos/db';

// Re-export types/functions that hub files need
export { query, safeQuery, tenantSchema };
export { createProcessTask, type ProcessTaskType };
export { recordAudit };
export { eventBus };
export type { PlatformEvent };

/** Subscriber registration function signature used by all hub files. */
export type SubFn = (eventType: string, name: string, handler: (e: PlatformEvent) => Promise<void>) => void;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enterprise-upgraded safeCreateTask: auto-routes through process orchestration
 * based on entityType → role mapping. Falls back to legacy task board if
 * enterprise routing fails or entityType is unmapped.
 */
export async function safeCreateTask(tenantId: string, data: {
  title: string; description?: string; assignedTo?: string;
  dueDate?: string; entityType?: string; entityId?: string;
}): Promise<string | null> {
  // Auto-upgrade: route through enterprise orchestration by entity type
  const ENTITY_ROLE_MAP: Record<string, { taskType: ProcessTaskType; role: string }> = {
    risk:          { taskType: 'risk_assessment',   role: 'risk_owner' },
    control:       { taskType: 'control_review',    role: 'control_owner' },
    policy:        { taskType: 'policy_creation',   role: 'policy_reviewer' },
    evidence:      { taskType: 'evidence_request',  role: 'evidence_owner' },
    audit:         { taskType: 'audit_response',    role: 'audit_manager' },
    audit_finding: { taskType: 'audit_response',    role: 'auditee_owner' },
    incident:      { taskType: 'incident_response', role: 'incident_owner' },
    vendor:        { taskType: 'verification',      role: 'vendor_assessor' },
    framework:     { taskType: 'control_review',    role: 'compliance_analyst' },
    team:          { taskType: 'verification',      role: 'governance_manager' },
    bcp:           { taskType: 'verification',      role: 'bcp_coordinator' },
    ccm:           { taskType: 'evidence_request',  role: 'evidence_owner' },
    connector:     { taskType: 'verification',      role: 'compliance_analyst' },
    privacy:       { taskType: 'verification',      role: 'compliance_analyst' },
    remediation:   { taskType: 'remediation',       role: 'compliance_analyst' },
  };

  const mapping = data.entityType ? ENTITY_ROLE_MAP[data.entityType] : null;
  if (mapping) {
    try {
      const dueHours = data.dueDate
        ? Math.max(24, Math.round((new Date(data.dueDate).getTime() - Date.now()) / 3600000))
        : 168;
      const task = await createProcessTask(tenantId, {
        title: data.title,
        description: data.description,
        taskType: mapping.taskType,
        priority: data.title.includes('[URGENT]') ? 'high' as const : 'medium' as const,
        entityType: data.entityType,
        entityId: data.entityId,
        assigneeRole: mapping.role,
        dueInHours: dueHours,
        triggerSource: 'xhub-auto-upgrade',
      });
      return task?.taskId || null;
    } catch (err: unknown) {
      logger.warn('[helpers] Enterprise task routing failed, falling back to legacy', { entityType: data.entityType, error: toErrorMessage(err) });
    }
  }

  await eventBus.publish({
    eventType: 'task.creation_requested' as any,
    tenantId,
    sourceService: 'xhub-legacy-task',
    severity: 'info',
    payload: data as any,
  }).catch(() => {});
  return null;
}

/**
 * Enterprise-role-aware task creation: routes through process orchestration
 * with RACI resolution + SLA. Falls back to legacy safeCreateTask if
 * process_tasks infrastructure isn't ready.
 */
export async function enterpriseCreateTask(tenantId: string, data: {
  title: string;
  description?: string;
  taskType: ProcessTaskType;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  entityType?: string;
  entityId?: string;
  assigneeRole: string;
  dueInHours?: number;
  triggerSource?: string;
}): Promise<string | null> {
  try {
    const task = await createProcessTask(tenantId, {
      title: data.title,
      description: data.description,
      taskType: data.taskType,
      priority: data.priority || 'medium',
      entityType: data.entityType,
      entityId: data.entityId,
      assigneeRole: data.assigneeRole,
      dueInHours: data.dueInHours || 168, // 7 days default
      triggerSource: data.triggerSource || 'cross-hub-integration',
    });
    return task?.taskId || null;
  } catch (err: unknown) {
    logger.warn('[helpers] Process orchestration unavailable, falling back to legacy task board', { taskType: data.taskType, error: toErrorMessage(err) });
    return safeCreateTask(tenantId, {
      title: data.title,
      description: data.description,
      entityType: data.entityType,
      entityId: data.entityId,
      dueDate: daysFromNow(Math.ceil((data.dueInHours || 168) / 24)),
    });
  }
}

export async function safeNotifyAdmins(tenantId: string, notif: {
  type: string; title: string; body: string; link: string;
}): Promise<void> {
  await eventBus.publish({
    eventType: 'notification.dispatch_requested' as any,
    tenantId,
    sourceService: 'xhub-notify',
    severity: 'info',
    payload: { target: 'admins', notification: notif } as unknown,
  }).catch(() => {});
}

export async function safeCreateActionItem(tenantId: string, data: {
  title: string; description?: string; sourceType: string; sourceId: string;
  assignedTo: string; deadline?: string;
}): Promise<string | null> {
  await eventBus.publish({
    eventType: 'action.creation_requested' as any,
    tenantId,
    sourceService: 'xhub-action',
    severity: 'info',
    payload: data as any,
  }).catch(() => {});
  return null;
}

export async function safePublish(event: PlatformEvent): Promise<void> {
  try { await eventBus.publish(event); } catch (err: unknown) { logger.warn('[helpers] safePublish failed', { eventType: event.eventType, error: toErrorMessage(err) }); }
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getRiskOwner(tenantId: string, riskId: string): Promise<string | null> {
  try {
    const schema = tenantSchema(tenantId);
    const r = await safeQuery(`SELECT owner FROM "${schema}".risks WHERE risk_id=$1`, [riskId]);
    return getFirstRow(r)?.owner || null;
  } catch (err: unknown) {
    logger.warn('[helpers] getRiskOwner query failed', { riskId, error: toErrorMessage(err) });
    return null;
  }
}

export async function getFirstAdmin(tenantId: string): Promise<string> {
  try {
    const schema = tenantSchema(tenantId);
    const r = await safeQuery(
      `SELECT user_id FROM "${schema}".users WHERE role IN ('admin','owner') LIMIT 1`,
      []
    );
    return getFirstRow(r)?.user_id || 'agrc-os';
  } catch (err: unknown) {
    logger.warn('[helpers] getFirstAdmin query failed', { tenantId, error: toErrorMessage(err) });
    return 'agrc-os';
  }
}
