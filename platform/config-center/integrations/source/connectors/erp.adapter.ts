import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';

export class ERPAdapter extends BaseAdapter {
  async authenticate(config: ConnectorConfig): Promise<AuthToken> {
    const { apiKey, apiUrl, clientId, clientSecret } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';
    const body = clientId
      ? JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
      : JSON.stringify({ grant_type: 'api_key', api_key: apiKey });
    const response = await fetch(`${url}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      throw new Error(`ERP auth failed: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    this.token = {
      token: (data.access_token as string) || apiKey || '',
      expiresAt: (data.expires_at as string) || expiresAt,
    };
    return this.token;
  }

  async extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult> {
    if (this.isTokenExpired()) await this.authenticate(config);
    const { apiUrl } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';
    const module = (query?.module as string) || 'user_access';
    const params = new URLSearchParams();
    if (query?.limit) params.set('$top', String(query.limit));
    if (query?.offset) params.set('$skip', String(query.offset));
    const response = await fetch(`${url}/api/erp/${module}?${params}`, {
      headers: { Authorization: `Bearer ${this.token?.token}` },
    });
    if (!response.ok) {
      throw new Error(`ERP extract failed: ${response.status}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const records = (data.value as Record<string, unknown>[]) || (data.data as Record<string, unknown>[]) || [];
    return { records, metadata: { total: data['@odata.count'], module } };
  }

  map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[] {
    return raw.map((record) => ({
      controlId: (fieldMapping?.controlId && (record[fieldMapping.controlId] as string)) || (record.control_id as string) || '',
      evidenceType: 'erp_access_review',
      sourceSystem: 'erp',
      collectionTimestamp: new Date().toISOString(),
      connectorVersion: '1.0.0',
      data: record,
      metadata: {
        userId: record.UserId || record.user_id || record.id,
        role: record.Role || record.role,
        module: record.Module || record.module,
      },
    }));
  }
}
