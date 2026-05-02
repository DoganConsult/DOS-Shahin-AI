import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';

const cache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const CACHE_TTL_MS = 60_000;

export async function resolveIntegrationConfig(
  tenantId: string,
  type: 'jira' | 'slack' | 'teams' | 'servicenow' | 'ciso_assistant' | 'openproject',
): Promise<Record<string, unknown> | null> {
  const key = `${tenantId}:${type}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config FROM "${schema}".integration_configs WHERE type = $1 AND enabled = true LIMIT 1`,
    [type],
  );
  const row = getFirstRow(result)!;
  if (!row?.config) {
    cache.set(key, { data: {}, ts: Date.now() });
    return null;
  }
  const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
  cache.set(key, { data: cfg, ts: Date.now() });
  return cfg;
}

export function invalidateConfigCache(tenantId: string, type?: string): void {
  if (type) {
    cache.delete(`${tenantId}:${type}`);
  } else {
    for (const k of cache.keys()) {
      if (k.startsWith(`${tenantId}:`)) cache.delete(k);
    }
  }
}

export async function resolveJiraConfig(tenantId: string): Promise<{
  baseUrl: string; email: string; apiToken: string; projectKey: string;
} | null> {
  const envCfg = process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN
    ? { baseUrl: process.env.JIRA_BASE_URL, email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_API_TOKEN, projectKey: process.env.JIRA_PROJECT_KEY || 'GRC' }
    : null;
  if (envCfg) return envCfg;
  const db = await resolveIntegrationConfig(tenantId, 'jira');

  if (db?.baseUrl && db?.email && db?.apiToken) return db as unknown;
  return null;
}

export async function resolveSlackConfig(tenantId: string): Promise<{ webhookUrl: string } | null> {
  if (process.env.SLACK_WEBHOOK_URL) return { webhookUrl: process.env.SLACK_WEBHOOK_URL };
  const db = await resolveIntegrationConfig(tenantId, 'slack');

  if (db?.webhookUrl) return db as unknown;
  return null;
}

export async function resolveTeamsConfig(tenantId: string): Promise<{ webhookUrl: string } | null> {
  if (process.env.TEAMS_WEBHOOK_URL) return { webhookUrl: process.env.TEAMS_WEBHOOK_URL };
  const db = await resolveIntegrationConfig(tenantId, 'teams');

  if (db?.webhookUrl) return db as unknown;
  return null;
}

export async function resolveServiceNowConfig(tenantId: string): Promise<{
  instanceUrl: string; username: string; password: string;
} | null> {
  const envCfg = process.env.SERVICENOW_INSTANCE_URL && process.env.SERVICENOW_USERNAME
    ? { instanceUrl: process.env.SERVICENOW_INSTANCE_URL, username: process.env.SERVICENOW_USERNAME, password: process.env.SERVICENOW_PASSWORD || '' }
    : null;
  if (envCfg) return envCfg;
  const db = await resolveIntegrationConfig(tenantId, 'servicenow');

  if (db?.instanceUrl && db?.username) return db as unknown;
  return null;
}

export async function resolveCisoAssistantConfig(tenantId: string): Promise<{
  url: string; apiKey: string;
} | null> {
  const envCfg = process.env.CISO_ASSISTANT_URL && process.env.CISO_ASSISTANT_API_KEY
    ? { url: process.env.CISO_ASSISTANT_URL, apiKey: process.env.CISO_ASSISTANT_API_KEY }
    : null;
  if (envCfg) return envCfg;
  const db = await resolveIntegrationConfig(tenantId, 'ciso_assistant');

  if (db?.url && db?.apiKey) return db as unknown;
  return null;
}

export async function resolveOpenProjectConfig(tenantId: string): Promise<{
  url: string; apiKey: string; projectId?: string;
} | null> {
  const envCfg = process.env.OPENPROJECT_URL && process.env.OPENPROJECT_API_KEY
    ? { url: process.env.OPENPROJECT_URL, apiKey: process.env.OPENPROJECT_API_KEY, projectId: process.env.OPENPROJECT_GRC_PROJECT_ID }
    : null;
  if (envCfg) return envCfg;
  const db = await resolveIntegrationConfig(tenantId, 'openproject');

  if (db?.url && db?.apiKey) return db as unknown;
  return null;
}
