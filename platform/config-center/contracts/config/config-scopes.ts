// Config OS — scope, precedence, and source-type primitives.
//
// Resolution precedence (lowest → highest):
//   platform default → environment → product default → module default
//                    → tenant override → user override → runtime/session
//
// Secrets are NEVER returned through the frontend resolver — secret values
// live only server-side; FE receives only secret REFERENCES.

export type ConfigScope =
  | 'platform'      // System-wide defaults (auth mode, UI-OS version, default locale).
  | 'environment'   // Deployment env (API URLs, public runtime flags).
  | 'product'       // Per-product defaults (theme, route composition, subscribed modules).
  | 'module'        // Per-module defaults (feature flags, validation, widgets).
  | 'tenant'        // Tenant-admin overrides (locale, timezone, sector pack).
  | 'user'          // End-user preferences (language, density, layout).
  | 'secret';       // Server-only sensitive values (kept as references on FE).

export const CONFIG_SCOPE_PRECEDENCE: ReadonlyArray<ConfigScope> = [
  'platform',
  'environment',
  'product',
  'module',
  'tenant',
  'user',
  // 'secret' is not part of merge precedence — it's a separate boundary.
] as const;

export type ConfigSourceKind = 'declaration' | 'override' | 'session';

export interface ConfigSource {
  kind: ConfigSourceKind;
  scope: ConfigScope;
  scopeId?: string;     // tenantId / userId / productCode / moduleCode
  origin: string;       // file path, table row, env var, etc.
}

/** A single config key — stable, registry-allocated. */
export type ConfigKey = string;

/** Concrete value type for a config key (registered via the schema registry). */
export type ConfigValue = unknown;

export class ConfigValidationError extends Error {
  constructor(
    public readonly key: ConfigKey,
    public readonly scope: ConfigScope,
    public readonly reason: string,
  ) {
    super(`Config ${key}@${scope}: ${reason}`);
    this.name = 'ConfigValidationError';
  }
}
