/** Default per plan: unset NODE_ENV → treat as development (explicit product decision). */
export declare function resolveNodeEnv(): string;
export declare function isProductionLikeEnv(): boolean;
/**
 * Throws if secret is missing in production, or weak/short in staging/production.
 * @param context — service name for error messages
 */
export declare function assertJwtSigningSecret(secret: string | undefined, context: string): string;
/** Deterministic-enough for dev: one 48-byte hex secret per process per context label. */
export declare function getEphemeralDevJwtSecret(context: string): string;
/**
 * Resolve JWT signing secret: env in prod-like; ephemeral in dev/test when unset.
 */
export declare function resolveJwtSigningSecret(context: string): string;
