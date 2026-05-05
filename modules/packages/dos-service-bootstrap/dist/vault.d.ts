export interface GetSecretOptions {
    /** Env var name to read if Vault is unavailable. */
    fallbackEnv?: string;
    /** Override the kv-v2 mount prefix. */
    pathPrefix?: string;
    /**
     * When false, do not read `fallbackEnv` after Vault misses — lets callers chain HTTP/other providers first.
     * Default true.
     */
    includeEnvironmentFallback?: boolean;
}
export declare function getSecret(key: string, opts?: GetSecretOptions): Promise<string | undefined>;
export declare function clearSecretCache(): void;
export declare function vaultEnabled(): boolean;
//# sourceMappingURL=vault.d.ts.map