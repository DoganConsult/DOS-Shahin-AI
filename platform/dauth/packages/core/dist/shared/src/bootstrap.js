"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDauthSecretsAdapter = getDauthSecretsAdapter;
exports.bootstrapDauth = bootstrapDauth;
exports.getLastDauthBootstrapResult = getLastDauthBootstrapResult;
exports.parseIssuerList = parseIssuerList;
const token_verifier_factory_1 = require("./token-verifier-factory");
const keycloak_token_verifier_1 = require("./adapters/keycloak-token-verifier");
const rebac_factory_1 = require("./rebac-factory");
const abac_factory_1 = require("./abac-factory");
const cerbos_abac_adapter_1 = require("./adapters/cerbos-abac.adapter");
const config_safety_1 = require("./config-safety");
const vault_secrets_adapter_1 = require("./adapters/vault-secrets.adapter");
let lastSecretsAdapter = null;
/**
 * Read the last-resolved secrets adapter. Returns the env adapter when
 * Vault is not enabled; returns the Vault adapter when
 * `DAUTH_VAULT_ENABLED=true` + `VAULT_ADDR` + `VAULT_TOKEN` are present.
 * Never throws. Callers that need secrets should go through this so the
 * rollout can flip to Vault without code changes.
 */
function getDauthSecretsAdapter() {
    if (lastSecretsAdapter)
        return lastSecretsAdapter;
    lastSecretsAdapter = (0, vault_secrets_adapter_1.buildDefaultSecretsAdapter)();
    return lastSecretsAdapter;
}
function bootstrapDauth(opts) {
    const log = {
        info: opts.log?.info ?? ((m, meta) => console.info(m, meta ?? {})),
        warn: opts.log?.warn ?? ((m, meta) => console.warn(m, meta ?? {})),
        error: opts.log?.error ?? ((m, meta) => console.error(m, meta ?? {})),
    };
    // ── Config-safety gate (always runs, never throws unless DAUTH_CONFIG_FAIL_CLOSED=true) ──
    const failClosed = (process.env.DAUTH_CONFIG_FAIL_CLOSED || '').toLowerCase() === 'true';
    try {
        (0, config_safety_1.assertDauthConfigSafe)({ mode: failClosed ? 'throw' : 'warn', skipDivergenceCheck: true, log });
    }
    catch (err) {
        log.error('[DAuth] config-safety blocked startup', { error: err.message });
        throw err;
    }
    // ── TokenVerifier ──
    (0, token_verifier_factory_1.initTokenVerifierFactory)({ nativeVerify: opts.nativeVerify });
    const kcShadow = readBool('DAUTH_KEYCLOAK_SHADOW');
    const kcEnforce = readBool('DAUTH_KEYCLOAK_ENFORCE');
    const kcJwks = process.env.KEYCLOAK_JWKS_URL;
    const kcMode = kcEnforce ? 'enforce' : kcShadow ? 'shadow' : 'off';
    let kcResolved = { enabled: false, mode: kcMode };
    if ((kcShadow || kcEnforce) && kcJwks) {
        try {
            const verifier = new keycloak_token_verifier_1.KeycloakTokenVerifier({
                jwksUrl: kcJwks,
                issuer: parseIssuerList(process.env.KEYCLOAK_ISSUER),
                audience: process.env.KEYCLOAK_AUDIENCE || undefined,
                cacheTtlMs: process.env.KEYCLOAK_JWKS_CACHE_TTL_MS
                    ? parseInt(process.env.KEYCLOAK_JWKS_CACHE_TTL_MS, 10)
                    : undefined,
                payloadMapper: opts.keycloakPayloadMapper,
            });
            (0, token_verifier_factory_1.registerKeycloakVerifier)(verifier);
            kcResolved = { enabled: true, mode: kcMode, jwksUrl: kcJwks };
            log.info('[DAuth] Keycloak verifier registered', { mode: kcMode, jwksUrl: kcJwks });
            // Eager JWKS warmup — surface unreachable JWKS at startup. Fire-and-log;
            // do not block bootstrap so the service still starts in shadow.
            void verifier.warmup().then((r) => {
                if (r.ok) {
                    log.info('[DAuth] Keycloak JWKS warmup ok', { keyCount: r.keyCount });
                }
                else {
                    log.warn('[DAuth] Keycloak JWKS warmup failed', { error: r.error });
                    if (kcEnforce) {
                        log.error('[DAuth] ENFORCE=true with unreachable JWKS — verifier will fail-closed on first request');
                    }
                }
            });
        }
        catch (err) {
            log.error('[DAuth] Keycloak verifier registration failed — native only', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    else if (kcShadow || kcEnforce) {
        log.warn('[DAuth] Keycloak flag on but KEYCLOAK_JWKS_URL missing — native only');
    }
    // ── ReBAC (OpenFGA) ──
    const fgaShadow = readBool('DAUTH_OPENFGA_SHADOW');
    const fgaEnforce = readBool('DAUTH_OPENFGA_ENFORCE');
    const fgaApi = process.env.OPENFGA_API_URL;
    const fgaStore = process.env.OPENFGA_STORE_ID;
    const fgaModel = process.env.OPENFGA_MODEL_ID;
    const fgaMode = fgaEnforce ? 'enforce' : fgaShadow ? 'shadow' : 'off';
    let fgaResolved = { enabled: false, mode: fgaMode };
    if ((fgaShadow || fgaEnforce) && fgaApi && fgaStore && fgaModel) {
        (0, rebac_factory_1.initRebacFactory)({
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
            onMissingConfig: (reason) => log.warn('[DAuth] OpenFGA adapter unavailable — native only', { reason }),
        });
        fgaResolved = { enabled: true, mode: fgaMode, apiUrl: fgaApi, storeId: fgaStore };
        log.info('[DAuth] OpenFGA adapter registered', {
            mode: fgaMode,
            apiUrl: fgaApi,
            storeId: fgaStore,
            modelId: fgaModel,
        });
    }
    else {
        (0, rebac_factory_1.initRebacFactory)();
        if (fgaShadow || fgaEnforce) {
            log.warn('[DAuth] OpenFGA flag on but OPENFGA_API_URL/STORE_ID/MODEL_ID missing — native only');
        }
    }
    // ── ABAC (Cerbos) ──
    const cerbosShadow = readBool('DAUTH_CERBOS_SHADOW');
    const cerbosEnforce = readBool('DAUTH_CERBOS_ENFORCE');
    const cerbosUrl = process.env.CERBOS_PDP_URL;
    const cerbosMode = cerbosEnforce
        ? 'enforce'
        : cerbosShadow
            ? 'shadow'
            : 'off';
    let cerbosResolved = { enabled: false, mode: cerbosMode };
    if ((cerbosShadow || cerbosEnforce) && cerbosUrl) {
        try {
            const cerbos = new cerbos_abac_adapter_1.CerbosAbacAdapter({
                pdpUrl: cerbosUrl,
                timeoutMs: process.env.CERBOS_TIMEOUT_MS
                    ? parseInt(process.env.CERBOS_TIMEOUT_MS, 10)
                    : undefined,
                log: { warn: log.warn },
            });
            (0, abac_factory_1.initAbacFactory)({
                native: opts.nativeAbac,
                cerbos,
                shadow: cerbosShadow,
                enforce: cerbosEnforce,
            });
            cerbosResolved = { enabled: true, mode: cerbosMode, pdpUrl: cerbosUrl };
            log.info('[DAuth] Cerbos adapter registered', { mode: cerbosMode, pdpUrl: cerbosUrl });
        }
        catch (err) {
            log.error('[DAuth] Cerbos adapter registration failed — native only', {
                error: err instanceof Error ? err.message : String(err),
            });
            (0, abac_factory_1.initAbacFactory)({ native: opts.nativeAbac });
        }
    }
    else {
        (0, abac_factory_1.initAbacFactory)({ native: opts.nativeAbac });
        if (cerbosShadow || cerbosEnforce) {
            log.warn('[DAuth] Cerbos flag on but CERBOS_PDP_URL missing — native only');
        }
    }
    // ── Secrets (Vault when enabled, env otherwise) ──
    const vaultEnabled = readBool('DAUTH_VAULT_ENABLED');
    const vaultAddr = process.env.VAULT_ADDR;
    const vaultMount = process.env.VAULT_MOUNT || 'secret';
    const secretsAdapter = (0, vault_secrets_adapter_1.buildDefaultSecretsAdapter)();
    lastSecretsAdapter = secretsAdapter;
    const secretsResolved = {
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
    }
    else if (secretsAdapter.name === 'vault') {
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
let lastBootstrapResult = null;
/**
 * Read the last `bootstrapDauth()` result. Used by /health/dauth endpoints
 * so ops can see which adapters are enabled and in what mode without
 * re-running bootstrap. Returns null if bootstrap has not yet run.
 */
function getLastDauthBootstrapResult() {
    return lastBootstrapResult;
}
function readBool(key) {
    const v = process.env[key];
    if (!v)
        return false;
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
function parseIssuerList(raw) {
    if (!raw)
        return undefined;
    const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (list.length === 0)
        return undefined;
    if (list.length === 1)
        return list[0];
    return list;
}
//# sourceMappingURL=bootstrap.js.map