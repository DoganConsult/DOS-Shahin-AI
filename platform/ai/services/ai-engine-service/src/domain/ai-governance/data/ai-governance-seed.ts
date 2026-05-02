import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';

export interface AiGovernanceSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: Array<{ code: string; nameEn: string; nameAr: string; data: Record<string, unknown> }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getAiGovernanceSeedData(): AiGovernanceSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'ai-governance',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: 365,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
    },
    defaultTemplates: [
      {
        code: 'ai-governance_default',
        nameEn: 'Default AiGovernance Template',
        nameAr: 'قالب AiGovernance الافتراضي',
        data: { version: 1, fields: [], layout: 'standard' },
      },
    ],
  };
}

export async function seedAiGovernanceModule(tenantId: string, schema: string): Promise<void> {
  const data = getAiGovernanceSeedData();
  const { safeQuery } = await import('@dos/db');
  for (const config of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['ai-governance', config[0], JSON.stringify(config[1]), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
