export declare function forecastComplianceScore(tenantId: string, daysAhead?: number): Promise<{
    currentScore: number;
    predictedScore: number;
    confidence: number;
    trend: 'improving' | 'declining' | 'stable';
    dataPoints: Array<{
        date: string;
        score: number;
    }>;
}>;
export declare function estimateRemediationTime(tenantId: string, severity: string): Promise<{
    estimatedDays: number;
    p50Days: number;
    p90Days: number;
    sampleSize: number;
}>;
export declare function predictRiskEscalation(tenantId: string): Promise<Array<{
    riskId: string;
    title: string;
    currentScore: number;
    predictedScore: number;
    escalationProbability: number;
}>>;
export declare function forecastBCPReadiness(tenantId: string, daysAhead?: number): Promise<{
    currentReadiness: number;
    predictedReadiness: number;
    confidence: number;
    trend: 'improving' | 'declining' | 'stable';
    dataPoints: Array<{
        date: string;
        score: number;
    }>;
}>;
export declare function predictRecoveryGap(tenantId: string): Promise<Array<{
    strategyId: string;
    title: string;
    targetRtoHours: number;
    actualRtoHours: number;
    rtoGap: number;
    targetRpoHours: number;
    actualRpoHours: number;
    rpoGap: number;
    trend: 'widening' | 'closing' | 'stable';
}>>;
export declare function estimateNextIncidentImpact(tenantId: string): Promise<{
    highestRiskDomain: string;
    estimatedDowntimeHours: number;
    criticalProcessCount: number;
    unprotectedProcesses: number;
    readinessScore: number;
}>;
export declare function getAnalyticsDashboard(tenantId: string): Promise<{
    complianceForecast: any;
    riskEscalations: unknown[];
    remediationEstimates: Record<string, unknown>;
}>;
