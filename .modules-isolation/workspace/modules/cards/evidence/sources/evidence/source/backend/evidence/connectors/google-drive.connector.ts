/**
 * Google Drive Evidence Connector — AGRC-OS
 * Collects evidence files from Google Drive shared folders.
 */
import { EvidenceConnector, EvidenceConnectorConfig } from '../evidence.connector';
import type { GenericRow as _GenericRow } from '@dos/types';

interface GoogleDriveAuth {
  serviceAccountEmail: string;
  privateKey: string;
  folderId: string;
  scopes?: string[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  webViewLink: string;
}

export class GoogleDriveConnector extends EvidenceConnector {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: EvidenceConnectorConfig) {
    super(config);
  }

  private get auth(): GoogleDriveAuth {

    return this.config.auth as GoogleDriveAuth;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureToken();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${this.auth.folderId}?fields=id,name`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async collectEvidence(): Promise<Record<string, unknown>[]> {
    await this.ensureToken();

    const allFiles: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        q: `'${this.auth.folderId}' in parents and trashed = false`,
        fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)',
        pageSize: '100',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      allFiles.push(...(data.files || []));

      pageToken = data.nextPageToken;
    } while (pageToken && allFiles.length < 500);

    return allFiles.map((file) => ({
      sourceId: file.id,
      sourceSystem: 'googledrive',
      title: file.name,
      mimeType: file.mimeType,
      fileSizeBytes: parseInt(file.size || '0', 10),
      collectedAt: new Date().toISOString(),
      sourceModifiedAt: file.modifiedTime,
      metadata: {
        driveFileId: file.id,
        webViewLink: file.webViewLink,
        folderId: this.auth.folderId,
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

    const scopes = this.auth.scopes || ['https://www.googleapis.com/auth/drive.readonly'];
    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: this.auth.serviceAccountEmail,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })).toString('base64url');

    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(this.auth.privateKey, 'base64url');

    const jwt = `${header}.${payload}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Google OAuth error: ${response.status}`);
    }

    const tokenData = await response.json() as Record<string, unknown>;

    this.accessToken = tokenData.access_token;

    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
  }
}
