export interface TenantKPIs {
  complianceScore?: number;
  riskScore?: number;
  evidenceCoverage?: number;
  remediationClosureRate?: number;
  vendorHealthScore?: number;
  vendorRiskExposure?: number;
  computedAt: Date;
  [key: string]: number | string | Date | null | undefined;
}

export interface KPISnapshot {
  capturedAt: string;
  kpis: TenantKPIs;
}

export interface DashboardWidget {
  id: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
  layout?: Record<string, unknown>;
}
