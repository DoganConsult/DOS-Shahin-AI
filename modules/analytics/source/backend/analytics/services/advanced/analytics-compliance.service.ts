import type { AnalyticsContext, AdvancedAnalyticsResult } from './advanced-analytics.types';
import { computeKPIs } from '../analytics/analytics-kpi.service';
export { recalculateCompliancePostureIncremental } from '../analytics/analytics-compliance.service';

export async function getAdvancedComplianceAnalytics(ctx: AnalyticsContext): Promise<AdvancedAnalyticsResult> {
	const startedAt = Date.now();
	const kpis = await computeKPIs(ctx.tenantId);

	return {
		widgetId: 'advanced-compliance-analytics',
		data: {
			complianceScore: kpis.complianceScore,
			evidenceCoverage: kpis.evidenceCoverage,
			moduleCode: ctx.moduleCode ?? 'analytics',
			scenario: ctx.scenario ?? null,
			orgStatus: ctx.orgStatus ?? 'active',
		},
		metadata: {
			generatedAt: new Date().toISOString(),
			dataSource: 'computed',
			queryTimeMs: Date.now() - startedAt,
			recordCount: 2,
		},
	};
}
