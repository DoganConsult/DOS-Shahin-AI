/**
 * Evidence Connector Factory — AGRC-OS
 * Creates typed connector instances based on connector type.
 */
import { EvidenceConnector, EvidenceConnectorConfig, EvidenceConnectorType } from '../evidence.connector';
import { SharePointConnector } from './sharepoint.connector';
import { GoogleDriveConnector } from './google-drive.connector';
import { JiraConnector } from './jira.connector';

const CONNECTOR_MAP: Partial<Record<EvidenceConnectorType, new (config: EvidenceConnectorConfig) => EvidenceConnector>> = {
  sharepoint: SharePointConnector,
  googledrive: GoogleDriveConnector,
  jira: JiraConnector,
};

export function createConnector(config: EvidenceConnectorConfig): EvidenceConnector {
  const ConnectorClass = CONNECTOR_MAP[config.type];
  if (!ConnectorClass) {
    throw new Error(`Unsupported connector type: ${config.type}. Supported: ${Object.keys(CONNECTOR_MAP).join(', ')}`);
  }
  return new ConnectorClass(config);
}

export function getSupportedConnectorTypes(): EvidenceConnectorType[] {
  return Object.keys(CONNECTOR_MAP) as EvidenceConnectorType[];
}

export async function testConnector(config: EvidenceConnectorConfig): Promise<{ type: string; connected: boolean; error?: string }> {
  try {
    const connector = createConnector(config);
    const connected = await connector.testConnection();
    return { type: config.type, connected };
  } catch (err: unknown) {
    return { type: config.type, connected: false, error: (err instanceof Error ? err.message : String(err)) };
  }
}
