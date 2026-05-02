import { z } from 'zod';

export const ServiceRuntimeConfigSchema = z.object({
  serviceCode: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  nodeEnv: z.enum(['development', 'production', 'staging', 'test']),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']),
  db: z.object({
    connectionString: z.string().url(),
    poolMax: z.number().int().min(1),
    ssl: z.boolean(),
  }),
  redis: z.object({
    url: z.string().url(),
    prefix: z.string().min(1),
  }),
  services: z.record(z.string(), z.string().url()),
});

export type ServiceRuntimeConfig = z.infer<typeof ServiceRuntimeConfigSchema>;

export class ConfigValidationError extends Error {
  public readonly issues: ConfigIssue[];
  constructor(serviceCode: string, issues: ConfigIssue[]) {
    const summary = issues.map(i => `  - ${i.field}: ${i.message}`).join('\n');
    super(`[runtime-config] ${serviceCode} failed boot-time validation:\n${summary}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export interface ConfigIssue {
  field: string;
  message: string;
  value?: unknown;
}

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`[runtime-config] Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function optionalInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function optionalBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val === 'true' || val === '1';
}

export interface LoadConfigOptions {
  skipValidation?: boolean;
  overrides?: Partial<ServiceRuntimeConfig>;
  additionalServices?: Record<string, { envVar: string; defaultUrl: string }>;
}

export function loadServiceConfig(serviceCode: string, options?: LoadConfigOptions): ServiceRuntimeConfig {
  const services: Record<string, string> = {
    auth: optional('AUTH_SERVICE_URL', 'http://127.0.0.1:4001'),
    tenant: optional('TENANT_SERVICE_URL', 'http://127.0.0.1:4002'),
    user: optional('USER_SERVICE_URL', 'http://127.0.0.1:4003'),
    workflow: optional('WORKFLOW_SERVICE_URL', 'http://127.0.0.1:4004'),
    notification: optional('NOTIFICATION_SERVICE_URL', 'http://127.0.0.1:4005'),
    audit: optional('AUDIT_SERVICE_URL', 'http://127.0.0.1:4006'),
    aiGateway: optional('AI_GATEWAY_SERVICE_URL', 'http://127.0.0.1:4007'),
  };

  if (options?.additionalServices) {
    for (const [name, def] of Object.entries(options.additionalServices)) {
      services[name] = optional(def.envVar, def.defaultUrl);
    }
  }

  const configParams = {
    serviceCode,
    port: optionalInt('PORT', 4000),
    nodeEnv: optional('NODE_ENV', 'development'),
    logLevel: optional('LOG_LEVEL', 'info'),
    db: {
      connectionString: optional('DATABASE_URL',
        `postgresql://${optional('PG_USER', 'shahin')}:${optional('PG_PASSWORD', '')}@${optional('PG_HOST', 'localhost')}:${optional('PG_PORT', '5432')}/${optional('PG_DATABASE', 'shahin_grc')}`
      ),
      poolMax: optionalInt('DB_POOL_MAX', 10),
      ssl: optionalBool('PG_SSL', false),
    },
    redis: {
      url: optional('REDIS_URL', `redis://${optional('REDIS_HOST', '127.0.0.1')}:${optional('REDIS_PORT', '6379')}`),
      prefix: optional('REDIS_PREFIX', 'dos:'),
    },
    services,
    ...options?.overrides,
  };

  if (!options?.skipValidation) {
    const parsed = ServiceRuntimeConfigSchema.safeParse(configParams);
    if (!parsed.success) {
      const issues: ConfigIssue[] = parsed.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      throw new ConfigValidationError(serviceCode, issues);
    }

    // Phase 2 tenant-safety gate: in production, RLS must be explicitly on.
    // packages/dos-db/src/tenant.ts only sets app.current_tenant_id /
    // app.current_user_id GUCs when RLS_ENABLED='true'. If RLS is off in
    // production, the database has no row-level defence against cross-tenant
    // reads — boot must fail fast, not warn and continue.
    if (configParams.nodeEnv === 'production' && process.env.RLS_ENABLED !== 'true') {
      throw new ConfigValidationError(serviceCode, [{
        field: 'RLS_ENABLED',
        message: 'RLS_ENABLED must be exactly "true" in production. Row-level security is the last defence for tenant isolation and cannot be disabled on prod deployments.',
        value: process.env.RLS_ENABLED ?? '<unset>',
      }]);
    }
  }

  return configParams as ServiceRuntimeConfig;
}

/**
 * Load DB-driven config overlay and inject into process.env.
 * Called AFTER DB pool is initialized. Reads dos.config_values and
 * dos.platform_operation_config, then injects non-secret values
 * into process.env so all services pick them up.
 */
const DB_OVERLAY_TIMEOUT_MS = parseInt(process.env.DB_OVERLAY_TIMEOUT_MS ?? '8000', 10);

export async function loadDbConfigOverlay(serviceCode: string): Promise<{ loaded: number; skipped: number }> {
  let loaded = 0;
  let skipped = 0;

  let getPool: () => import('pg').Pool;
  try {
    const db = await import('@dos/db');
    if (typeof (db as { getPool?: unknown }).getPool !== 'function') {
      throw new Error('@dos/db does not export getPool() — incompatible package version');
    }
    getPool = () => (db as unknown as { getPool: () => import('pg').Pool }).getPool();
  } catch (err) {
    console.warn(`[runtime-config] ${serviceCode}: @dos/db unavailable — DB config overlay skipped (using env defaults): ${(err as Error).message}`);
    return { loaded, skipped };
  }

  const timeoutMs = DB_OVERLAY_TIMEOUT_MS;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined = undefined;

  try {
    const pool = getPool();
    const healthResult = await Promise.race([
      pool.query('SELECT 1 AS health'),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`DB health check timed out after ${timeoutMs}ms — pool may be exhausted or DB unreachable`));
        }, timeoutMs);
      }),
    ]);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle!);
      timeoutHandle = undefined;
    }

    if (healthResult.rows[0]?.health !== 1) {
      console.warn(`[runtime-config] ${serviceCode}: DB health check returned unexpected result — skipping overlay`);
      return { loaded, skipped };
    }

    const { safeQuery } = await import('@dos/db');

    const definitions = await Promise.race([
      safeQuery(
        `SELECT cd.key, cd.default_value, cd.is_secret, cd.deployment_only,
                cv.value AS override_value
         FROM dos.config_definitions cd
         LEFT JOIN dos.config_values cv ON cv.definition_id = cd.id
           AND cv.scope_type = 'platform' AND cv.is_active = TRUE
         WHERE cd.ui_exposable = TRUE OR cd.deployment_only = FALSE`,
      ),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Config definitions query timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle!);
      timeoutHandle = undefined;
    }

    for (const row of definitions.rows as Array<Record<string, unknown>>) {
      if (!row.key || typeof row.key !== 'string') { skipped++; continue; }
      const envKey = String(row.key).replace(/\./g, '_').toUpperCase();
      if (process.env[envKey] !== undefined) { skipped++; continue; }
      if (row.is_secret) { skipped++; continue; }
      const value = row.override_value ?? row.default_value;
      if (value !== null && value !== undefined) {
        const parsed = typeof value === 'string' ? value : JSON.stringify(value);
        const clean = parsed.startsWith('"') && parsed.endsWith('"')
          ? parsed.slice(1, -1)
          : parsed;
        process.env[envKey] = clean;
        loaded++;
      }
    }

    const opConfigs = await Promise.race([
      safeQuery(`SELECT config_key, config_value FROM dos.platform_operation_config`),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Platform operation config query timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle!);
      timeoutHandle = undefined;
    }

    for (const row of opConfigs.rows as Array<Record<string, unknown>>) {
      if (!row.config_key || typeof row.config_key !== 'string') { skipped++; continue; }
      const envKey = String(row.config_key).replace(/\./g, '_').toUpperCase();
      if (process.env[envKey] === undefined && row.config_value) {
        process.env[envKey] = typeof row.config_value === 'string'
          ? row.config_value
          : JSON.stringify(row.config_value);
        loaded++;
      }
    }

    console.log(`[runtime-config] ${serviceCode}: loaded ${loaded} DB config values, skipped ${skipped} (env-overridden or secret)`);
  } catch (err) {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle!);
      timeoutHandle = undefined;
    }
    const msg = (err as Error).message;
    if (msg.includes('timed out')) {
      console.warn(`[runtime-config] ${serviceCode}: DB config overlay timed out (using env defaults): ${msg}`);
    } else if (msg.includes('connection refused') || msg.includes('ECONNREFUSED')) {
      console.warn(`[runtime-config] ${serviceCode}: DB config overlay unreachable (using env defaults): ${msg}`);
    } else if (msg.includes('password authentication failed') || msg.includes('FATAL')) {
      console.error(`[runtime-config] ${serviceCode}: DB config overlay auth failed — check credentials: ${msg}`);
    } else {
      console.warn(`[runtime-config] ${serviceCode}: DB config overlay failed (using env defaults): ${msg}`);
    }
  }

  return { loaded, skipped };
}

