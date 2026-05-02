export declare const RISK_LEVELS: readonly ["critical", "high", "medium", "low", "negligible"];
export type RiskLevel = typeof RISK_LEVELS[number];
export declare function riskLevelFromScore(score: number): RiskLevel;
export interface RiskRecord {
    id: string;
    title: string;
    description?: string;
    inherentScore: number;
    residualScore: number;
    riskLevel: RiskLevel;
    status: 'open' | 'mitigated' | 'accepted' | 'transferred' | 'closed';
    ownerId?: string;
    treatmentPlan?: string;
}
export interface RiskTreatment {
    id: string;
    riskId: string;
    type: 'mitigate' | 'accept' | 'transfer' | 'avoid';
    status: 'planned' | 'in_progress' | 'completed';
    description: string;
}
