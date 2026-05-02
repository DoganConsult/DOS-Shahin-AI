import { catchHandler, EC } from '@dos/platform-core/resilience';
export function getProactiveLeadershipSeedData() {
  return {
    defaultConfigs: {
      moduleCode: 'proactive-leadership',
      insightsEnabled: true,
      alertsEnabled: true,
      executiveBriefEnabled: true,
      defaultBriefPeriod: 'weekly',
      alertThreshold: 'high',
      aiInsightsEnabled: true,
    },
    insightTypes: [
      { code: 'risk_trend', labelEn: 'Risk Trend Analysis', labelAr: 'تحليل اتجاه المخاطر' },
      { code: 'compliance_drift', labelEn: 'Compliance Drift Detection', labelAr: 'كشف انحراف الامتثال' },
      { code: 'governance_gap', labelEn: 'Governance Gap', labelAr: 'فجوة حوكمة' },
      { code: 'strategic_opportunity', labelEn: 'Strategic Opportunity', labelAr: 'فرصة استراتيجية' },
      { code: 'anomaly', labelEn: 'Anomaly Detection', labelAr: 'كشف الشذوذ' },
    ],
  };
}

export async function seedProactiveLeadershipModule(tenantId: string, schema: string): Promise<void> {
  const data = getProactiveLeadershipSeedData();
  const { safeQuery } = await import('../../../config/database.js');
  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['proactive-leadership', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
