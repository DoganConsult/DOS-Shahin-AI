export interface BoardPackOptions {
    /** Restrict to a specific framework; null = all frameworks */
    frameworkId?: string;
    /** Include risk landscape section (default true) */
    includeRisk?: boolean;
    /** Include decisions section (default true) */
    includeDecisions?: boolean;
    /** Include recommendations section (default true) */
    includeRecommendations?: boolean;
    /** Report period start date (ISO string) */
    periodStart?: string;
    /** Report period end date (ISO string) */
    periodEnd?: string;
    /** Language preference: "both" | "en" | "ar" (default "both") */
    language?: "both" | "en" | "ar";
}
export interface BoardPackSection {
    sectionId: string;
    titleEn: string;
    titleAr: string;
    contentEn: string;
    contentAr: string;
    data?: Record<string, unknown>;
}
export interface BoardPack {
    tenantId: string;
    generatedAt: string;
    periodStart: string;
    periodEnd: string;
    sections: BoardPackSection[];
    metadata: {
        frameworkCount: number;
        controlCount: number;
        riskCount: number;
        overallCompliancePercent: number;
    };
}
export interface ComplianceNarrative {
    frameworkId: string;
    frameworkName: string;
    narrativeEn: string;
    narrativeAr: string;
    compliancePercent: number;
    totalControls: number;
    compliantControls: number;
    gapCount: number;
    generatedAt: string;
}
export interface RiskNarrative {
    narrativeEn: string;
    narrativeAr: string;
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    topRisks: Array<{
        titleEn: string;
        titleAr: string;
        riskLevel: string;
    }>;
    generatedAt: string;
}
/**
 * Generate a comprehensive board-ready governance pack with bilingual sections.
 * Pulls live data from assertion dashboard, risk register, decisions, and CAPAs.
 *
 * Sections produced:
 *   1. Executive Summary
 *   2. Compliance Posture
 *   3. Risk Landscape (optional)
 *   4. Key Governance Decisions (optional)
 *   5. Open Actions
 *   6. Recommendations (optional)
 */
export declare function generateBoardPack(tenantId: string, options?: BoardPackOptions): Promise<BoardPack>;
/**
 * Generate a detailed compliance narrative for a specific regulatory framework.
 * Provides bilingual (EN/AR) output with control-level detail.
 */
export declare function generateComplianceNarrative(tenantId: string, frameworkId: string): Promise<ComplianceNarrative>;
/**
 * Generate a risk posture narrative summarizing the organization's risk landscape
 * with bilingual output (EN/AR).
 */
export declare function generateRiskNarrative(tenantId: string): Promise<RiskNarrative>;
/**
 * Apply Arabic executive writing style to content.
 * Converts Western digits to Eastern Arabic-Indic numerals, adds RTL marks,
 * and replaces informal phrases with formal governance equivalents.
 */
export declare function formatForArabicExecutive(content: string): string;
/**
 * Apply English executive writing style to content.
 * Replaces informal language with formal board-level equivalents and
 * removes contractions for professional tone.
 */
export declare function formatForEnglishExecutive(content: string): string;
