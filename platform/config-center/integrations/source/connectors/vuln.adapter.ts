import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';

export class VulnAdapter extends BaseAdapter {
  async authenticate(config: ConnectorConfig): Promise<AuthToken> {
    const { apiKey, apiUrl, accessKey, secretKey, platform } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';

    if (platform === 'tenable' && accessKey && secretKey) {
      const response = await fetch(`${url}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ApiKeys': `accessKey=${accessKey}; secretKey=${secretKey}`,
        },
      });
      if (!response.ok) throw new Error(`Vuln Tenable auth failed: ${response.status}`);
      this.token = {
        token: `accessKey=${accessKey}; secretKey=${secretKey}`,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        platform: 'tenable',
        authType: 'apikeys',
      };
    } else if (platform === 'qualys') {
      const response = await fetch(`${url}/api/2.0/fo/session/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'curl' },
        body: new URLSearchParams({ action: 'login', username: accessKey || '', password: secretKey || '' }).toString(),
      });
      if (!response.ok) throw new Error(`Vuln Qualys auth failed: ${response.status}`);
      const data = (await response.json()) as Record<string, unknown>;
      this.token = {
        token: (data.QualysSession as string) || apiKey || '',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        platform: 'qualys',
      };
    } else {
      this.token = {
        token: apiKey || '',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        platform: platform || 'generic',
      };
    }
    return this.token;
  }

  async extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult> {
    if (this.isTokenExpired()) await this.authenticate(config);
    const { apiUrl, platform } = config.credentials as Record<string, string>;
    const url = apiUrl || 'http://localhost';

    let endpoint: string;
    let headers: Record<string, string>;

    if (platform === 'tenable') {
      const severity = (query?.severity as string) || '';
      const params = new URLSearchParams({ limit: String(query?.limit || 100) });
      if (severity) params.set('severity', severity);
      endpoint = `${url}/workbenches/vulnerabilities?${params}`;
      headers = { 'X-ApiKeys': this.token?.token || '', Accept: 'application/json' };
    } else if (platform === 'qualys') {
      endpoint = `${url}/api/2.0/fo/asset/host/vm/detection/?action=list&show_results=1`;
      headers = { 'X-Requested-With': 'curl', Cookie: `QualysSession=${this.token?.token}` };
    } else {
      endpoint = `${url}/api/vulnerabilities?limit=${query?.limit || 100}`;
      headers = { Authorization: `Bearer ${this.token?.token}`, Accept: 'application/json' };
    }

    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw new Error(`Vuln extract failed: ${response.status}`);
    const data = (await response.json()) as Record<string, unknown>;
    const records = (data.vulnerabilities as Record<string, unknown>[])
      || (data.data as Record<string, unknown>[])
      || [];
    return { records: Array.isArray(records) ? records : [], metadata: { platform, count: records.length } };
  }

  map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[] {
    return raw.map((record) => ({
      controlId: (fieldMapping?.controlId && (record[fieldMapping.controlId] as string)) || (record.control_id as string) || '',
      evidenceType: 'vulnerability_finding',
      sourceSystem: 'vuln_scanner',
      collectionTimestamp: new Date().toISOString(),
      connectorVersion: '1.0.0',
      data: record,
      metadata: {
        vulnId: record.plugin_id || record.id || record.vuln_id,
        severity: record.severity,
        cvssScore: record.cvss_base_score || record.cvss,
        hostCount: record.count || record.host_count,
        cve: record.cve,
      },
    }));
  }
}
