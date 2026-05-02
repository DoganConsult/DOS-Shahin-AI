import { catchHandler, EC } from '@dos/platform-core/resilience';
export interface WidgetsSeedData {
  defaultConfigs: Record<string, unknown>;
  statuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  priorities: Array<{ code: string; labelEn: string; labelAr: string }>;
}

export function getWidgetsSeedData(): WidgetsSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'widgets',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: 365,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
    },
    statuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
      { code: 'in_review', labelEn: 'In Review', labelAr: 'قيد المراجعة', terminal: false },
      { code: 'approved', labelEn: 'Approved', labelAr: 'معتمد', terminal: false },
      { code: 'suspended', labelEn: 'Suspended', labelAr: 'معلق', terminal: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    priorities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج' },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع' },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط' },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض' },
    ],
  };
}

export async function seedWidgetsModule(tenantId: string, schema: string): Promise<void> {
  const data = getWidgetsSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['widgets', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
