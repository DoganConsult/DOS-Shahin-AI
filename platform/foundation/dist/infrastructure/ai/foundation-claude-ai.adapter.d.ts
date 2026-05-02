/**
 * Foundation — AI-Powered Intelligence Service
 *
 * Provides Claude-powered analysis, recommendations, and natural language
 * summaries for the Foundation module. All AI operations are auditable (Law 12),
 * have graceful fallbacks when AI is unavailable, and respect DAuth boundaries.
 *
 * @owner Foundation module
 */
export interface AiAnalysisResult {
    summary: string;
    insights: string[];
    recommendations: string[];
    confidence: number;
    generatedAt: string;
}
export interface AiClassificationResult {
    category: string;
    subcategory: string | null;
    confidence: number;
    reasoning: string;
}
/**
 * Generate an AI-powered summary and analysis for the module's current state.
 */
export declare function generateAnalysis(tenantId: string, context?: Record<string, unknown>): Promise<AiAnalysisResult>;
/**
 * AI-powered classification for module entities.
 */
export declare function classifyEntity(tenantId: string, entityData: Record<string, unknown>): Promise<AiClassificationResult>;
/**
 * Generate natural language executive summary for dashboards.
 */
export declare function generateExecutiveSummary(tenantId: string, dashboardData: Record<string, unknown>): Promise<string>;
/**
 * AI-powered gap detection and recommendation engine.
 */
export declare function detectGapsAndRecommend(tenantId: string, currentState: Record<string, unknown>, targetState?: Record<string, unknown>): Promise<{
    gaps: string[];
    recommendations: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
}>;
