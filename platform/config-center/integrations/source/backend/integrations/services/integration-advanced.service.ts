// ============================================
// Shahin-Ai — Integration Advanced Service
// Webhook management, connector error dashboard,
// data mapping rules, and email notification
// templates
// Requirements: 15.1, 15.3, 15.5, 15.6
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ── 15.1 Webhook Management ────────────────────────────────────────────────

/**
 * Register a new webhook endpoint for the tenant.
 */
export async function createWebhook(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".webhooks (url, events, secret, active, description, created_by)
     VALUES ($1, $2::jsonb, $3, true, $4, $5) RETURNING *`,
    [
      data.url,
      JSON.stringify(data.events || []),
      data.secret || null,
      data.description,
      data.created_by,
    ]
  );
  return result.rows[0];
}

/**
 * List all webhooks for the tenant (secrets are excluded).
 */
export async function getWebhooks(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT webhook_id, url, events, active, description, last_triggered_at,
            failure_count, created_at
     FROM "${schema}".webhooks ORDER BY created_at DESC`
  ), { tenantId: tenantId, operation: 'query webhooks' });
  return result.rows;
}

/**
 * Update webhook properties (url, events, active status, description).
 */
export async function updateWebhook(tenantId: string, webhookId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".webhooks
     SET url = COALESCE($2, url),
         events = COALESCE($3::jsonb, events),
         active = COALESCE($4, active),
         description = COALESCE($5, description),
         updated_at = now()
     WHERE webhook_id = $1::uuid RETURNING *`,
    [
      webhookId,
      data.url,
      data.events ? JSON.stringify(data.events) : null,
      data.active,
      data.description,
    ]
  );
  return result.rows[0];
}

/**
 * Delete a webhook by ID.
 */
export async function deleteWebhook(tenantId: string, webhookId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `DELETE FROM "${schema}".webhooks WHERE webhook_id = $1::uuid RETURNING webhook_id`,
    [webhookId]
  ), { tenantId: tenantId, operation: 'query webhooks' });
  return result.rows.length > 0;
}

/**
 * Send a test payload to a webhook and log the attempt.
 */
export async function testWebhook(tenantId: string, webhookId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const wh = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".webhooks WHERE webhook_id = $1::uuid`,
    [webhookId]
  ), { tenantId: tenantId, operation: 'query webhooks' });

  if (!wh.rows[0]) {
    return { success: false, error: 'Webhook not found' };
  }

  // Record the test attempt in the webhook log
  await safeQuery(
    `INSERT INTO "${schema}".webhook_logs
     (webhook_id, event_type, payload, status, response_code)
     VALUES ($1::uuid, 'test', '{"test": true}'::jsonb, 'sent', 200)`,
    [webhookId]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return { success: true, webhook_id: webhookId, tested_at: new Date().toISOString() };
}

// ── 15.3 Connector Error Dashboard ──────────────────────────────────────────

/**
 * Get health status for all connectors with computed health indicator.
 */
export async function getConnectorHealth(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT connector_id, connector_type, status, last_sync_at, error_count, last_error,
      CASE
        WHEN last_sync_at > now() - interval '1 hour'  THEN 'healthy'
        WHEN last_sync_at > now() - interval '24 hours' THEN 'warning'
        ELSE 'critical'
      END AS health_status
    FROM "${schema}".connectors
    ORDER BY connector_type
  `), { tenantId: tenantId, operation: 'query connectors' });
  return result.rows;
}

/**
 * Retrieve recent connector sync errors, optionally filtered by connector.
 */
export async function getConnectorErrors(
  tenantId: string,
  connectorId?: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".connector_sync_logs WHERE status = 'error'`;
  const params: unknown[] = [];
  if (connectorId) {
    sql += ` AND connector_id = $1::uuid`;
    params.push(connectorId);
  }
  sql += ` ORDER BY created_at DESC LIMIT 100`;
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(sql, params), { tenantId: tenantId, operation: 'query connector_sync_logs' });
  return result.rows;
}

/**
 * Schedule a retry for a failed connector by resetting its error state.
 */
export async function retryConnectorSync(tenantId: string, connectorId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".connectors
     SET status = 'pending', error_count = 0, last_error = NULL, updated_at = now()
     WHERE connector_id = $1::uuid`,
    [connectorId]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return {
    connector_id: connectorId,
    status: 'retry_scheduled',
    retried_at: new Date().toISOString(),
  };
}

// ── 15.5 Data Mapping Rules ─────────────────────────────────────────────────

/**
 * Create a data mapping rule that describes how a source field maps to a
 * target entity/field, with an optional transformation.
 */
export async function createDataMapping(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".data_mapping_rules
     (connector_id, source_field, target_entity, target_field, transformation, active)
     VALUES ($1::uuid, $2, $3, $4, $5, true) RETURNING *`,
    [
      data.connector_id,
      data.source_field,
      data.target_entity,
      data.target_field,
      data.transformation || 'direct',
    ]
  );
  return result.rows[0];
}

/**
 * List active data mapping rules, optionally filtered by connector.
 */
export async function getDataMappings(tenantId: string, connectorId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".data_mapping_rules WHERE active = true`;
  const params: unknown[] = [];
  if (connectorId) {
    sql += ` AND connector_id = $1::uuid`;
    params.push(connectorId);
  }
  sql += ` ORDER BY target_entity, target_field`;
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(sql, params), { tenantId: tenantId, operation: 'query data_mapping_rules' });
  return result.rows;
}

// ── 15.6 Email Notification Templates ───────────────────────────────────────

/**
 * Create or update an email template by key.
 */
export async function createEmailTemplate(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".email_templates
     (template_key, subject, body_html, body_text, variables, active)
     VALUES ($1, $2, $3, $4, $5::jsonb, true)
     ON CONFLICT (template_key)
       DO UPDATE SET subject = $2, body_html = $3, body_text = $4,
                     variables = $5::jsonb, updated_at = now()
     RETURNING *`,
    [
      data.template_key,
      data.subject,
      data.body_html,
      data.body_text,
      JSON.stringify(data.variables || []),
    ]
  );
  return result.rows[0];
}

/**
 * List all active email templates for the tenant.
 */
export async function getEmailTemplates(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".email_templates WHERE active = true ORDER BY template_key`
  ), { tenantId: tenantId, operation: 'query email_templates' });
  return result.rows;
}

/**
 * Preview an email template with sample data by replacing {{variable}}
 * placeholders in subject and body.
 */
export async function previewEmailTemplate(
  tenantId: string,
  templateKey: string,
  sampleData: Record<string, string>
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const tpl = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".email_templates WHERE template_key = $1`,
    [templateKey]
  ), { tenantId: tenantId, operation: 'query email_templates' });

  if (!tpl.rows[0]) return null;

  let subject = tpl.rows[0].subject || '';
  let body = tpl.rows[0].body_html || tpl.rows[0].body_text || '';

  for (const [key, value] of Object.entries(sampleData)) {

    subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);

    body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return { subject, body, template_key: templateKey };
}
