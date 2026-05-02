import { authenticate as _authenticate } from '../ports/auth.port';
import { logger } from '../ports/logger.port';
// ============================================
// Shahin — Connector Sync Service
// Wires typed connector DB tables (siem_connections,
// cmdb_connections, etc.) to the adapter classes
// and orchestrates periodic sync + history logging.
// ============================================

import { query as _query, safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { SIEMAdapter } from '../../../connectors/siem.adapter';
import { CMDBAdapter } from '../../../connectors/cmdb.adapter';
import { IAMAdapter } from '../../../connectors/iam.adapter';
import { ITSMAdapter } from '../../../connectors/itsm.adapter';
import { M365Connector } from '../../../connectors/m365.connector';
import { VulnAdapter } from '../../../connectors/vuln.adapter';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience';

// === Types ===

export type ConnectorType = 'siem' | 'cmdb' | 'iam' | 'itsm' | 'm365' | 'vuln_scanner';

interface SyncResult {
  connectionId: string;
  connectorType: ConnectorType;
  status: 'completed' | 'failed';
  recordsFetched: number;
  recordsNew: number;
  recordsUpdated: number;
  durationMs: number;
  error?: string;
}

// === Connection CRUD (generic across all connector types) ===

const TABLE_MAP: Record<ConnectorType, { connections: string; syncHistory: string; typeColumn: string }> = {
  siem: { connections: 'siem_connections', syncHistory: 'siem_sync_history', typeColumn: 'siem_type' },
  cmdb: { connections: 'cmdb_connections', syncHistory: 'cmdb_sync_history', typeColumn: 'cmdb_type' },
  iam: { connections: 'iam_connections', syncHistory: 'iam_sync_history', typeColumn: 'iam_type' },
  itsm: { connections: 'itsm_connections', syncHistory: 'itsm_sync_history', typeColumn: 'itsm_type' },
  m365: { connections: 'm365_connections', syncHistory: 'm365_sync_history', typeColumn: 'tenant_azure_id' },
  vuln_scanner: { connections: 'vuln_scanner_connections', syncHistory: 'vuln_scan_sync_history', typeColumn: 'scanner_type' },
};

export async function listConnections(tenantId: string, type: ConnectorType): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const table = TABLE_MAP[type].connections;
  // secrets-scan-allow: table name restricted by allowlist assertion upstream; schema tenantSchema()-validated
  const result = await safeQuery(`SELECT * FROM "${schema}".${table} ORDER BY created_at DESC`);
  return result.rows;
}

