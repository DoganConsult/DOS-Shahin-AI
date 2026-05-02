import { safeQuery } from '@dos/db';
import { logger } from '../../observability';
import { toErrorMessage } from '../../resilience';

interface TenantSettingsPayload {
  [key: string]: unknown;
  sector_codes?: string[];
  primary_sector_code?: string;
}

async function getTenantSettings(tenantId: string): Promise<TenantSettingsPayload> {
  const result = await safeQuery(`SELECT settings FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
  const raw = result.rows[0]?.settings;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as TenantSettingsPayload;
    } catch {
      return {};
    }
  }
  return raw as TenantSettingsPayload;
}

async function saveTenantSettings(tenantId: string, settings: TenantSettingsPayload): Promise<void> {
  await safeQuery(`UPDATE public.tenants SET settings = $2::jsonb, updated_at = NOW() WHERE tenant_id = $1`, [tenantId, JSON.stringify(settings)]);
}

export async function addSectorToTenant(tenantId: string, sectorCode: string, userId?: string): Promise<{ tenantId: string; sectorCode: string; sectors: string[]; added: boolean; updatedBy?: string }> {
  const settings = await getTenantSettings(tenantId);
  const sectors = Array.isArray(settings.sector_codes) ? settings.sector_codes.map(String) : [];
  const normalized = sectorCode.trim();
  const next = Array.from(new Set([...sectors, normalized]));
  settings.sector_codes = next;
  settings.primary_sector_code = settings.primary_sector_code ? String(settings.primary_sector_code) : normalized;
  await saveTenantSettings(tenantId, settings);
  logger.info('[IncrementalResolution] sector added', { tenantId, sectorCode: normalized, userId });
  return { tenantId, sectorCode: normalized, sectors: next, added: next.length !== sectors.length, updatedBy: userId };
}

export async function removeSectorFromTenant(tenantId: string, sectorCode: string): Promise<{ tenantId: string; removed: boolean; sectors: string[] }> {
  const settings = await getTenantSettings(tenantId);
  const sectors = Array.isArray(settings.sector_codes) ? settings.sector_codes.map(String) : [];
  const next = sectors.filter((entry) => entry !== sectorCode);
  settings.sector_codes = next;
  if (settings.primary_sector_code === sectorCode) {
    settings.primary_sector_code = next[0] ?? undefined;
  }
  await saveTenantSettings(tenantId, settings);
  return { tenantId, removed: next.length !== sectors.length, sectors: next };
}
