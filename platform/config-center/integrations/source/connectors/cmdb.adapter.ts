import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';

export class CMDBAdapter extends BaseAdapter {
  async authenticate(config: ConnectorConfig): Promise<AuthToken> {
    const { apiKey, apiUrl } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';
    const response = await fetch(`${url}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
      body: JSON.stringify({ grant_type: 'api_key' }),
    });
    if (!response.ok) {
      throw new Error(`CMDB auth failed: ${response.status} ${response.statusText}`);
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
    const params = new URLSearchParams();
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));
    const response = await fetch(`${url}/api/cmdb/assets?${params}`, {
      headers: { Authorization: `Bearer ${this.token?.token}` },
    });
    if (!response.ok) {
      throw new Error(`CMDB extract failed: ${response.status}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const records = (data.items as Record<string, unknown>[]) || (data.data as Record<string, unknown>[]) || [];
    return { records, metadata: { total: data.total, offset: data.offset } };
  }

  map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[] {
    return raw.map((record) => ({
      controlId: (fieldMapping?.controlId && (record[fieldMapping.controlId] as string)) || (record.control_id as string) || '',
      evidenceType: 'cmdb_asset',
      sourceSystem: 'cmdb',
      collectionTimestamp: new Date().toISOString(),
      connectorVersion: '1.0.0',
      data: record,
      metadata: {
        assetId: record.sys_id || record.id || record.asset_id,
        assetClass: record.sys_class_name || record.asset_class,
      },
    }));
  }
}