export async function getConnection(tenantId: string, type: ConnectorType, connectionId: string): Promise<GenericRow | undefined> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function createConnection(tenantId: string, type: ConnectorType, data: Record<string, unknown>): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const table = TABLE_MAP[type].connections;
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const result = await safeQuery(
    `INSERT INTO "${schema}".${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    vals
  );
  return getFirstRow(result);
}

export async function updateConnection(tenantId: string, type: ConnectorType, connectionId: string, data: Record<string, unknown>): Promise<GenericRow | undefined> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function deleteConnection(tenantId: string, type: ConnectorType, connectionId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const table = TABLE_MAP[type].connections;
  await safeQuery(`DELETE FROM "${schema}".${table} WHERE connection_id = $1`, [connectionId]);
}

// === Validate Connection ===

export async function validateConnection(tenantId: string, type: ConnectorType, connectionId: string): Promise<{ valid: boolean; error?: string }> {
  const conn = await getConnection(tenantId, type, connectionId);
  const schema = tenantSchema(tenantId);
  const table = TABLE_MAP[type].connections;

  try {
    const adapter = resolveTypedAdapter(type);
    const credentials = parseCredentials(conn, type);
    await adapter.authenticate({
      connectorId: connectionId,
      tenantId,
      sourceSystemType: type === 'vuln_scanner' ? 'vuln' : type === 'm365' ? 'outlook' : type,
      authMethod: conn.auth_method || 'api_key',
      credentials,
      schedule: '', retryPolicy: { maxRetries: 1, backoffMs: 1000 },
      fieldMapping: {}, controlMappings: [],
    });

    await safeQuery(
      `UPDATE "${schema}".${table} SET validation_status = 'valid', last_validated_at = NOW() WHERE connection_id = $1`,
      [connectionId]
    );
    return { valid: true };
  } catch (err: unknown) {
    await safeQuery(
      `UPDATE "${schema}".${table} SET validation_status = 'invalid', last_validated_at = NOW() WHERE connection_id = $1`,
      [connectionId]
    );
    return { valid: false, error: toErrorMessage(err) };
  }
}

// === Sync a connection (run extraction + persist results) ===

export async function syncConnection(tenantId: string, type: ConnectorType, connectionId: string): Promise<SyncResult> {
  const conn = await getConnection(tenantId, type, connectionId);
  const schema = tenantSchema(tenantId);
  const syncTable = TABLE_MAP[type].syncHistory;
  const startTime = Date.now();

  // Create sync history entry
  const syncResult = await safeQuery(
    `INSERT INTO "${schema}".${syncTable} (connection_id, status) VALUES ($1, 'running') RETURNING sync_id`,
    [connectionId]
  );
  const syncId = getFirstRow(syncResult)?.sync_id;

  try {
    const adapter = resolveTypedAdapter(type);
    const credentials = parseCredentials(conn, type);
    const config = {
      connectorId: connectionId, tenantId,
      sourceSystemType: type === 'vuln_scanner' ? 'vuln' : type === 'm365' ? 'outlook' : type,
      authMethod: conn.auth_method || 'api_key',
      credentials, schedule: '', retryPolicy: { maxRetries: 2, backoffMs: 3000 },
      fieldMapping: {}, controlMappings: [],
    };

    const token = await adapter.authenticate(config);
    const rawEvidence = await adapter.extract(token, { criteria: { source: config.sourceSystemType }, dateRange: undefined });
    const durationMs = Date.now() - startTime;

    // Persist results to typed data tables
    const { newCount, updatedCount } = await persistSyncResults(tenantId, type, connectionId, (rawEvidence as any));

    await withTransaction(tenantId, async (client) => {
      await safeQueryWithClient(
        `UPDATE "${schema}".${syncTable}
         SET status = 'completed', completed_at = NOW(), duration_ms = $1,
             ${type === 'siem' ? 'events_fetched' : type === 'cmdb' ? 'assets_fetched' : type === 'itsm' ? 'tickets_fetched' : type === 'vuln_scanner' ? 'findings_fetched' : type === 'iam' ? 'identities_fetched' : 'items_fetched'} = $2,
             ${type === 'siem' ? 'events_new' : type === 'cmdb' ? 'assets_created' : type === 'itsm' ? 'tickets_created' : type === 'vuln_scanner' ? 'findings_new' : type === 'iam' ? 'identities_created' : 'items_new'} = $3
         WHERE sync_id = $4`,
        [durationMs, rawEvidence.length, newCount, syncId], client
      );

      const connTable = TABLE_MAP[type].connections;
      await safeQueryWithClient(
        `UPDATE "${schema}".${connTable} SET validation_status = 'valid', last_validated_at = NOW() WHERE connection_id = $1`,
        [connectionId], client
      );
    });

    // Publish sync completed event to EventBus
    swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'connector.sync_completed',
          tenantId, sourceService: 'connector-sync',
          entityType: type, entityId: connectionId,
          severity: 'info',
          payload: { connectorType: type, recordsFetched: rawEvidence.length, recordsNew: newCount, recordsUpdated: updatedCount, durationMs },
        } as any)), { tenantId, operation: 'eventBus:connector.sync_completed' });

    return { connectionId, connectorType: type, status: 'completed', recordsFetched: rawEvidence.length, recordsNew: newCount, recordsUpdated: updatedCount, durationMs };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    await safeQuery(
      `UPDATE "${schema}".${syncTable}
       SET status = 'failed', completed_at = NOW(), duration_ms = $1, errors = $2
       WHERE sync_id = $3`,
      [durationMs, JSON.stringify([{ message: toErrorMessage(err) }]), syncId]
    );

    // Publish sync failed event to EventBus
    swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'connector.sync_failed',
          tenantId, sourceService: 'connector-sync',
          entityType: type, entityId: connectionId,
          severity: 'warning',
          payload: { connectorType: type, error: toErrorMessage(err), durationMs },
        } as any)), { tenantId, operation: 'eventBus:connector.sync_failed' });

    return { connectionId, connectorType: type, status: 'failed', recordsFetched: 0, recordsNew: 0, recordsUpdated: 0, durationMs, error: toErrorMessage(err) };
  }
}

// === Get sync history ===

export async function getSyncHistory(tenantId: string, type: ConnectorType, connectionId: string, limit = 20): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const table = TABLE_MAP[type].syncHistory;
  const result = await safeQuery(
    `SELECT * FROM "${schema}".${table} WHERE connection_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [connectionId, limit]
  );
  return result.rows;
}

