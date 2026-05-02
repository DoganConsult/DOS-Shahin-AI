import { safeQuery } from "@dos/db";

// ============================================
// Shahin — Analytics Types
// Shared interfaces for analytics module
// ============================================

export interface TenantKPIs {
  complianceScore: number;
  riskScore: number;
  evidenceCoverage: number;
  remediationClosureRate: number;
  vendorHealthScore: number;     // aggregate vendor risk posture (0-100, higher = healthier)
  vendorRiskExposure: number;    // % of controls dependent on vendors
  computedAt: Date;
}

export interface KPISnapshot {
  snapshotId: string;
  snapshotDate: Date;
  complianceScore: number;
  riskScore: number;
  evidenceCoverage: number;
  remediationClosureRate: number;
  rawData: Record<string, unknown>;
  createdAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  filters?: Record<string, unknown>;
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
  layout: string;
  theme?: string;
}
