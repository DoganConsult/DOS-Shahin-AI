/**
 * GRC Query module — AI recommendations.
 *
 * Suggests canonical GRC queries based on tenant posture: untreated risks,
 * overdue control tests, expired evidence, recent findings. The panel
 * surface consumes these and allows the user to open each as a saved
 * query.
 */
export interface QueryRecommendation {
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    queryKey: string;
    filters?: Record<string, unknown>;
}
export declare function getAiRecommendations(tenantId: string, _context?: Record<string, unknown>): Promise<QueryRecommendation[]>;