// === Sync all enabled connections of a type for a tenant ===

export async function syncAllConnections(tenantId: string, type: ConnectorType): Promise<SyncResult[]> {
  const connections = await listConnections(tenantId, type);
  const enabled = connections.filter(c => c.sync_enabled !== false);
  const results: SyncResult[] = [];
  for (const conn of enabled) {
    const result = await syncConnection(tenantId, type, conn.connection_id);
    results.push(result);
  }
  return results;
}

// === Helpers ===

function resolveTypedAdapter(type: ConnectorType) {
  switch (type) {
    case 'siem': return new SIEMAdapter();
    case 'cmdb': return new CMDBAdapter();
    case 'iam': return new IAMAdapter();
    case 'itsm': return new ITSMAdapter();
    case 'm365': return new M365Connector();
    case 'vuln_scanner': return new VulnAdapter();
    default: throw new Error(`Unknown connector type: ${type}`);
  }
}

function parseCredentials(conn: GenericRow, type: ConnectorType): Record<string, string> {
  // Decrypt credentials_encrypted (for now, treat as JSON)
  if (conn.credentials_encrypted) {
    try { return JSON.parse(conn.credentials_encrypted); } catch { return {}; }
  }
  // M365 has structured columns instead
  if (type === 'm365') {
    return {
      tenantId: conn.tenant_azure_id || '',
      clientId: conn.client_id || '',
      clientSecret: conn.credentials_encrypted || '',
      platform: 'azure_ad',
    };
  }
  return {};
}

