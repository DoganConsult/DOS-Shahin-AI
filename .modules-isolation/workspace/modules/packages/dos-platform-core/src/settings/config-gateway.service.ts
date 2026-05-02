import { safeQuery } from '@dos/db';
import { logger } from '../observability';
import { UnifiedConfigService } from './unified-config.service';

const BOOTSTRAP_KEYS = new Set([
  'PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_USER', 'PG_PASSWORD', 'DATABASE_URL',
  'PG_SSL', 'PG_SSL_CA', 'PG_POOL_MAX', 'PG_IDLE_TIMEOUT_MS',
  'PG_CONNECTION_TIMEOUT_MS', 'PG_STATEMENT_TIMEOUT_MS',
  'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB', 'REDIS_PREFIX',
  'JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_SECRET',
  'NODE_ENV', 'PORT', 'LOG_LEVEL',
]);

type RuntimeOverrideEntry = { value: unknown; setBy: string; setAt: string };

export interface ConfigInventoryItem {
  key: string;
  bootstrap: boolean;
  hasOverride: boolean;
  currentValue: unknown;
  source: string;
  setBy?: string;
  setAt?: string;
}

let initialized = false;
const overrideCache = new Map<string, RuntimeOverrideEntry>();
const resolvedCache = new Map<string, { value: unknown; source: string; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

async function loadOverridesFromDb(): Promise<void> {
  try {
    const result = await safeQuery(
      `SELECT config_key, config_value, set_by, set_at FROM public.config_runtime_overrides`,
      [],
    );
    overrideCache.clear();
    for (const row of result.rows) {
      let value: unknown;
      try {
        value = JSON.parse(row.config_value);
      } catch {
        value = row.config_value;
      }
      overrideCache.set(row.config_key, {
        value,
        setBy: row.set_by,
        setAt: row.set_at,
      });
    }
  } catch {}
}

async function persistOverride(key: string, entry: RuntimeOverrideEntry): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.config_runtime_overrides (config_key, config_value, set_by, set_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = EXCLUDED.config_value,
         set_by = EXCLUDED.set_by,
         set_at = EXCLUDED.set_at`,
      [key, JSON.stringify(entry.value), entry.setBy, entry.setAt],
    );
  } catch {}
}

async function deleteOverrideFromDb(key: string): Promise<void> {
  try {
    await safeQuery(`DELETE FROM public.config_runtime_overrides WHERE config_key = $1`, [key]);
  } catch {}
}

function parseEnvValue(value: string | undefined): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (value !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

export class ConfigGateway {
  static isInitialized(): boolean {
    return initialized;
  }

  static async initialize(): Promise<void> {
    if (initialized) {
      return;
    }
    await loadOverridesFromDb();
    initialized = true;
    logger.info('[ConfigGateway] Initialized');
  }

  static getSync(key: string): unknown {
    if (BOOTSTRAP_KEYS.has(key)) {
      return parseEnvValue(process.env[key]);
    }

    const override = overrideCache.get(key);
    if (override !== undefined) {
      return override.value;
    }

    const cached = resolvedCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const envValue = parseEnvValue(process.env[key]);
    if (envValue !== undefined) {
      resolvedCache.set(key, {
        value: envValue,
        source: 'environment',
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return envValue;
    }

    const metadata = UnifiedConfigService.resolveSyncWithMetadata(key);
    resolvedCache.set(key, {
      value: metadata.value,
      source: metadata.source,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return metadata.value;
  }

  static async get(
    key: string,
    options?: { tenantId?: string; moduleCode?: string; workspaceId?: string; userId?: string },
  ): Promise<unknown> {
    if (BOOTSTRAP_KEYS.has(key)) {
      return parseEnvValue(process.env[key]);
    }

    const override = overrideCache.get(key);
    if (override !== undefined) {
      return override.value;
    }

    const metadata = await UnifiedConfigService.resolveWithMetadata(key, options);
    resolvedCache.set(key, {
      value: metadata.value,
      source: metadata.source,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return metadata.value;
  }

  static getString(key: string, fallback = ''): string {
    const value = this.getSync(key);
    return value !== undefined && value !== null ? String(value) : fallback;
  }

  static getNumber(key: string, fallback = 0): number {
    const value = this.getSync(key);
    const numberValue = Number(value);
    return !Number.isNaN(numberValue) && value !== undefined && value !== null ? numberValue : fallback;
  }

  static getBool(key: string, fallback = false): boolean {
    const value = this.getSync(key);
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return fallback;
  }

  static setOverride(key: string, value: unknown, setBy: string): void {
    const entry: RuntimeOverrideEntry = {
      value,
      setBy,
      setAt: new Date().toISOString(),
    };
    overrideCache.set(key, entry);
    resolvedCache.delete(key);
    persistOverride(key, entry).catch(() => {});
    logger.info('[ConfigGateway] Runtime override set', { key, setBy });
  }

  static clearOverride(key: string): void {
    overrideCache.delete(key);
    resolvedCache.delete(key);
    deleteOverrideFromDb(key).catch(() => {});
  }

  static getOverrides(): Record<string, RuntimeOverrideEntry> {
    return Object.fromEntries(overrideCache);
  }

  static invalidateCache(key?: string): void {
    if (key) {
      resolvedCache.delete(key);
      return;
    }
    resolvedCache.clear();
  }

  static isBootstrapKey(key: string): boolean {
    return BOOTSTRAP_KEYS.has(key);
  }

  static getFullInventory(): ConfigInventoryItem[] {
    const keys = new Set<string>([
      ...Object.keys(process.env),
      ...overrideCache.keys(),
      ...resolvedCache.keys(),
    ]);

    return [...keys]
      .sort((left, right) => left.localeCompare(right))
      .map((key) => {
        const override = overrideCache.get(key);
        const cached = resolvedCache.get(key);
        const envValue = parseEnvValue(process.env[key]);
        const currentValue = override?.value ?? cached?.value ?? envValue ?? this.getSync(key);
        const source = override
          ? 'runtime_override'
          : cached?.source ?? (envValue !== undefined ? 'environment' : 'platform');

        return {
          key,
          bootstrap: BOOTSTRAP_KEYS.has(key),
          hasOverride: Boolean(override),
          currentValue,
          source,
          setBy: override?.setBy,
          setAt: override?.setAt,
        };
      });
  }
}
