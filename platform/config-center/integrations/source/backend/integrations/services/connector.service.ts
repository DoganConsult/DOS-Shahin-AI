import { randomUUID } from 'crypto';
import { authenticate as _authenticate } from '../ports/auth.port';
import { logger } from '../ports/logger.port';
// ============================================
// Shahin — Connector Service
// CRUD for connector configs, scheduled execution
// via job-scheduler, health dashboard, and
// execution logging.
// Requirements: 6.2, 6.3, 6.5, 6.6, 6.7
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { registerJob } from '../ports/platform.port';
import { eventBus } from '../ports/events.port';
import { BaseAdapter } from '../../../connectors/base.adapter';
import { M365Connector } from '../../../connectors/m365.connector';
import { ERPAdapter } from '../../../connectors/erp.adapter';
import { IAMAdapter } from '../../../connectors/iam.adapter';
import { ITSMAdapter } from '../../../connectors/itsm.adapter';
import { SIEMAdapter } from '../../../connectors/siem.adapter';
import { VulnAdapter } from '../../../connectors/vuln.adapter';
import { CMDBAdapter } from '../../../connectors/cmdb.adapter';
import {
  createConnection as createTypedConnection,
  syncConnection,
} from './connector-sync.service';
import {
  encryptCredentialObject,
  decryptCredentialObject,
} from '../ports/platform.port';
import { toErrorMessage } from '@dos/module-sdk';
import type {
  ConnectorConfig,
  ConnectorHealth,
  SourceSystemType,
  EvidenceSubmission,
} from '@dos/types';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

// ============================================
// Source system type → typed connection mapping
// ============================================

const SOURCE_TO_TYPED: Record<string, { type: string; typeColumn: string }> = {
  siem:       { type: 'siem',         typeColumn: 'siem_type' },
  iam:        { type: 'iam',          typeColumn: 'iam_type' },
  itsm:       { type: 'itsm',         typeColumn: 'itsm_type' },
  cmdb:       { type: 'cmdb',         typeColumn: 'cmdb_type' },
  vuln:       { type: 'vuln_scanner',  typeColumn: 'scanner_type' },
  outlook:    { type: 'm365',         typeColumn: 'tenant_azure_id' },
  sharepoint: { type: 'm365',         typeColumn: 'tenant_azure_id' },
  onedrive:   { type: 'm365',         typeColumn: 'tenant_azure_id' },
};

// ============================================
// Adapter factory
// ============================================

/**
 * Resolve the correct adapter instance for a given source system type.
 * Returns a BaseAdapter subclass ready for authenticate → extract → map.
 */
export function resolveAdapter(sourceSystemType: SourceSystemType): BaseAdapter {
  switch (sourceSystemType) {
    case 'siem':
    case 'splunk':
    case 'elastic':
    case 'crowdstrike':
      return new SIEMAdapter();
    case 'iam':
      return new IAMAdapter();
    case 'itsm':
    case 'servicenow':
    case 'jira':
      return new ITSMAdapter();
    case 'cmdb':
      return new CMDBAdapter();
    case 'vuln':
      return new VulnAdapter();
    case 'outlook':
    case 'sharepoint':
    case 'onedrive':
    case 'teams':
      return new M365Connector();
    default:
      return new ERPAdapter();
  }
}

// ============================================
// Test Connection — dry-run validation
// ============================================
/**
 * Test a connector configuration without persisting anything.
 * Instantiates the adapter, attempts authenticate(), and measures latency.
 */
export async function testConnection(
  data: { sourceSystemType: SourceSystemType; credentials: Record<string, string>; platform?: string }
): Promise<{ valid: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const adapter = resolveAdapter(data.sourceSystemType);
    const config: ConnectorConfig = {
      connectorId: 'test-connection',
      tenantId: 'test',
      sourceSystemType: data.sourceSystemType,
      authMethod: 'api_key',
      credentials: { ...data.credentials, platform: data.platform || data.credentials['platform'] || '' },
      schedule: '',
      retryPolicy: { maxRetries: 0, backoffMs: 0 },
      fieldMapping: {},
      controlMappings: [],
    };

    // Race against a 10s timeout
    await Promise.race([
      adapter.authenticate(config),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out (10s)')), 10_000)),
    ]);

    return { valid: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    return { valid: false, latencyMs: Date.now() - start, error: toErrorMessage(err) };
  }
}

// ============================================
// CRUD — connector_configs table
// ============================================

