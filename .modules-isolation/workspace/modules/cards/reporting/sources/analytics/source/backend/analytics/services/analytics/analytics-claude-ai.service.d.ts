/**
 * Analytics Claude AI Service -- AI-powered trend analysis, anomaly detection,
 * natural language KPI summaries, and predictive narratives.
 *
 * MP-12 SS8: Allowed AI participation:
 *   - Anomaly explanation
 *   - Trend narration
 *   - Insight summarization
 *   - Benchmark interpretation
 *
 * MP-12 SS8.2: Restricted AI behavior:
 *   - Silent mutation of certified metrics
 *   - Protected publish actions outside workflow + DAuth
 *   - Hidden scope reclassification
 *
 * Uses the centralized Claude client from the AI module.
 * All AI operations are logged for audit trail (Law 12).
 *
 * @owner analytics
 * @module analytics
 */
export interface TrendNarrationResult {
    narrative: string;
    keyInsights: string[];
    trendDirection: 'improving' | 'declining' | 'stable' | 'volatile';
    confidence: number;
    modelUsed: string;
    tokensUsed: {
        input?: number;
        output?: number;
        inputTokens?: number;
        outputTokens?: number;
    };
}
export interface AnomalyExplanationResult {
    explanation: string;
    possibleCauses: string[];
    suggestedActions: string[];
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    modelUsed: string;
    tokensUsed: {
        input?: number;
        output?: number;
        inputTokens?: number;
        outputTokens?: number;
    };
}
export interface KpiSummaryResult {
    executiveSummary: string;
    highlights: string[];
    concerns: string[];
    recommendations: string[];
    overallHealthAssessment: string;
    confidence: number;
    modelUsed: string;
    tokensUsed: {
        input?: number;
        output?: number;
        inputTokens?: number;
        outputTokens?: number;
    };
}
export interface BenchmarkInterpretationResult {
    interpretation: string;
    strengths: string[];
    weaknesses: string[];
    industryComparison: string;
    improvementAreas: string[];
    confidence: number;
    modelUsed: string;
    tokensUsed: {
        input?: number;
        output?: number;
        inputTokens?: number;
        outputTokens?: number;
    };
}
export interface PredictiveNarrativeResult {
    narrative: string;
    riskFactors: string[];
    opportunities: string[];
    timelineAssessment: string;
    actionPlan: string[];
    confidence: number;
    modelUsed: string;
    tokensUsed: {
        input?: number;
        output?: number;
        inputTokens?: number;
        outputTokens?: number;
    };
}
/**
 * Generate a natural language narration of KPI trends over a time period.
 *
 * MP-12 SS8.1: Trend narration is an allowed AI participation.
 */
export declare function generateTrendNarration(tenantId: string, kpiData: {
    metricName: string;
    dataPoints: {
        date: string;
        value: number;
    }[];
    currentValue: number;
    previousValue: number;
    targetValue?: number;
}): Promise<TrendNarrationResult>;
/**
 * Explain a detected anomaly in analytics metrics.
 *
 * MP-12 SS8.1: Anomaly explanation is an allowed AI participation.
 */
export declare function explainAnomaly(tenantId: string, anomalyData: {
    metricCode: string;
    currentValue: number;
    expectedRange: {
        min: number;
        max: number;
    };
    historicalAverage: number;
    recentChanges: string[];
    relatedModuleEvents: string[];
}): Promise<AnomalyExplanationResult>;
/**
 * Generate an executive-level KPI summary for tenant dashboards.
 *
 * MP-12 SS8.1: Insight summarization is an allowed AI participation.
 */
export declare function generateKpiSummary(tenantId: string, kpis: {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
    vendorHealthScore: number;
    vendorRiskExposure: number;
}): Promise<KpiSummaryResult>;
/**
 * Interpret benchmark data comparing tenant metrics against industry standards.
 *
 * MP-12 SS8.1: Benchmark interpretation is an allowed AI participation.
 */
export declare function interpretBenchmark(tenantId: string, benchmarkData: {
    tenantMetrics: Record<string, number>;
    industryAverages: Record<string, number>;
    industryMedians: Record<string, number>;
    peerGroupSize: number;
    industry: string;
}): Promise<BenchmarkInterpretationResult>;
/**
 * Generate a predictive narrative for projected KPI trajectories.
 *
 * Combines trend analysis with forward-looking risk assessment
 * to provide actionable planning guidance.
 */
export declare function generatePredictiveNarrative(tenantId: string, predictions: {
    metricName: string;
    currentValue: number;
    predictedValue: number;
    targetValue: number;
    daysAhead: number;
    confidence: number;
    historicalTrend: 'improving' | 'declining' | 'stable';
}): Promise<PredictiveNarrativeResult>;
/**
 * Run anomaly scanning across all metrics for a tenant.
 * Identifies statistical outliers and generates explanations.
 */
export declare function scanForAnomalies(tenantId: string): Promise<Array<{
    metricCode: string;
    currentValue: number;
    expectedRange: {
        min: number;
        max: number;
    };
    deviationPct: number;
    explanation: AnomalyExplanationResult;
}>>;
