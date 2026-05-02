import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
export interface AuthToken {
    token: string;
    expiresAt: string;
    [key: string]: unknown;
}
export interface ExtractionResult {
    records: Record<string, unknown>[];
    metadata?: Record<string, unknown>;
}
export declare abstract class BaseAdapter {
    protected token: AuthToken | null;
    abstract authenticate(config: ConnectorConfig): Promise<AuthToken>;
    abstract extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult>;
    abstract map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[];
    healthCheck(config: ConnectorConfig): Promise<{
        healthy: boolean;
        latencyMs: number;
        error?: string;
    }>;
    protected isTokenExpired(): boolean;
}
