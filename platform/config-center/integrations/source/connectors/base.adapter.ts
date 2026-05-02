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

export abstract class BaseAdapter {
  protected token: AuthToken | null = null;

  abstract authenticate(config: ConnectorConfig): Promise<AuthToken>;

  abstract extract(
    config: ConnectorConfig,
    query?: Record<string, unknown>
  ): Promise<ExtractionResult>;

  abstract map(
    raw: Record<string, unknown>[],
    fieldMapping?: Record<string, string>
  ): EvidenceSubmission[];

  async healthCheck(config: ConnectorConfig): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.authenticate(config);
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  protected isTokenExpired(): boolean {
    if (!this.token) return true;
    return new Date(this.token.expiresAt) <= new Date();
  }
}
