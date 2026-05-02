/**
 * Executive module — AI recommendations.
 *
 * Produces rule-based executive-level insights derived from tenant KPI
 * snapshots, risk posture, and open incident counts. Shaped as a
 * Recommendation[] consumed by <app-ai-insight-panel>.
 *
 * W5 task — fills the previous stub that returned [].
 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export interface Recommendation {
    title: string;
    description: string;
    priority: RecommendationPriority;
    category: string;
    recommendedAction?: string;
}
export declare function getAiRecommendations(tenantId: string, _context?: Record<string, unknown>): Promise<Recommendation[]>;