/** List all connector configs for a tenant */
export async function getConnectors(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_configs ORDER BY created_at DESC`
  );
  return result.rows;
}

/** Create a new connector config and register its scheduled job */
export async function createConnector(
  tenantId: string,
  config: {
    sourceSystemType: SourceSystemType;
    authMethod: string;
    credentials?: Record<string, string>;
    schedule?: string;
    retryPolicy?: { maxRetries: number; backoffMs: number };
    fieldMapping?: Record<string, string>;
    controlMappings?: string[];
  }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const retryPolicy = config.retryPolicy ?? { maxRetries: 3, backoffMs: 5000 };
  const fieldMapping = config.fieldMapping ?? {};
  const controlMappings = config.controlMappings ?? [];
  const schedule = config.schedule ?? '0 2 * * *'; // default: daily at 2 AM

  // Bridge: also create a typed connection row if applicable
  let typedConnectionId: string | null = null;
  let typedConnectionType: string | null = null;
  const mapping = SOURCE_TO_TYPED[config.sourceSystemType];

  if (mapping && config.credentials) {
    try {
      const typedData: Record<string, unknown> = {
        name: (config as Record<string, unknown>).name || `${config.sourceSystemType} connector`,
        endpoint_url: (config as Record<string, unknown>).endpoint || '',
        auth_method: config.authMethod,
        credentials_encrypted: JSON.stringify(config.credentials),
      };
      // Set the type column (siem_type, iam_type, etc.)
      if (mapping.typeColumn !== 'tenant_azure_id') {
        typedData[mapping.typeColumn] = config.credentials['platform'] || 'generic_rest';
      } else {
        typedData['tenant_azure_id'] = config.credentials['tenantId'] || '';
        typedData['client_id'] = config.credentials['clientId'] || '';
      }

      const typedRow = await createTypedConnection(tenantId, (mapping as any).type as string, typedData);
      typedConnectionId = typedRow.connection_id;
      typedConnectionType = mapping.type;
    } catch (err: unknown) {
      logger.warn(`[ConnectorService] Failed to create typed connection: ${toErrorMessage(err)}`);
    }
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".connector_configs
       (name, source_system_type, auth_method, credentials_encrypted, endpoint_url, platform, schedule,
        retry_policy, field_mapping, control_mappings, typed_connection_id, typed_connection_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
     RETURNING *`,
    [
      (config as Record<string, unknown>).name || `${config.sourceSystemType} connector`,
      config.sourceSystemType,
      config.authMethod,
      config.credentials ? encryptCredentialObject(config.credentials) : null,
      (config as Record<string, unknown>).endpoint || null,
      config.credentials?.['platform'] || null,
      schedule,
      JSON.stringify(retryPolicy),
      JSON.stringify(fieldMapping),
      controlMappings,
      typedConnectionId,
      typedConnectionType,
    ]
  );

  const row = getFirstRow(result)!;

  // Register a scheduled job for this connector
  await registerConnectorJob(tenantId, row.connector_id, schedule);

  // Publish connector connected event
  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'connector.connected',
      tenantId, sourceService: 'connector-service',
      entityType: config.sourceSystemType, entityId: row.connector_id,
      severity: 'info',
      payload: { sourceSystemType: config.sourceSystemType, schedule },
    } as any)), { tenantId, operation: 'eventBus:connector.connected' });

  return row;
}

// ============================================
// Health — per-connector and dashboard
// ============================================

/** Get health status for a single connector */
export async function getConnectorHealth(
  tenantId: string,
  connectorId: string
): Promise<ConnectorHealth> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT connector_id, source_system_type, status, last_success_at, failure_count, created_at
     FROM "${schema}".connector_configs
     WHERE connector_id = $1`,
    [connectorId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Connector not found'), { statusCode: 404 });
  return toConnectorHealth(result.rows[0]);
}

/** Get health status for all connectors (dashboard view) */
export async function getHealthDashboard(tenantId: string): Promise<ConnectorHealth[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT connector_id, source_system_type, status, last_success_at, failure_count, created_at
     FROM "${schema}".connector_configs
     ORDER BY created_at DESC`
  );
  return result.rows.map(toConnectorHealth);
}

function toConnectorHealth(row: GenericRow): ConnectorHealth {
  const lastSuccessAt = row.last_success_at ? new Date(row.last_success_at).toISOString() : null;
  let dataFreshnessMinutes = -1;
  if (lastSuccessAt) {
    dataFreshnessMinutes = Math.round(
      (Date.now() - new Date(lastSuccessAt).getTime()) / 60_000
    );
  }

  // Derive status from failure_count if DB status is just 'active'
  let status: ConnectorHealth['status'];
  if (row.failure_count === 0) {
    status = 'healthy';
  } else if (row.failure_count <= 2) {
    status = 'degraded';
  } else {
    status = 'failed';
  }

  return {
    connectorId: row.connector_id,
    status,
    lastSuccessAt,
    failureCount: row.failure_count ?? 0,
    dataFreshnessMinutes,
  };
}

// ============================================
// Execution — run a connector and log results
// ============================================

