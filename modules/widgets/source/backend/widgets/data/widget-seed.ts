import { catchHandler, EC } from '@dos/platform-core/resilience';
export function getWidgetSeedData() {
  return {
    defaultConfigs: { moduleCode: 'widgets', cacheEnabled: true, cacheTtlSeconds: 300, maxWidgetsPerDashboard: 12, aiRecommendationsEnabled: true, executiveWidgetsEnabled: true },
    categories: [
      { code: 'executive', labelEn: 'Executive', labelAr: 'تنفيذي' },
      { code: 'insight', labelEn: 'Insight', labelAr: 'رؤية' },
      { code: 'kpi', labelEn: 'KPI', labelAr: 'مؤشر أداء' },
      { code: 'kri', labelEn: 'KRI', labelAr: 'مؤشر مخاطر' },
      { code: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' },
      { code: 'risk', labelEn: 'Risk', labelAr: 'مخاطر' },
      { code: 'audit', labelEn: 'Audit', labelAr: 'تدقيق' },
      { code: 'general', labelEn: 'General', labelAr: 'عام' },
    ],
  };
}

export async function seedWidgetsModule(tenantId: string, schema: string): Promise<void> {
  const data = getWidgetSeedData();
  const { safeQuery } = await import('../../../config/database.js');
  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id) VALUES ($1, $2, $3, $4) ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['widgets', key, JSON.stringify(value), tenantId]).catch(catchHandler(EC.EVENT_BUS));
  }
}
