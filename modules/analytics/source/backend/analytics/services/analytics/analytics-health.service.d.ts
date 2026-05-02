/**
 * Compute Tenant Health Score (Composite Platform Metric)
 *
 * Aggregates platform-wide governance maturity into a single composite score (0-100).
 * Weights:
 * - Compliance posture: 25%
 * - Risk management maturity: 20%
 * - Evidence freshness: 15%
 * - Audit readiness: 15%
 * - Process task closure rate: 10%
 * - Agent effectiveness: 10%
 * - SoD compliance: 5%
 *
 * Stores the score as a cockpit signal and alerts if score drops >10 points in 7 days.
 *
 * @param tenantId - Tenant ID
 * @returns Composite health score (0-100) and component breakdown
 */
export declare function computeTenantHealthScore(tenantId: string): Promise<{
    healthScore: number;
    components: {
        compliancePosture: number;
        riskMaturity: number;
        evidenceFreshness: number;
        auditReadiness: number;
        taskClosureRate: number;
        agentEffectiveness: number;
        sodCompliance: number;
    };
    previousScore?: number;
    scoreChange?: number;
    alertTriggered?: boolean;
}>;
