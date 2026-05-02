export interface DoraIctAssetCreateDTO {
  name: string;
  assetType: string;
  criticality: string;
  vendor?: string;
  description?: string;
}

export interface DoraIctAssetUpdateDTO {
  name?: string;
  assetType?: string;
  criticality?: string;
  vendor?: string;
  description?: string;
  status?: string;
}

export interface DoraIctAssetResponseDTO {
  assetId: string;
  name: string;
  assetType: string;
  criticality: string;
  vendor: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoraResilienceTestCreateDTO {
  title: string;
  testType: string;
  scope: string;
  scheduledDate?: string;
  assetIds?: string[];
}

export interface DoraResilienceTestResponseDTO {
  testId: string;
  title: string;
  testType: string;
  scope: string;
  status: string;
  scheduledDate: string | null;
  completedAt: string | null;
  result: string | null;
  createdAt: string;
}

export interface DoraIncidentReportDTO {
  incidentId: string;
  title: string;
  severity: string;
  classification: string;
  reportedAt: string;
  resolvedAt: string | null;
  rootCause: string | null;
  status: string;
}

export interface DoraThreatIntelDTO {
  intelId: string;
  source: string;
  threatType: string;
  severity: string;
  description: string;
  receivedAt: string;
  acknowledged: boolean;
}

export interface DoraBackupConfigDTO {
  configId: string;
  assetId: string;
  backupType: string;
  frequency: string;
  retentionDays: number;
  lastTestedAt: string | null;
  status: string;
}
