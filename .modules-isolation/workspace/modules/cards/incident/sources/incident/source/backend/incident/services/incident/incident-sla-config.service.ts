import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

const DEFAULT_SLA_HOURS: Record<string, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

const CONFIG_KEY = 'incident_sla_defaults';

let _cache: Map<string, { data: Record<string, number>; ts: number }> = new Map();
const CACHE_TTL_MS = 60_000;

export async function getIncidentSlaConfig(tenantId: string): Promise<Record<string, number>> {
  const cached = _cache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  try {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(
      `SELECT config_value FROM "${schema}".platform_operation_config WHERE config_key = $1 AND owner_module = 'incident' LIMIT 1`,
      [CONFIG_KEY],
    );
    if (res.rows.length > 0) {
      const val = typeof getFirstRow(res)?.config_value === 'string'
        ? JSON.parse(getFirstRow(res)?.config_value)
        : getFirstRow(res)?.config_value;
      if (val && typeof val === 'object') {
        const merged = { ...DEFAULT_SLA_HOURS, ...val };
        _cache.set(tenantId, { data: merged, ts: Date.now() });
        return merged;
      }
    }
  } catch { /* fall through to defaults */ }

  _cache.set(tenantId, { data: DEFAULT_SLA_HOURS, ts: Date.now() });
  return DEFAULT_SLA_HOURS;
}

export function clearSlaCache(tenantId?: string): void {
  if (tenantId) _cache.delete(tenantId);
  else _cache = new Map();
}

export { DEFAULT_SLA_HOURS, CONFIG_KEY as SLA_CONFIG_KEY };
