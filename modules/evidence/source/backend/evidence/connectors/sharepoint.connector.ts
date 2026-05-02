/**
 * SharePoint Evidence Connector — AGRC-OS
 * Collects evidence files from SharePoint Online document libraries.
 */
import { EvidenceConnector, EvidenceConnectorConfig } from '../evidence.connector';
import type { GenericRow as _GenericRow } from '@dos/types';

interface SharePointAuth {
  tenantDomain: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
  libraryName: string;
  folderPath?: string;
}

interface SharePointFile {
  Name: string;
  ServerRelativeUrl: string;
  Length: string;
  TimeLastModified: string;
  UniqueId: string;
}

export class SharePointConnector extends EvidenceConnector {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: EvidenceConnectorConfig) {
    super(config);
  }

  private get auth(): SharePointAuth {

    return this.config.auth as SharePointAuth;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureToken();
      const response = await fetch(
        `${this.auth.siteUrl}/_api/web/title`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json;odata=nometadata',
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async collectEvidence(): Promise<Record<string, unknown>[]> {
    await this.ensureToken();
    const folderPath = this.auth.folderPath
      ? `/${this.auth.libraryName}/${this.auth.folderPath}`
      : `/${this.auth.libraryName}`;

    const url = `${this.auth.siteUrl}/_api/web/GetFolderByServerRelativeUrl('${encodeURIComponent(folderPath)}')/Files?$select=Name,ServerRelativeUrl,Length,TimeLastModified,UniqueId&$top=500`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json;odata=nometadata',
      },
    });

    if (!response.ok) {
      throw new Error(`SharePoint API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;

    const files: SharePointFile[] = data.value || [];

    return files.map((file) => ({
      sourceId: file.UniqueId,
      sourceSystem: 'sharepoint',
      title: file.Name,
      filePath: file.ServerRelativeUrl,
      fileSizeBytes: parseInt(file.Length, 10) || 0,
      collectedAt: new Date().toISOString(),
      sourceModifiedAt: file.TimeLastModified,
      metadata: {
        serverRelativeUrl: file.ServerRelativeUrl,
        siteUrl: this.auth.siteUrl,
        libraryName: this.auth.libraryName,
      },
    }));
  }

  async getStatus(): Promise<'ok' | 'error' | 'pending'> {
    try {
      const connected = await this.testConnection();
      return connected ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) return;

    const tokenUrl = `https://accounts.accesscontrol.windows.net/${this.auth.tenantDomain}/tokens/OAuth/2`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: `${this.auth.clientId}@${this.auth.tenantDomain}`,
      client_secret: this.auth.clientSecret,
      resource: `00000003-0000-0ff1-ce00-000000000000/${new URL(this.auth.siteUrl).hostname}@${this.auth.tenantDomain}`,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`SharePoint token error: ${response.status}`);
    }

    const tokenData = await response.json() as Record<string, unknown>;

    this.accessToken = tokenData.access_token;

    this.tokenExpiry = Date.now() + (parseInt(tokenData.expires_in, 10) * 1000);
  }
}