/**
 * Execute a connector: authenticate → extract → map → submit evidence → log execution.
 * Logs the execution to the connector_executions table regardless of success/failure.
 */
export async function runConnector(
  tenantId: string,
  connectorId: string
): Promise<{ executionId: string; recordsCollected: number; submissions: EvidenceSubmission[] }> {
  const schema = tenantSchema(tenantId);
  const configResult = await safeQuery(
    `SELECT * FROM "${schema}".connector_configs WHERE connector_id = $1 AND status = 'active'`,
    [connectorId]
  );
  if (configResult.rows.length === 0) throw Object.assign(new Error('Active connector not found'), { statusCode: 404 });

  const row = configResult.rows[0];
  const credentials = row.credentials_encrypted
    ? decryptCredentialObject(row.credentials_encrypted)
    : {};
  const connectorConfig: ConnectorConfig = {
    connectorId,
    tenantId,
    sourceSystemType: row.source_system_type,
    authMethod: row.auth_method,
    credentials: { ...credentials, platform: row.platform || credentials['platform'] || '' },
    schedule: row.schedule,
    retryPolicy: row.retry_policy || { maxRetries: 3, backoffMs: 5000 },
    fieldMapping: row.field_mapping || {},
    controlMappings: row.control_mappings || [],
  };

  const executionStart = new Date();
  const executionResult = await safeQuery(
    `INSERT INTO "${schema}".connector_executions (connector_id, status, started_at) VALUES ($1, 'running', NOW()) RETURNING execution_id`,
    [connectorId]
  );
  const executionId: string = executionResult.rows[0]?.execution_id || randomUUID();

  let recordsCollected = 0;
  let submissions: EvidenceSubmission[] = [];
  let finalStatus = 'success';
  let errorMessage: string | null = null;

  try {
    const adapter = resolveAdapter(row.source_system_type);
    await adapter.authenticate(connectorConfig);
    const extraction = await adapter.extract(connectorConfig);
    submissions = adapter.map(extraction.records, row.field_mapping || {});
    recordsCollected = extraction.records.length;

    await safeQuery(
      `UPDATE "${schema}".connector_configs SET last_success_at = NOW(), failure_count = 0, updated_at = NOW() WHERE connector_id = $1`,
      [connectorId]
    );
  } catch (err: unknown) {
    finalStatus = 'failure';
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[ConnectorService] runConnector failed: ${errorMessage}`, { tenantId, connectorId });

    await safeQuery(
      `UPDATE "${schema}".connector_configs SET failure_count = failure_count + 1, updated_at = NOW() WHERE connector_id = $1`,
      [connectorId]
    );
  }

  await safeQuery(
    `UPDATE "${schema}".connector_executions
     SET status = $1, records_collected = $2, error_message = $3, completed_at = NOW(), duration_ms = $4
     WHERE execution_id = $5`,
    [finalStatus, recordsCollected, errorMessage, Date.now() - executionStart.getTime(), executionId]
  ).catch(() => {});

  swallow(EC.EVENT_BUS, eventBus.publish(({
    eventType: finalStatus === 'success' ? 'connector.sync_completed' : 'connector.sync_failed',
    tenantId, sourceService: 'connector-service',
    entityType: row.source_system_type, entityId: connectorId,
    severity: finalStatus === 'success' ? 'info' : 'warning',
    payload: { connectorId, recordsCollected, executionId, error: errorMessage },
  } as any)), { tenantId, operation: 'eventBus:connector.sync' });

  if (finalStatus === 'failure' && errorMessage) {
    throw new Error(errorMessage);
  }

  return { executionId, recordsCollected, submissions };
}

// ============================================
// Execution history
// ============================================

/** Get execution history for a connector */
export async function getExecutions(
  tenantId: string,
  connectorId: string,
  limit: number = 50
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".connector_executions
     WHERE connector_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [connectorId, limit]
  );
  return result.rows;
}

// ============================================
// Status Lifecycle Engine
// ============================================

const CONNECTOR_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:    ['testing', 'active', 'archived'],
  testing:  ['active', 'error', 'draft'],
  active:   ['paused', 'disabled', 'error'],
  paused:   ['active', 'disabled', 'archived'],
  disabled: ['active', 'archived'],
  error:    ['testing', 'active', 'disabled', 'archived'],
  archived: [],
};

/** Get valid next statuses for a connector */
export function getValidNextStatuses(currentStatus: string): string[] {
  return CONNECTOR_STATUS_TRANSITIONS[currentStatus] || [];
}

/** Transition connector status with validation and history logging */
export async function transitionConnectorStatus(
  tenantId: string,
  connectorId: string,
  newStatus: string,
  changedBy: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);

  // Get current status
  const current = await safeQuery(
    `SELECT status FROM "${schema}".connector_configs WHERE connector_id = $1`,
    [connectorId]
  );
  if (current.rows.length === 0) throw Object.assign(new Error('Connector not found'), { statusCode: 404 });

  const fromStatus = getFirstRow(current)?.status;
  const allowed = CONNECTOR_STATUS_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid transition: "${fromStatus}" → "${newStatus}". Allowed: [${(allowed || []).join(', ')}]`),
      { statusCode: 400 }
    );
  }

  // Update status
  await safeQuery(
    `UPDATE "${schema}".connector_configs SET status = $1, updated_at = NOW(), updated_by = $2 WHERE connector_id = $3`,
    [newStatus, changedBy, connectorId]
  );

  // Log transition
  await safeQuery(
    `INSERT INTO "${schema}".connector_status_log (connector_id, from_status, to_status, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [connectorId, fromStatus, newStatus, changedBy, reason || null]
  );

  // Publish event
  swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'connector.status_changed',
      tenantId, sourceService: 'connector-service',
      entityType: 'connector', entityId: connectorId,
      severity: newStatus === 'error' ? 'warning' : 'info',
      payload: { fromStatus, toStatus: newStatus, changedBy, reason },
    } as any)), { tenantId, operation: 'eventBus:connector.status_changed' });

  return { fromStatus, toStatus: newStatus };
}

/** Get status change history for a connector */
export async function getStatusHistory(tenantId: string, connectorId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT l.*, u.first_name, u.last_name, u.email
     FROM "${schema}".connector_status_log l
     LEFT JOIN "${schema}".users u ON u.user_id = l.changed_by
     WHERE l.connector_id = $1
     ORDER BY l.changed_at DESC`,
    [connectorId]
  );
  return result.rows.map(r => ({
    ...r,
    changedByName: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : r.changed_by,
  }));
}

