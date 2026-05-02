import type { TenantKPIs } from '../misc/analytics.types';
/**
 * Computes tenant KPIs by querying the tenant schema:
 * - compliance_score: average of all assessment scores
 * - risk_score: average risk_score from risks table
 * - evidence_coverage: percentage of controls with at least one evidence
 * - remediation_closure_rate: percentage of remediation_tasks with status 'completed'
 */
export declare function computeKPIs(tenantId: string): Promise<TenantKPIs>;
