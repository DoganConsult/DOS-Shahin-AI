// ============================================================
// AGRC-OS ERP Connector Service
// Universal ERP integration: SAP, Oracle, Dynamics 365, REST
// ============================================================

import crypto from 'crypto';
import fetch from 'node-fetch';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { recordAudit as _recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import type { ERPConnection, ERPType, AuthMethod, FieldMappingConfig, SyncJobResult } from '@dos/types/integration';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

const ERP_ENCRYPTION_KEY = process.env.ERP_ENCRYPTION_KEY || 'agrc-os-erp-default-key-32ch!';
const ALGORITHM = 'aes-256-cbc';

// ── Encryption Helpers ─────────────────────────────────────────────────────
function encryptCredentials(plaintext: string): string {
  const key = crypto.scryptSync(ERP_ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptCredentials(ciphertext: string): string {
  const key = crypto.scryptSync(ERP_ENCRYPTION_KEY, 'salt', 32);
  const [ivHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ── Save Connection ────────────────────────────────────────────────────────
export async function saveConnection(tenantId: string, config: {
  connectionId?: string;
  erpType: ERPType;
  endpointUrl: string;
  authMethod: AuthMethod;
  credentials: Record<string, string>;
  name: string;
  syncScheduleCron?: string;
}): Promise<ERPConnection> {
  const schema = tenantSchema(tenantId);
  const encCreds = encryptCredentials(JSON.stringify(config.credentials));
  const cron = config.syncScheduleCron || '0 2 * * *';

  // Validate minimum interval (15 min)
  validateMinInterval(cron);

  let res;
  if (config.connectionId) {
    res = await safeQuery(
      `UPDATE "${schema}".erp_connections SET name=$1, erp_type=$2, endpoint_url=$3, auth_method=$4,
       credentials_encrypted=$5, sync_schedule_cron=$6, updated_at=NOW()
       WHERE connection_id=$7 RETURNING *`,
      [config.name, config.erpType, config.endpointUrl, config.authMethod, encCreds, cron, config.connectionId]
    );
  } else {
    res = await safeQuery(
      `INSERT INTO "${schema}".erp_connections (name, erp_type, endpoint_url, auth_method, credentials_encrypted, sync_schedule_cron)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [config.name, config.erpType, config.endpointUrl, config.authMethod, encCreds, cron]
    );
  }

  return mapConnection(getFirstRow(res));
}

// ── Connection timeout for validation requests (ms) ──────────────────────
const CONNECTION_VALIDATE_TIMEOUT_MS = 10_000;

/**
 * Build HTTP headers for the given auth method and credentials.
 * Supports: api_key (X-API-Key header), oauth2/bearer token, basic auth.
 */
function buildAuthHeaders(
  authMethod: AuthMethod,
  creds: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  switch (authMethod) {
    case 'api_key': {
      // Use custom header name if provided, otherwise default to X-API-Key
      const headerName = creds.header_name || 'X-API-Key';
      const apiKey = creds.api_key || creds.key;
      if (!apiKey) {
        throw new Error('Authentication failed — api_key credential is missing');
      }
      headers[headerName] = apiKey;
      break;
    }
    case 'oauth2': {
      // Expect an access_token or bearer_token in credentials
      const token = creds.access_token || creds.bearer_token || creds.token;
      if (!token) {
        throw new Error('Authentication failed — access_token credential is missing');
      }
      headers['Authorization'] = `Bearer ${token}`;
      break;
    }
    case 'basic': {
      const username = creds.username;
      const password = creds.password;
      if (!username || !password) {
        throw new Error('Authentication failed — username and password credentials are required for basic auth');
      }
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
      break;
    }
    default:
      throw new Error(`Unsupported auth method: ${authMethod}`);
  }

  return headers;
}

/**
 * Classify fetch errors into user-friendly messages.
 */
function classifyConnectionError(err: unknown): string {
  const msg = toErrorMessage(err);

  const code = (err as Error)?.code || (err as Error)?.type || '';

  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) {
    return 'Connection refused — the endpoint is not accepting connections';
  }
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    return 'DNS resolution failed — the hostname could not be resolved';
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || msg.includes('ETIMEDOUT')) {
    return 'Connection timed out — the endpoint did not respond within the time limit';
  }
  if (code === 'ECONNRESET' || msg.includes('ECONNRESET')) {
    return 'Connection reset by the remote server';
  }
  if (msg.includes('aborted') || msg.includes('AbortError') || code === 'ABORT_ERR') {
    return `Request timed out after ${CONNECTION_VALIDATE_TIMEOUT_MS / 1000} seconds`;
  }
  if (msg.includes('certificate') || msg.includes('CERT') || msg.includes('SSL')) {
    return 'TLS/SSL certificate error — check the endpoint certificate';
  }

  return `Connection failed: ${msg}`;
}

// ── Validate Connection ────────────────────────────────────────────────────
export async function validateConnection(tenantId: string, connectionId: string): Promise<{
  valid: boolean; error?: string; httpStatus?: number; responseTimeMs?: number;
}> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Save Field Mapping ─────────────────────────────────────────────────────
export async function saveFieldMapping(tenantId: string, connectionId: string, mapping: FieldMappingConfig): Promise<{ mappingId: string }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Serialization (round-trip guarantee) ───────────────────────────────────
export function serializeFieldMapping(mapping: FieldMappingConfig): string {
  return JSON.stringify(mapping);
}

export function deserializeFieldMapping(json: string): FieldMappingConfig {
  return JSON.parse(json) as FieldMappingConfig;
}

// ── Execute Sync Job ───────────────────────────────────────────────────────
export async function executeSyncJob(tenantId: string, connectionId: string): Promise<SyncJobResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.integrations_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get Sync History ───────────────────────────────────────────────────────
export async function getSyncHistory(tenantId: string, connectionId: string, limit: number = 100): Promise<SyncJobResult[]> {
  const schema = tenantSchema(tenantId);
  const cap = Math.min(limit, 100);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".erp_sync_history WHERE connection_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [connectionId, cap]
  );
  return res.rows.map((r: GenericRow) => ({
    syncId: r.sync_id, connectionId: r.connection_id, status: r.status,
    recordsFetched: r.records_fetched, recordsCreated: r.records_created,
    recordsUpdated: r.records_updated, errors: r.errors || [],
    durationMs: r.duration_ms, startedAt: r.started_at?.toISOString?.() || r.started_at,
    completedAt: r.completed_at?.toISOString?.() || r.completed_at,
  }));
}

// ── Get Connections ────────────────────────────────────────────────────────
export async function getConnections(tenantId: string): Promise<ERPConnection[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`SELECT * FROM "${schema}".erp_connections ORDER BY name`);
  return res.rows.map(mapConnection);
}

// ── Get Field Mappings ─────────────────────────────────────────────────────
export async function getFieldMappings(tenantId: string, connectionId: string): Promise<FieldMappingConfig[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".erp_field_mappings WHERE connection_id = $1 ORDER BY created_at`, [connectionId]
  );
  return res.rows.map((r: GenericRow) => deserializeFieldMapping(r.mapping_config_json));
}

// ── Helpers ────────────────────────────────────────────────────────────────
function validateMinInterval(cron: string): void {
  // Simple check: if cron has */N in minutes position and N < 15, reject
  const parts = cron.trim().split(/\s+/);
  if (parts.length >= 1) {
    const minPart = parts[0];
    const match = minPart.match(/^\*\/(\d+)$/);
    if (match && parseInt(match[1], 10) < 15) {
      throw new Error('Sync schedule interval must be at least 15 minutes');
    }
  }
}

function mapConnection(row: Record<string, unknown>): ERPConnection {
  return {

    connectionId: row.connection_id, name: row.name, erpType: row.erp_type,
    endpointUrl: row.endpoint_url, authMethod: row.auth_method,
    syncScheduleCron: row.sync_schedule_cron, syncEnabled: row.sync_enabled,

    lastValidatedAt: row.last_validated_at?.toISOString?.() || row.last_validated_at,
    validationStatus: row.validation_status,
  };
}

// Exported for encryption round-trip testing
export { encryptCredentials, decryptCredentials };
