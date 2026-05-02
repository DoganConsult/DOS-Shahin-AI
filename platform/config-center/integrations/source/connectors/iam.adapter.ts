import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';

export class IAMAdapter extends BaseAdapter {
  async authenticate(config: ConnectorConfig): Promise<AuthToken> {
    const { apiKey, apiUrl, username, password } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';
    let token: string;
    let expiresAt: string;

    if (username && password) {
      const response = await fetch(`${url}/api/v1/authn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error(`IAM auth failed: ${response.status} ${response.statusText}`);
      const data = (await response.json()) as Record<string, unknown>;
      token = (data.sessionToken as string) || (data.access_token as string) || '';
      expiresAt = (data.expiresAt as string) || new Date(Date.now() + 3600_000).toISOString();
    } else {
      token = apiKey || '';
      expiresAt = new Date(Date.now() + 3600_000).toISOString();
    }

    this.token = { token, expiresAt };
    return this.token;
  }

  async extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult> {
    if (this.isTokenExpired()) await this.authenticate(config);
    const { apiUrl } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';
    const resource = (query?.resource as string) || 'users';
    const params = new URLSearchParams();
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.after) params.set('after', String(query.after));
    const response = await fetch(`${url}/api/v1/${resource}?${params}`, {
      headers: {
        Authorization: `SSWS ${this.token?.token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error(`IAM extract failed: ${response.status}`);
    const records = (await response.json()) as Record<string, unknown>[];
    return { records: Array.isArray(records) ? records : [], metadata: { resource } };
  }

  map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[] {
    return raw.map((record) => ({
      controlId: (fieldMapping?.controlId && (record[fieldMapping.controlId] as string)) || (record.control_id as string) || '',
      evidenceType: 'iam_user_access',
      sourceSystem: 'iam',
      collectionTimestamp: new Date().toISOString(),
      connectorVersion: '1.0.0',
      data: record,
      metadata: {
        userId: record.id,
        login: record.login || (record.profile as Record<string, unknown>)?.login,
        status: record.status,
        lastLogin: record.lastLogin,
      },
    }));
  }
}
