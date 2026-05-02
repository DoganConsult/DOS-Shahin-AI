export interface PlatformDbConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionString?: string;
    ssl: {
        caPath?: string;
        rejectUnauthorized: boolean;
    };
    pool: {
        max: number;
        idleTimeoutMillis: number;
        connectionTimeoutMillis: number;
        statementTimeoutMs: number;
    };
}
export declare function getPlatformConnectionConfig(): PlatformDbConfig;
export declare function getConnectionString(): string;
export declare function resetPlatformDbConfigCache(): void;
export declare function buildSslFromConfig(ssl: {
    caPath?: string;
    rejectUnauthorized: boolean;
}): {
    rejectUnauthorized: boolean;
    ca?: string;
} | undefined;
export declare function buildPgSslConfig(): {
    rejectUnauthorized: boolean;
    ca?: string;
} | false;
