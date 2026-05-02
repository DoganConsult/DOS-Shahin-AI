import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';

export class ITSMAdapter extends BaseAdapter {
  async authenticate(config: ConnectorConfig): Promise<AuthToken> {
    const { apiKey, apiUrl, username, password, platform } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';

    if (platform === 'servicenow' && username && password) {
      const response = await fetch(`${url}/api/now/v1/table/sys_user?sysparm_limit=1`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          Accept: 'application/json',
        },
      });
      if (!response.ok) throw new Error(`ITSM ServiceNow auth failed: ${response.status}`);
      this.token = {
        token: Buffer.from(`${username}:${password}`).toString('base64'),
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        authType: 'basic',
      };
    } else {
      this.token = {
        token: apiKey || '',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        authType: 'api_key',
      };
    }
    return this.token;
  }

  async extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult> {
    if (this.isTokenExpired()) await this.authenticate(config);
    const { apiUrl, platform } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';

    let endpoint: string;
    let authHeader: string;

    if (platform === 'servicenow') {
      const table = (query?.table as string) || 'incident';
      const limit = query?.limit || 100;
      endpoint = `${url}/api/now/v1/table/${table}?sysparm_limit=${limit}`;
      authHeader = `Basic ${this.token?.token}`;
    } else {
      endpoint = `${url}/api/tickets?limit=${query?.limit || 100}`;
      authHeader = `Bearer ${this.token?.token}`;
    }

    const response = await fetch(endpoint, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`ITSM extract failed: ${response.status}`);
    const data = (await response.json()) as Record<string, unknown>;
    const records = (data.result as Record<string, unknown>[]) || (data.data as Record<string, unknown>[]) || [];
    return { records: Array.isArray(records) ? records : [], metadata: { platform } };
  }

  map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[] {
    return raw.map((record) => ({
      controlId: (fieldMapping?.controlId && (record[fieldMapping.controlId] as string)) || (record.control_id as string) || '',
      evidenceType: 'itsm_ticket',
      sourceSystem: 'itsm',
      collectionTimestamp: new Date().toISOString(),
      connectorVersion: '1.0.0',
      data: record,
      metadata: {
        ticketId: record.sys_id || record.id || record.ticket_id,
        state: record.state || record.status,
        priority: record.priority,
        category: record.category,
      },
    }));
  }
}