/**
 * Journey / onboarding feature flags (Phase 0.6).
 * Loaded from process.env; no silent fallbacks beyond documented defaults.
 */
export interface JourneyFeatureFlags {
  /** When true, complete-onboarding requires verified email (409 otherwise). */
  onboardingRequireEmailVerified: boolean;
  /** When false, email verification is disabled and users are auto-verified at registration time. */
  onboardingEmailVerificationEnabled: boolean;
  /** When true, public register requires CAPTCHA verification (Phase 7). */
  captchaRequired: boolean;
  /** When false, provisioning worker is disabled (register still creates tenant row). */
  provisioningWorkerEnabled: boolean;
  /**
   * When true (default), Shahin-AI shows the Foundation Intake (one-form) flow
   * at /onboarding/session/:sessionId/questions and hides the legacy 18-stage
   * stepper. The legacy components remain in code; setting this to false
   * restores the prior multi-stage UI.
   */
  foundationIntakeOnly: boolean;
}

export function getJourneyFeatureFlags(): JourneyFeatureFlags {
  const nodeEnv = process.env.NODE_ENV || 'development';
  return {
    onboardingRequireEmailVerified: optionalBool('ONBOARDING_REQUIRE_EMAIL_VERIFIED', false),
    onboardingEmailVerificationEnabled: optionalBool('ONBOARDING_EMAIL_VERIFICATION_ENABLED', true),
    captchaRequired: optionalBool('CAPTCHA_REQUIRED', nodeEnv === 'production'),
    provisioningWorkerEnabled: optionalBool('PROVISIONING_WORKER_ENABLED', true),
    foundationIntakeOnly: optionalBool('SHAHIN_FOUNDATION_INTAKE_ONLY', true),
  };
}

export { required, optional, optionalInt, optionalBool };
