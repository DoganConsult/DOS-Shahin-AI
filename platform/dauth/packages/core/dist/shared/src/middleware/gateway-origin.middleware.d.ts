/**
 * `requireGatewayOrigin` — Express middleware that verifies the
 * `x-dos-gateway-token` HMAC signed by the API gateway, pins the verified
 * identity onto `req.principal`, and (for back-compat) syncs `req.user` /
 * `req.tenantId` so existing code that reads those fields continues to work.
 *
 * Dual mode (Wave 1 rollout):
 *   - LEGACY_HEADER_TRUST=true  → MISSING token falls back to raw
 *     `x-user-*` / `x-tenant-id` headers (preserves pre-Wave-1 behavior).
 *     Logs a warning every fallback so we can verify cutover progress.
 *   - LEGACY_HEADER_TRUST=false → MISSING token returns 401. This is the
 *     terminal Wave-1 state.
 *
 * In BOTH modes, a token that is present-but-invalid (bad HMAC, expired,
 * replayed, malformed) returns 401. Fail-closed always. The flag only
 * controls the missing-token branch.
 *
 * Required env:
 *   GATEWAY_ORIGIN_HMAC_SECRET — ≥ 32 chars. Same value the gateway uses to
 *                                sign. Rotated independently from JWT key.
 *
 * Optional env:
 *   LEGACY_HEADER_TRUST          — 'true' | 'false' (default: 'true' until
 *                                  per-service cutover lands).
 *   GATEWAY_ORIGIN_CLOCK_SKEW_S  — clock-skew tolerance, default 5.
 */
import type { RequestHandler } from 'express';
import { type ReplayRegistry } from '../gateway-origin';
export interface RequireGatewayOriginOptions {
    /**
     * Override the secret resolver. By default reads
     * `GATEWAY_ORIGIN_HMAC_SECRET` from the environment.
     */
    resolveSecret?: () => string;
    /**
     * Override the dual-mode flag. By default reads `LEGACY_HEADER_TRUST`
     * from the environment.
     */
    resolveLegacyTrust?: () => boolean;
    /**
     * Replay registry. Default: process-wide in-memory registry. Pass a
     * Redis-backed registry in multi-instance deployments.
     */
    replayRegistry?: ReplayRegistry;
    /** Clock-skew tolerance (seconds). Default: env or 5. */
    clockSkewSeconds?: number;
    /** Inject a logger for tests. */
    logger?: {
        info: (msg: string, meta?: unknown) => void;
        warn: (msg: string, meta?: unknown) => void;
    };
}
export declare function requireGatewayOrigin(options?: RequireGatewayOriginOptions): RequestHandler;
