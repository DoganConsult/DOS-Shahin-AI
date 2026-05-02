import { safeQuery } from '@dos/db';
import { logger } from '../observability';
import { toErrorMessage } from '../resilience';
import { randomUUID } from 'crypto';

export type PlatformMode = 'manual' | 'hybrid' | 'autonomous' | 'human' | 'copilot' | 'assisted' | 'hyper';

const KNOWN_MODES = new Set<PlatformMode>(['manual', 'hybrid', 'autonomous', 'human', 'copilot', 'assisted', 'hyper']);

function normalizePlatformMode(value: unknown): PlatformMode | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (KNOWN_MODES.has(normalized as PlatformMode)) {
    return normalized as PlatformMode;
  }
  return undefined;
}

async function readPlatformModeFromTenants(tenantId: string): Promise<PlatformMode | undefined> {
  const result = await safeQuery(
    `SELECT settings->>'platform_mode' AS platform_mode FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  return normalizePlatformMode(result.rows[0]?.platform_mode);
}

async function readPlatformModeFromPublicTenantSettings(tenantId: string): Promise<PlatformMode | undefined> {
  const result = await safeQuery(
    `SELECT setting_value FROM public.tenant_settings WHERE tenant_id = $1 AND setting_key = 'platform_mode' LIMIT 1`,
    [tenantId],
  );
  return normalizePlatformMode(result.rows[0]?.setting_value);
}

async function readPlatformModeFromDosTenantSettings(tenantId: string): Promise<PlatformMode | undefined> {
  const result = await safeQuery(
    `SELECT value FROM dos.tenant_settings WHERE key = 'platform_mode' AND (owner_user_id = $1 OR workspace_id = $1 OR scope = 'tenant') ORDER BY updated_at DESC LIMIT 1`,
    [tenantId],
  );
  const value = result.rows[0]?.value;
  if (typeof value === 'string') {
    return normalizePlatformMode(value);
  }
  if (value && typeof value === 'object' && 'platform_mode' in value) {
    return normalizePlatformMode((value as Record<string, unknown>).platform_mode);
  }
  return undefined;
}

export async function getTenantPlatformMode(tenantId: string): Promise<PlatformMode> {
  const fallback = normalizePlatformMode(process.env.DEFAULT_PLATFORM_MODE) ?? 'manual';
  for (const reader of [readPlatformModeFromTenants, readPlatformModeFromPublicTenantSettings, readPlatformModeFromDosTenantSettings]) {
    try {
      const mode = await reader(tenantId);
      if (mode) return mode;
    } catch (error: unknown) {
      logger.debug('[PlatformModeGate] mode lookup fallback triggered', { tenantId, error: toErrorMessage(error) });
    }
  }
  return fallback;
}

export async function getAgentPlatformMode(tenantId: string): Promise<PlatformMode> {
  return getTenantPlatformMode(tenantId);
}

export function getModeDirective(mode: PlatformMode): string {
  switch (mode) {
    case 'autonomous':
    case 'hyper':
      return 'execute';
    case 'hybrid':
    case 'copilot':
    case 'assisted':
      return 'suggest';
    default:
      return 'observe';
  }
}

export async function gateActionWithPolicy(
  tenantId: string,
  action: string,
  riskLevel: 'low' | 'medium' | 'high' = 'low',
): Promise<{ allowed: boolean; mode: PlatformMode; reason: string }> {
  const mode = await getTenantPlatformMode(tenantId);
  if (mode === 'autonomous' || mode === 'hyper') return { allowed: true, mode, reason: `${mode} mode` };
  if ((mode === 'hybrid' || mode === 'copilot' || mode === 'assisted') && riskLevel === 'low') {
    return { allowed: true, mode, reason: `${mode} mode allows low-risk action` };
  }
  return { allowed: false, mode, reason: `${mode} mode blocks ${action}` };
}

async function ensurePendingActionsTable(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS public.pending_agent_actions (
      pending_id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      actor_id VARCHAR(255),
      action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function queuePendingAction(
  tenantId: string,
  actorIdOrAction: string | Record<string, unknown>,
  action?: Record<string, unknown>,
): Promise<string> {
  const pendingId = `pending-${randomUUID()}`;
  const actorId = typeof actorIdOrAction === 'string' ? actorIdOrAction : null;
  const payload = typeof actorIdOrAction === 'string' ? (action ?? {}) : actorIdOrAction;
  try {
    await ensurePendingActionsTable();
    await safeQuery(
      `INSERT INTO public.pending_agent_actions (pending_id, tenant_id, actor_id, action_payload) VALUES ($1, $2, $3, $4::jsonb)`,
      [pendingId, tenantId, actorId, JSON.stringify(payload)],
    );
  } catch (error: unknown) {
    logger.warn('[PlatformModeGate] queuePendingAction persistence failed', { tenantId, pendingId, error: toErrorMessage(error) });
  }
  return pendingId;
}
