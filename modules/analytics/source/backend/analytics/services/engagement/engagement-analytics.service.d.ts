import type { VendorScoreSummary, QuestionnaireStats, RegulatorRequestSummary, PortfolioMetrics, SLABreachTrend } from '@dos/types';
/**
 * Returns vendor objects with vendor_id, name, current score,
 * score trend (last 5 data points), and risk tier.
 *
 * Requirement 19.2
 */
export declare function getVendorScores(tenantId: string): Promise<VendorScoreSummary[]>;
/**
 * Returns counts grouped by status + average completion time.
 *
 * Requirement 19.3
 */
export declare function getQuestionnaireStats(tenantId: string): Promise<QuestionnaireStats>;
/**
 * Returns request summary by status and average response time.
 *
 * Requirement 19.1
 */
export declare function getRegulatorRequests(tenantId: string): Promise<RegulatorRequestSummary>;
/**
 * Returns portfolio health metrics for a consultant.
 * Aggregates compliance scores, engagement scores, and findings
 * across all assigned clients.
 *
 * Requirement 19.1
 */
export declare function getConsultantPortfolio(consultantId: string): Promise<PortfolioMetrics>;
/**
 * Returns breach counts grouped by time period (daily for last 30 days)
 * and by vendor risk tier.
 *
 * SLA breaches are tracked via high-priority tasks created by the
 * vendor-compliance-sync service with title starting with "SLA breach:".
 *
 * Requirement 19.4
 */
export declare function getSLABreaches(tenantId: string): Promise<SLABreachTrend>;
