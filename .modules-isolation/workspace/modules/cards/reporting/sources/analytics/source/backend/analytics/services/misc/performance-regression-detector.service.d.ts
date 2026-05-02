export interface RegressionConfig {
    agentId?: string;
    metric: 'latency' | 'success_rate' | 'cost' | 'error_rate';
    baselineWindowDays: number;
    detectionWindowDays: number;
    thresholdPct: number;
    minSampleSize: number;
}
export interface RegressionAlert {
    id: string;
    tenantId: string;
    agentId?: string;
    metric: string;
    baselineValue: number;
    currentValue: number;
    changePct: number;
    severity: 'info' | 'warning' | 'critical';
    detectedAt: Date;
    acknowledged: boolean;
}
/**
 * Detect regressions for an agent
 */
export declare function detectRegressions(tenantId: string, config: RegressionConfig): Promise<RegressionAlert[]>;
/**
 * Get regression alerts
 */
export declare function getRegressionAlerts(tenantId: string, agentId?: string, acknowledged?: boolean): Promise<RegressionAlert[]>;
/**
 * Acknowledge regression alert
 */
export declare function acknowledgeRegression(tenantId: string, alertId: string): Promise<void>;
