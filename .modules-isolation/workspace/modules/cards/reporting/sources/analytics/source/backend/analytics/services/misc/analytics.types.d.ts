export interface TenantKPIs {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
    vendorHealthScore: number;
    vendorRiskExposure: number;
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
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    filters?: Record<string, unknown>;
}
export interface DashboardConfig {
    widgets: DashboardWidget[];
    layout: string;
    theme?: string;
}
