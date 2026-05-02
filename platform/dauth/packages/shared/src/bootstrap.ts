/**
 * DAuth Enterprise Stack bootstrap — single entry point every service
 * calls once at startup to wire the pluggable adapters (TokenVerifier,
 * ReBAC) behind the @dos/auth ports.
 *
 * Contract:
 * - Reads env flags (`DAUTH_KEYCLOAK_SHADOW/ENFORCE`, `DAUTH_OPENFGA_SHADOW/ENFORCE`,
 *   `KEYCLOAK_*`, `OPENFGA_*`) and constructs the corresponding adapter
 *   only when the flag is on AND the config is complete.
 * - Never throws into the caller. Any construction failure is logged via
 *   the injected `log` hook and the factory falls back to native-only.
 * - Idempotent — calling twice reseats adapters, useful for hot reload in
 *   tests. Call sites in services should invoke this once in the
 *   entrypoint (typically `server.ts` before routes are mounted).
 *
 * The TokenVerifier factory additionally requires a project-supplied
 * native verify function; this module accepts it via `nativeVerify`.
 */
import type { MinimalAuthPayload } from './dauth-ports/token-verifier.port';
import type { AbacAdapter } from './dauth-ports/abac.port';
import {
  initTokenVerifierFactory,
  registerKeycloakVerifier,
  type InitTokenVerifierFactoryOptions,
} from './token-verifier-factory';
import { KeycloakTokenVerifier } from './adapters/keycloak-token-verifier';
import { initRebacFactory } from './rebac-factory';
import { initAbacFactory } from './abac-factory';
import { CerbosAbacAdapter } from './adapters/cerbos-abac.adapter';
import { assertDauthConfigSafe } from './config-safety';
import { buildDefaultSecretsAdapter } from './adapters/vault-secrets.adapter';
import type { SecretsAdapter } from './dauth-ports/secrets.port';

