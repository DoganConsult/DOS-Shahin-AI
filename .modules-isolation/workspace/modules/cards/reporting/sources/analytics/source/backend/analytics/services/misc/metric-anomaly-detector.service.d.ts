export interface MetricAnomaly {
    metricCode: string;
    metricName: string;
    currentValue: number;
    rollingMean: number;
    rollingStdDev: number;
    deviation: number;
    severity: 'warning' | 'critical';
    observationId?: string;
}
export interface AnomalyDetectionResult {
    tenantId: string;
    anomaliesDetected: MetricAnomaly[];
    metricsChecked: number;
    errors: string[];
}
/**
 * Main detection function: detects anomalies across all defined metrics.
 */
export declare function detectMetricAnomalies(tenantId: string): Promise<AnomalyDetectionResult>;
/**
 * Batch detection across all provisioned tenants (for job execution).
 */
export declare function detectMetricAnomaliesForAllTenants(): Promise<{
    totalTenants: number;
    totalAnomalies: number;
    errors: string[];
}>;
