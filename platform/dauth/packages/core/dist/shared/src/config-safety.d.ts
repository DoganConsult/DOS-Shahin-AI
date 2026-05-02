/**
 * DAuth — assertDauthConfigSafe()
 *
 * The "golden rule" gate referenced throughout the DAuth runtime:
 *
 *   ENFORCE may only be enabled for an engine when:
 *     1. SHADOW=true is also set (or has been set in a previous cycle), AND
 *     2. the divergence-report job has produced ≥ 2 consecutive clean cycles
 *        (zero allow/deny mismatch between the engine and the authoritative
 *        decision), AND
 *     3. transport / realm / audience configuration matches the production
 *        spec (TLS, target realm, target audience, signed admin client).
 *
 * This module exposes a pure config-side check. The divergence-cycle
 * portion is read out of the live ledger by `verifyDivergenceClean()` and
 * is optional — services that do not have ledger access (e.g. gateway)
 * skip it via `{ skipDivergenceCheck: true }`.
 *
 * Failure policy:
 *   - In `mode: 'warn'` (default), we log violations and let the process
 *     continue.
 *   - In `mode: 'throw'`, we throw — used by the auth-service entrypoint
 *     when DAUTH_CONFIG_FAIL_CLOSED=true.
 */
export interface DauthConfigSafetyReport {
    ok: boolean;
    violations: Array<{
        code: string;
        severity: 'block' | 'warn';
        detail: string;
    }>;
    checked: {
        keycloak: {
            mode: 'off' | 'shadow' | 'enforce';
            realm?: string;
            audience?: string;
        };
        openfga: {
            mode: 'off' | 'shadow' | 'enforce';
        };
        cerbos: {
            mode: 'off' | 'shadow' | 'enforce';
        };
    };
}
export interface AssertDauthConfigSafeOptions {
    /** 'warn' (default) just logs; 'throw' throws on any block-severity violation. */
    mode?: 'warn' | 'throw';
    /** Skip the live ledger query (services without DB access). */
    skipDivergenceCheck?: boolean;
    /** Optional logger; defaults to console. */
    log?: {
        info?: (msg: string, meta?: Record<string, unknown>) => void;
        warn?: (msg: string, meta?: Record<string, unknown>) => void;
        error?: (msg: string, meta?: Record<string, unknown>) => void;
    };
}
export declare function assertDauthConfigSafe(opts?: AssertDauthConfigSafeOptions): DauthConfigSafetyReport;
/**
 * Read the latest divergence report from the decision ledger and verify the
 * last `windowsRequired` cycles had zero divergence. Returns `true` if the
 * gate is clean (i.e. ENFORCE may be promoted), `false` otherwise.
 *
 * The actual ledger query is delegated to the auth-service divergence-report
 * job module; this helper is a thin re-import so callers in other services
 * can use the same gate without depending on the job class directly.
 *
 * Caller passes a query function so we don't pull `@dos/db` into bundles
 * that don't need it (e.g. gateway).
 */
export declare function verifyDivergenceClean(queryFn: (sql: string, params: unknown[]) => Promise<{
    rows: Array<{
        engine: string;
        diverged: number;
    }>;
}>, opts?: {
    engine: string;
    windowsRequired?: number;
    windowMinutes?: number;
}): Promise<{
    clean: boolean;
    lastDivergedCount: number;
}>;
