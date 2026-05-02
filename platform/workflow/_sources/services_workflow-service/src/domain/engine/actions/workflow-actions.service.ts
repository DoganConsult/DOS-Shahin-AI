// ============================================
// Canonical Workflow Actions — DOS (Patch 7 §2.3)
// Executable action nodes (api_call, send_email,
// webhook), notification step, workflow analytics
// @owner DOS
// @since 2026-03-30
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { toErrorMessage } from "../../../utils/http-error.util";
import type { GenericRow } from '@dos/types/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export const EXECUTABLE_ACTION_TIMEOUT_MS = 30_000;

// === Notification Integration ===

/**
 * Publish a notification event on the canonical event backbone. The
 * `notification-inbox-service` subscriber persists + dispatches. No direct
 * cross-service import — the workflow engine owns none of the notification
 * persistence surface.
 */
export async function executeNotificationStep(
  tenantId: string,
  stepConfig: { userId: string; type: string; title: string; body?: string; link?: string }
): Promise<void> {
  await publish('notification.created', tenantId, {
    userId: stepConfig.userId,
    type: stepConfig.type || 'workflow_notification',
    title: stepConfig.title,
    body: stepConfig.body,
    link: stepConfig.link,
  });
}

/** Execute api_call action: HTTP request. Config: url, method?, headers?, body? (no secrets in logs). */
export async function executeApiCallNode(
  _tenantId: string,
  config: Record<string, unknown>,
  _step?: any
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = config?.url;
  if (!url || typeof url !== 'string') return { ok: false, error: 'Missing config.url' };

  const method = (config.method || 'GET').toUpperCase();

  const headers: Record<string, string> = { ...(config.headers || {}) };
  if (config.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const body = config.body != null ? (typeof config.body === 'string' ? config.body : JSON.stringify(config.body)) : undefined;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), EXECUTABLE_ACTION_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (err: unknown) {
    return { ok: false, error: toErrorMessage(err) || 'Request failed' };
  } finally {
    clearTimeout(t);
  }
}

/** Execute send_email action. Config: to (email), subject, body; or toUserId (resolve email from DB). */
export async function executeSendEmailNode(
  tenantId: string,
  config: Record<string, unknown>,
  _step?: any
): Promise<{ ok: boolean; error?: string }> {
  let to = config?.to;
  if (!to && config?.toUserId) {
    const schema = tenantSchema(tenantId);
    const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT email FROM "${schema}".users WHERE user_id = $1 LIMIT 1`,
      [config.toUserId]
    ), { tenantId: tenantId, operation: 'query users' });

    to = (r as Record<string, unknown>).rows[0]?.email;
  }
  if (!to || typeof to !== 'string') return { ok: false, error: 'Missing config.to or config.toUserId' };
  const subject = config?.subject || 'Workflow notification';
  const body = config?.body || '';
  try {
    // Email dispatch is owned by notification-service, not the workflow engine.
    // Publish `notification.email.requested` — notification-service's subscriber
    // resolves SMTP transport and records success/failure downstream.
    await publish('notification.email.requested', tenantId, {
      to,
      subject: typeof subject === 'string' ? subject : String(subject),
      body: typeof body === 'string' ? body : String(body),
      source: 'workflow-engine',
    });
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: toErrorMessage(err) };
  }
}

/** Execute webhook action: POST to URL with payload. Config: url, payload? (no secrets in logs). */
export async function executeWebhookNode(
  _tenantId: string,
  config: Record<string, unknown>,
  _step?: any
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = config?.url;
  if (!url || typeof url !== 'string') return { ok: false, error: 'Missing config.url' };
  const payload = config?.payload != null ? config.payload : {};
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), EXECUTABLE_ACTION_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (err: unknown) {
    return { ok: false, error: toErrorMessage(err) || 'Webhook failed' };
  } finally {
    clearTimeout(t);
  }
}

// === Workflow Analytics ===

export async function getWorkflowAnalytics(tenantId: string, workflowId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const executions = await safeQuery(
    `SELECT execution_id, trigger_type, status, started_at, completed_at, step_log, is_simulation
     FROM "${schema}".workflow_instances
     WHERE workflow_id = $1
     ORDER BY started_at DESC`,
    [workflowId]
  );

  const rows = executions.rows;
  const realExecs = rows.filter((r: GenericRow) => !r.is_simulation);
  const simExecs = rows.filter((r: GenericRow) => r.is_simulation);

  // Compute avg duration
  const durations = realExecs
    .filter((r: GenericRow) => r.completed_at && r.started_at)
    .map((r: GenericRow) => new Date(r.completed_at).getTime() - new Date(r.started_at).getTime());
  const avgDuration = durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0;

  return {
    workflowId,
    totalExecutions: realExecs.length,
    totalSimulations: simExecs.length,
    byStatus: {
      completed: realExecs.filter((r: GenericRow) => r.status === 'completed').length,
      failed: realExecs.filter((r: GenericRow) => r.status === 'failed').length,
      running: realExecs.filter((r: GenericRow) => r.status === 'running').length,
    },
    avgDurationMs: Math.round(avgDuration),
    recentExecutions: rows.slice(0, 10),
  };
}