async function persistSyncResults(
  tenantId: string, type: ConnectorType, connectionId: string, rawEvidence: Record<string, unknown>[]
): Promise<{ newCount: number; updatedCount: number }> {
  const schema = tenantSchema(tenantId);
  let newCount = 0;
  let updatedCount = 0;

  for (const item of rawEvidence) {
    try {
      switch (type) {
        case 'siem': {
          await safeQuery(
            `INSERT INTO "${schema}".siem_events
               (connection_id, external_event_id, event_type, severity, parsed_data, event_timestamp)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (connection_id, external_event_id) DO UPDATE SET
               event_type = EXCLUDED.event_type, severity = EXCLUDED.severity, parsed_data = EXCLUDED.parsed_data
             WHERE (siem_events.event_type, siem_events.severity) IS DISTINCT FROM (EXCLUDED.event_type, EXCLUDED.severity)`,

            [connectionId, item.sourceId, item.data.alertName || 'security_event',

             item.data.severity || 'info', JSON.stringify(item.data),

             item.data.timestamp || new Date().toISOString()]
          );
          newCount++;
          break;
        }
        case 'cmdb': {
          const upsertResult = await safeQuery(
            `INSERT INTO "${schema}".cmdb_assets
               (connection_id, external_asset_id, asset_name, asset_class, asset_type, owner, department, location, criticality, status, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (connection_id, external_asset_id) DO UPDATE SET
               asset_name=EXCLUDED.asset_name, owner=EXCLUDED.owner, status=EXCLUDED.status,
               raw_data=EXCLUDED.raw_data, last_synced_at=NOW(), updated_at=NOW()
             RETURNING (xmax = 0) as is_new`,

            [connectionId, item.sourceId, item.data.assetName || 'any',

             item.data.assetType || 'any', item.data.assetType || null,

             item.data.owner || null, item.data.department || null,

             item.data.location || null, item.data.criticality || 'medium',

             item.data.status || 'active', JSON.stringify(item.data)]
          );
          if (getFirstRow(upsertResult)?.is_new) newCount++; else updatedCount++;
          break;
        }
        case 'iam': {
          const upsertResult = await safeQuery(
            `INSERT INTO "${schema}".iam_identities
               (connection_id, external_user_id, email, display_name, department, job_title, status, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (connection_id, external_user_id) DO UPDATE SET
               email=EXCLUDED.email, display_name=EXCLUDED.display_name, status=EXCLUDED.status,
               raw_data=EXCLUDED.raw_data, last_synced_at=NOW(), updated_at=NOW()
             RETURNING (xmax = 0) as is_new`,

            [connectionId, item.sourceId, item.data.email || null,

             item.data.displayName || 'any', item.data.department || null,

             item.data.jobTitle || null, item.data.accessLevel || 'active',
             JSON.stringify(item.data)]
          );
          if (getFirstRow(upsertResult)?.is_new) newCount++; else updatedCount++;
          break;
        }
        case 'itsm': {
          const upsertResult = await safeQuery(
            `INSERT INTO "${schema}".itsm_tickets
               (connection_id, external_ticket_id, ticket_type, summary, description, priority, status, assignee, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (connection_id, external_ticket_id) DO UPDATE SET
               status=EXCLUDED.status, priority=EXCLUDED.priority, assignee=EXCLUDED.assignee,
               raw_data=EXCLUDED.raw_data, last_synced_at=NOW(), updated_at=NOW()
             RETURNING (xmax = 0) as is_new`,

            [connectionId, item.sourceId, item.data.ticketType || 'ticket',

             item.data.summary || 'untitled', item.data.description || null,

             item.data.priority || 'medium', item.data.status || 'open',

             item.data.assignee || null, JSON.stringify(item.data)]
          );
          if (getFirstRow(upsertResult)?.is_new) newCount++; else updatedCount++;
          break;
        }
        case 'vuln_scanner': {
          await safeQuery(
            `INSERT INTO "${schema}".vuln_scan_results
               (connection_id, external_finding_id, cve_id, title, severity, cvss_score, affected_host, raw_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (connection_id, external_finding_id) DO UPDATE SET
               cve_id = EXCLUDED.cve_id, title = EXCLUDED.title, severity = EXCLUDED.severity,
               cvss_score = EXCLUDED.cvss_score, raw_data = EXCLUDED.raw_data
             WHERE (vuln_scan_results.severity, vuln_scan_results.cvss_score)
               IS DISTINCT FROM (EXCLUDED.severity, EXCLUDED.cvss_score)`,

            [connectionId, item.sourceId, item.data.cveId || null,

             item.data.hostname || 'any', item.data.severity || 'medium',

             item.data.cvssScore || 0, item.data.hostname || item.data.assetId || null,
             JSON.stringify(item.data)]
          );
          newCount++;
          break;
        }
        case 'm365': {
          await safeQuery(
            `INSERT INTO "${schema}".m365_evidence_items
               (connection_id, source_type, external_item_id, file_name, file_path, content_hash, raw_metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (connection_id, external_item_id) DO UPDATE SET
               file_name = EXCLUDED.file_name, file_path = EXCLUDED.file_path,
               content_hash = EXCLUDED.content_hash, raw_metadata = EXCLUDED.raw_metadata
             WHERE (m365_evidence_items.content_hash) IS DISTINCT FROM (EXCLUDED.content_hash)`,

            [connectionId, item.metadata?.source || 'sharepoint', item.sourceId,

             item.data.name || null, item.data.webUrl || null,

             item.data.contentHash || null, JSON.stringify(item.data)]
          );
          newCount++;
          break;
        }
      }
    } catch (err: unknown) {
      logger.warn(`[ConnectorSync] Failed to persist ${type} item ${item.sourceId}: ${toErrorMessage(err)}`);
    }
  }

  return { newCount, updatedCount };
}
