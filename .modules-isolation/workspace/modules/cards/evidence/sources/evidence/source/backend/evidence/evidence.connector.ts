import type { GenericRow as _GenericRow } from '@dos/types';
// Evidence Connector Registry and Base Class
// Supports: AWS, Azure, GCP, Jira, ServiceNow, SharePoint, OneDrive, GoogleDrive, Splunk, Sentinel, QRadar, ElasticSIEM, GitHub, GitLab, O365, Gmail

export type EvidenceConnectorType =
  | 'aws' | 'azure' | 'gcp' | 'jira' | 'servicenow' | 'sharepoint' | 'onedrive' | 'googledrive'
  | 'splunk' | 'sentinel' | 'qradar' | 'elasticsiem' | 'github' | 'gitlab' | 'o365' | 'gmail';

export interface EvidenceConnectorConfig {
  id: string;
  type: EvidenceConnectorType;
  name: string;
  tenantId: string;
  auth: Record<string, unknown>;
  enabled: boolean;
  lastRun?: string;
  status?: 'ok' | 'error' | 'pending';
  errorMsg?: string;
}

export abstract class EvidenceConnector {
  config: EvidenceConnectorConfig;
  constructor(config: EvidenceConnectorConfig) { this.config = config; }
  abstract testConnection(): Promise<boolean>;
  abstract collectEvidence(): Promise<Record<string, unknown>[]>;
  abstract getStatus(): Promise<'ok'|'error'|'pending'>;
}

export type EvidenceConnectorRegistry = Record<string, EvidenceConnectorConfig>;
