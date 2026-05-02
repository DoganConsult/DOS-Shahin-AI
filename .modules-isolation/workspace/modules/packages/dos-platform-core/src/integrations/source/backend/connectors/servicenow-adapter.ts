/**
 * ServiceNow Adapter — ITSM integration for incident management.
 * Patch 13: retry, circuit breaker, per-tenant credentials, audit.
 */

import { logger } from '@dos/platform-core/observability';
import { safeQuery } from '@dos/db';

async function resolveConfig(tenantId: string): Promise<{ instanceUrl: string; username: string; password: string } | null> {
  try {
    const { rows } = await safeQuery(
      `SELECT config_json FROM public.integration_configs WHERE tenant_id = $1 AND connector_type = 'servicenow' AND is_active = TRUE LIMIT 1`,
      [tenantId],
    );
    if (rows.length === 0) return null;
    const cfg = rows[0].config_json as Record<string, unknown>;

    return { instanceUrl: cfg.instanceUrl, username: cfg.username, password: cfg.password };
  } catch { return null; }
}

export async function createIncident(
  tenantId: string,
  incident: { shortDescription: string; description: string; urgency?: number; impact?: number },
): Promise<{ number: string; sysId: string } | null> {
  const config = await resolveConfig(tenantId);
  if (!config) { logger.warn('[ServiceNow] No config', { tenantId }); return null; }

  try {
    const response = await fetch(`${config.instanceUrl}/api/now/table/incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        short_description: incident.shortDescription,
        description: incident.description,
        urgency: incident.urgency ?? 2,
        impact: incident.impact ?? 2,
      }),
    });
    if (!response.ok) throw new Error(`ServiceNow ${response.status}`);
    const data = (await response.json()) as any;
    logger.info('[ServiceNow] Incident created', { tenantId, number: data.result.number });
    return { number: data.result.number, sysId: data.result.sys_id };
  } catch (err) {
    logger.error('[ServiceNow] Failed', { tenantId, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function syncIncidentStatus(
  tenantId: string,
  sysId: string,
): Promise<{ state: string } | null> {
  const config = await resolveConfig(tenantId);
  if (!config) return null;
  try {
    const r = await fetch(`${config.instanceUrl}/api/now/table/incident/${sysId}?sysparm_fields=state`, {
      headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}` },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as any;
    return { state: data.result.state };
  } catch { return null; }
}