export interface DauthBootstrapOptions<P extends MinimalAuthPayload> {
  /** Native verify function (project's own JWT path). Required. */
  nativeVerify: InitTokenVerifierFactoryOptions<P>['nativeVerify'];
  /** Optional: map Keycloak claims → project AuthPayload. */
  keycloakPayloadMapper?: (raw: Record<string, unknown>) => P;
  /**
   * Project-supplied native ABAC adapter (platform/core's `NativeAbacAdapter`
   * runs the full 14-step pipeline). If omitted, bootstrap uses
   * `AbstainAbacAdapter` which always returns abstain — Cerbos still
   * participates but has nothing to diverge against.
   */
  nativeAbac?: AbacAdapter;
  /** Structured logger hooks. Defaults to console. */
  log?: {
    info?: (msg: string, meta?: Record<string, unknown>) => void;
    warn?: (msg: string, meta?: Record<string, unknown>) => void;
    error?: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

export interface DauthBootstrapResult {
  keycloak: {
    enabled: boolean;
    mode: 'off' | 'shadow' | 'enforce';
    jwksUrl?: string;
  };
  openfga: {
    enabled: boolean;
    mode: 'off' | 'shadow' | 'enforce';
    apiUrl?: string;
    storeId?: string;
  };
  cerbos: {
    enabled: boolean;
    mode: 'off' | 'shadow' | 'enforce';
    pdpUrl?: string;
  };
  secrets: {
    adapter: 'env' | 'vault';
    enabled: boolean;
    addr?: string;
    mount?: string;
  };
}

let lastSecretsAdapter: SecretsAdapter | null = null;

/**
 * Read the last-resolved secrets adapter. Returns the env adapter when
 * Vault is not enabled; returns the Vault adapter when
 * `DAUTH_VAULT_ENABLED=true` + `VAULT_ADDR` + `VAULT_TOKEN` are present.
 * Never throws. Callers that need secrets should go through this so the
 * rollout can flip to Vault without code changes.
 */
export function getDauthSecretsAdapter(): SecretsAdapter {
  if (lastSecretsAdapter) return lastSecretsAdapter;
  lastSecretsAdapter = buildDefaultSecretsAdapter();
  return lastSecretsAdapter;
}

export function bootstrapDauth<P extends MinimalAuthPayload = MinimalAuthPayload>(
  opts: DauthBootstrapOptions<P>,
): DauthBootstrapResult {
  const log = {
    info: opts.log?.info ?? ((m: string, meta?: Record<string, unknown>) => console.info(m, meta ?? {})),
    warn: opts.log?.warn ?? ((m: string, meta?: Record<string, unknown>) => console.warn(m, meta ?? {})),
    error: opts.log?.error ?? ((m: string, meta?: Record<string, unknown>) => console.error(m, meta ?? {})),
  };

  // ── Config-safety gate (always runs, never throws unless DAUTH_CONFIG_FAIL_CLOSED=true) ──
  const failClosed = (process.env.DAUTH_CONFIG_FAIL_CLOSED || '').toLowerCase() === 'true';
  try {
    assertDauthConfigSafe({ mode: failClosed ? 'throw' : 'warn', skipDivergenceCheck: true, log });
  } catch (err) {
    log.error('[DAuth] config-safety blocked startup', { error: (err as Error).message });
    throw err;
  }

  // ── TokenVerifier ──
  initTokenVerifierFactory<P>({ nativeVerify: opts.nativeVerify });
  const kcShadow = readBool('DAUTH_KEYCLOAK_SHADOW');
  const kcEnforce = readBool('DAUTH_KEYCLOAK_ENFORCE');
  const kcJwks = process.env.KEYCLOAK_JWKS_URL;
  const kcMode: 'off' | 'shadow' | 'enforce' = kcEnforce ? 'enforce' : kcShadow ? 'shadow' : 'off';
  let kcResolved: DauthBootstrapResult['keycloak'] = { enabled: false, mode: kcMode };

  if ((kcShadow || kcEnforce) && kcJwks) {
    try {
      const verifier = new KeycloakTokenVerifier<P>({
        jwksUrl: kcJwks,
        issuer: parseIssuerList(process.env.KEYCLOAK_ISSUER),
        audience: process.env.KEYCLOAK_AUDIENCE || undefined,
        cacheTtlMs: process.env.KEYCLOAK_JWKS_CACHE_TTL_MS
          ? parseInt(process.env.KEYCLOAK_JWKS_CACHE_TTL_MS, 10)
          : undefined,
        payloadMapper: opts.keycloakPayloadMapper as
          | ((raw: Record<string, unknown>) => MinimalAuthPayload)
          | undefined,
      });
      registerKeycloakVerifier<P>(verifier);
      kcResolved = { enabled: true, mode: kcMode, jwksUrl: kcJwks };
      log.info('[DAuth] Keycloak verifier registered', { mode: kcMode, jwksUrl: kcJwks });
      // Eager JWKS warmup — surface unreachable JWKS at startup. Fire-and-log;
      // do not block bootstrap so the service still starts in shadow.
      void verifier.warmup().then((r) => {
        if (r.ok) {
          log.info('[DAuth] Keycloak JWKS warmup ok', { keyCount: r.keyCount });
        } else {
          log.warn('[DAuth] Keycloak JWKS warmup failed', { error: r.error });
          if (kcEnforce) {
            log.error('[DAuth] ENFORCE=true with unreachable JWKS — verifier will fail-closed on first request');
          }
        }
      });
    } catch (err) {
      log.error('[DAuth] Keycloak verifier registration failed — native only', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (kcShadow || kcEnforce) {
    log.warn('[DAuth] Keycloak flag on but KEYCLOAK_JWKS_URL missing — native only');
  }

  // ── ReBAC (OpenFGA) ──
  const fgaShadow = readBool('DAUTH_OPENFGA_SHADOW');
  const fgaEnforce = readBool('DAUTH_OPENFGA_ENFORCE');
  const fgaApi = process.env.OPENFGA_API_URL;
  const fgaStore = process.env.OPENFGA_STORE_ID;
  const fgaModel = process.env.OPENFGA_MODEL_ID;
  const fgaMode: 'off' | 'shadow' | 'enforce' = fgaEnforce ? 'enforce' : fgaShadow ? 'shadow' : 'off';
  let fgaResolved: DauthBootstrapResult['openfga'] = { enabled: false, mode: fgaMode };

  if ((fgaShadow || fgaEnforce) && fgaApi && fgaStore && fgaModel) {
    initRebacFactory({
      openfga: {
        apiUrl: fgaApi,
        storeId: fgaStore,
        modelId: fgaModel,
        apiToken: process.env.OPENFGA_API_TOKEN || undefined,
        timeoutMs: process.env.OPENFGA_TIMEOUT_MS
          ? parseInt(process.env.OPENFGA_TIMEOUT_MS, 10)
          : undefined,
        retryAttempts: process.env.OPENFGA_RETRY_ATTEMPTS
          ? parseInt(process.env.OPENFGA_RETRY_ATTEMPTS, 10)
          : undefined,
      },
      onMissingConfig: (reason) =>
        log.warn('[DAuth] OpenFGA adapter unavailable — native only', { reason }),
    });
    fgaResolved = { enabled: true, mode: fgaMode, apiUrl: fgaApi, storeId: fgaStore };
    log.info('[DAuth] OpenFGA adapter registered', {
      mode: fgaMode,
      apiUrl: fgaApi,
      storeId: fgaStore,
      modelId: fgaModel,
    });
  } else {
    initRebacFactory();
    if (fgaShadow || fgaEnforce) {
      log.warn(
        '[DAuth] OpenFGA flag on but OPENFGA_API_URL/STORE_ID/MODEL_ID missing — native only',
      );
    }
  }

  // ── ABAC (Cerbos) ──
  const cerbosShadow = readBool('DAUTH_CERBOS_SHADOW');
  const cerbosEnforce = readBool('DAUTH_CERBOS_ENFORCE');
  const cerbosUrl = process.env.CERBOS_PDP_URL;
  const cerbosMode: 'off' | 'shadow' | 'enforce' = cerbosEnforce
    ? 'enforce'
    : cerbosShadow
      ? 'shadow'
      : 'off';
  let cerbosResolved: DauthBootstrapResult['cerbos'] = { enabled: false, mode: cerbosMode };

  if ((cerbosShadow || cerbosEnforce) && cerbosUrl) {
    try {
      const cerbos = new CerbosAbacAdapter({
        pdpUrl: cerbosUrl,
        timeoutMs: process.env.CERBOS_TIMEOUT_MS
          ? parseInt(process.env.CERBOS_TIMEOUT_MS, 10)
          : undefined,
        log: { warn: log.warn },
      });
      initAbacFactory({
        native: opts.nativeAbac,
        cerbos,
        shadow: cerbosShadow,
        enforce: cerbosEnforce,
      });
      cerbosResolved = { enabled: true, mode: cerbosMode, pdpUrl: cerbosUrl };
      log.info('[DAuth] Cerbos adapter registered', { mode: cerbosMode, pdpUrl: cerbosUrl });
    } catch (err) {
      log.error('[DAuth] Cerbos adapter registration failed — native only', {
        error: err instanceof Error ? err.message : String(err),
      });
      initAbacFactory({ native: opts.nativeAbac });
    }
  } else {
    initAbacFactory({ native: opts.nativeAbac });
    if (cerbosShadow || cerbosEnforce) {
      log.warn('[DAuth] Cerbos flag on but CERBOS_PDP_URL missing — native only');
    }
  }

  // ── Secrets (Vault when enabled, env otherwise) ──
  const vaultEnabled = readBool('DAUTH_VAULT_ENABLED');
  const vaultAddr = process.env.VAULT_ADDR;
  const vaultMount = process.env.VAULT_MOUNT || 'secret';
  const secretsAdapter = buildDefaultSecretsAdapter();
  lastSecretsAdapter = secretsAdapter;
  const secretsResolved: DauthBootstrapResult['secrets'] = {
    adapter: secretsAdapter.name === 'vault' ? 'vault' : 'env',
    enabled: secretsAdapter.name === 'vault',
    addr: secretsAdapter.name === 'vault' ? vaultAddr : undefined,
    mount: secretsAdapter.name === 'vault' ? vaultMount : undefined,
  };
  if (vaultEnabled && secretsAdapter.name !== 'vault') {
    log.warn('[DAuth] Vault enabled but config incomplete — using env secrets adapter', {
      addrPresent: !!vaultAddr,
      tokenPresent: !!process.env[process.env.VAULT_TOKEN_ENV ?? 'VAULT_TOKEN'],
    });
  } else if (secretsAdapter.name === 'vault') {
    log.info('[DAuth] Vault secrets adapter registered', { addr: vaultAddr, mount: vaultMount });
  }

  const result = {
    keycloak: kcResolved,
    openfga: fgaResolved,
    cerbos: cerbosResolved,
    secrets: secretsResolved,
  };
  lastBootstrapResult = result;
  return result;
}

let lastBootstrapResult: DauthBootstrapResult | null = null;

/**
 * Read the last `bootstrapDauth()` result. Used by /health/dauth endpoints
 * so ops can see which adapters are enabled and in what mode without
 * re-running bootstrap. Returns null if bootstrap has not yet run.
 */
export function getLastDauthBootstrapResult(): DauthBootstrapResult | null {
  return lastBootstrapResult;
}

function readBool(key: string): boolean {
  const v = process.env[key];
  if (!v) return false;
  const low = v.toLowerCase();
  return low === '1' || low === 'true';
}

/**
 * Parse a comma-separated KEYCLOAK_ISSUER env into the shape the verifier
 * expects. Empty → undefined (no issuer check). Single → string. Multiple →
 * string[]. The verifier accepts a token whose `iss` exactly matches any
 * entry — required for per-surface auth fronting hosts where the same KC
 * realm is reached via multiple hostnames.
 *
 * Exported for unit-testing. Callers should not read `KEYCLOAK_ISSUER`
 * directly — always route through this to keep parsing rules consistent
 * (trim, drop empties, collapse singleton list).
 */
export function parseIssuerList(raw: string | undefined): string | string[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return list;
}