// ============================================
// Detail — single connector with ownership context
// ============================================

/** Get connector detail with owner and team info */
export async function getConnectorDetail(tenantId: string, connectorId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT cc.*,
       ou.first_name as owner_first_name, ou.last_name as owner_last_name,
       ou.email as owner_email, ou.department_id as owner_department_id,
       t.name_en as team_name, t.team_code, t.team_lead
     FROM "${schema}".connector_configs cc
     LEFT JOIN "${schema}".users ou ON ou.user_id = cc.owner_id
     LEFT JOIN "${schema}".teams t ON t.team_id = cc.owner_team_id
     WHERE cc.connector_id = $1`,
    [connectorId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Connector not found'), { statusCode: 404 });

  const row = getFirstRow(result)!;
  return {
    ...row,
    credentials_encrypted: row.credentials_encrypted ? '***' : null, // Never expose credentials
    ownerContext: row.owner_id ? {
      userId: row.owner_id,
      name: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      email: row.owner_email,
      departmentId: row.owner_department_id,
    } : null,
    teamContext: row.owner_team_id ? {
      teamId: row.owner_team_id,
      name: row.team_name,
      code: row.team_code,
      lead: row.team_lead,
    } : null,
    validNextStatuses: getValidNextStatuses(row.status),
  };
}

/** Update connector owner and team */
export async function updateConnectorOwnership(
  tenantId: string,
  connectorId: string,
  data: { ownerId?: string; ownerTeamId?: string },
  updatedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = ['updated_at = NOW()', 'updated_by = $3'];
  const values: unknown[] = [connectorId, tenantId, updatedBy];
  let paramIdx = 4;

  if (data.ownerId !== undefined) {
    sets.push(`owner_id = $${paramIdx}`);
    values.push(data.ownerId || null);
    paramIdx++;
  }
  if (data.ownerTeamId !== undefined) {
    sets.push(`owner_team_id = $${paramIdx}`);
    values.push(data.ownerTeamId || null);
    paramIdx++;
  }

  await safeQuery(
    `UPDATE "${schema}".connector_configs SET ${sets.join(', ')} WHERE connector_id = $1`,
    values
  );
}

// ============================================
// Job registration — integrate with job-scheduler
// ============================================

/**
 * Register a connector's scheduled execution with the job scheduler.
 * The job iterates active tenants and runs the connector on schedule.
 */
async function registerConnectorJob(
  tenantId: string,
  connectorId: string,
  cronExpression: string
): Promise<void> {
  const jobName = `connector-${connectorId}`;

  await registerJob(jobName, cronExpression, async () => {
    logger.info(`[Job] Running connector ${connectorId} for tenant ${tenantId}`);
    try {
      await runConnector(tenantId, connectorId);
    } catch (err: unknown) {
      logger.error(`[Job] Connector ${connectorId} execution failed: ${toErrorMessage(err)}`);
    }
  });
}
