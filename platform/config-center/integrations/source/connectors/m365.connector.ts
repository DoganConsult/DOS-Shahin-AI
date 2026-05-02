import type { ConnectorConfig, EvidenceSubmission } from '@dos/types';
import { BaseAdapter, type AuthToken, type ExtractionResult } from './base.adapter';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class M365Connector extends BaseAdapter {
  async authenticate(config: ConnectorConfig): Promise<AuthToken> {
    const { tenantId, clientId, clientSecret } = config.credentials as Record<string, string>;
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('M365 connector requires tenantId, clientId, and clientSecret');
    }
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      const err = (await response.text());
      throw new Error(`M365 auth failed: ${response.status} ${err}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const expiresIn = (data.expires_in as number) || 3600;
    this.token = {
      token: data.access_token as string,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      tokenType: data.token_type as string,
    };
    return this.token;
  }

  async extract(config: ConnectorConfig, query?: Record<string, unknown>): Promise<ExtractionResult> {
    if (this.isTokenExpired()) await this.authenticate(config);
    const resource = (query?.resource as string) || 'users';
    const top = query?.limit || 100;

    let endpoint: string;
    if (resource === 'users') {
      endpoint = `${GRAPH_BASE}/users?$top=${top}&$select=id,displayName,userPrincipalName,accountEnabled,createdDateTime,lastSignInDateTime`;
    } else if (resource === 'groups') {
      endpoint = `${GRAPH_BASE}/groups?$top=${top}`;
    } else if (resource === 'auditLogs') {
      endpoint = `${GRAPH_BASE}/auditLogs/signIns?$top=${top}`;
    } else if (resource === 'mailboxes') {
      endpoint = `${GRAPH_BASE}/users?$top=${top}&$select=id,displayName,mail,mailboxSettings`;
    } else {
      endpoint = `${GRAPH_BASE}/${resource}?$top=${top}`;
    }

    const records: Record<string, unknown>[] = [];
    let nextLink: string | null = endpoint;

    while (nextLink) {
      const response = await fetch(nextLink, {
        headers: { Authorization: `Bearer ${this.token?.token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`M365 extract failed: ${response.status}`);
      const data = (await response.json()) as Record<string, unknown>;
      const items = (data.value as Record<string, unknown>[]) || [];
      records.push(...items);
      nextLink = (data['@odata.nextLink'] as string) || null;
      if (records.length >= Number(top)) break;
    }

    return { records, metadata: { resource, count: records.length } };
  }

  map(raw: Record<string, unknown>[], fieldMapping?: Record<string, string>): EvidenceSubmission[] {
    return raw.map((record) => ({
      controlId: (fieldMapping?.controlId && (record[fieldMapping.controlId] as string)) || (record.control_id as string) || '',
      evidenceType: 'm365_identity',
      sourceSystem: 'm365',
      collectionTimestamp: new Date().toISOString(),
      connectorVersion: '1.0.0',
      data: record,
      metadata: {
        userId: record.id,
        upn: record.userPrincipalName,
        displayName: record.displayName,
        accountEnabled: record.accountEnabled,
        lastSignIn: record.lastSignInDateTime,
      },
    }));
  }
}
