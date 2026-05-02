export interface EvidenceQualityScore {
    evidenceId: string;
    compositeScore: number;
    qualityTier: 'A' | 'B' | 'C';
    dimensionScores: {
        freshness: number;
        completeness: number;
        sourceReliability: number;
        reviewerSignOff: number;
        formatMatch: number;
    };
    breakdown: {
        freshness: {
            score: number;
            reason: string;
        };
        completeness: {
            score: number;
            reason: string;
        };
        sourceReliability: {
            score: number;
            reason: string;
        };
        reviewerSignOff: {
            score: number;
            reason: string;
        };
        formatMatch: {
            score: number;
            reason: string;
        };
    };
    computedAt: string;
}
interface QualityWeights {
    freshness: number;
    completeness: number;
    sourceReliability: number;
    reviewerSignOff: number;
    formatMatch: number;
}
/**
 * Load quality scoring weights from evidence_quality_rules table.
 * Maps dimension codes to weight multipliers. Normalizes so total = 1.0.
 * Falls back to hardcoded defaults if table does not exist or is empty.
 */
export declare function loadQualityWeightsFromDb(tenantId: string): Promise<QualityWeights>;
/** Clear cached weights (e.g., after admin updates rules). */
export declare function invalidateQualityWeightsCache(): void;
/**
 * Score a single evidence item and update its quality_tier.
 * Returns the full quality score breakdown.
 */
export declare function scoreEvidenceQuality(tenantId: string, evidenceId: string): Promise<EvidenceQualityScore>;
/**
 * Batch score multiple evidence items.
 * Returns array of quality scores.
 */
export declare function batchScoreEvidenceQuality(tenantId: string, evidenceIds: string[]): Promise<EvidenceQualityScore[]>;
/**
 * Score all evidence for a specific control.
 * Useful for recalculating control effectiveness after evidence changes.
 */
export declare function scoreControlEvidence(tenantId: string, controlId: string): Promise<EvidenceQualityScore[]>;
/**
 * Get average evidence quality score for a control.
 * Used in control effectiveness calculation.
 */
export declare function getControlEvidenceQualityAverage(tenantId: string, controlId: string): Promise<{
    averageScore: number;
    tier: 'A' | 'B' | 'C';
    evidenceCount: number;
}>;
export {};
