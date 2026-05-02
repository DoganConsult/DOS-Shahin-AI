import { BCP_LIMITS, BCP_TIMEOUTS, BCP_BUSINESS_THRESHOLDS, BCP_DEFAULT_RTO_HOURS, BCP_DEFAULT_RPO_HOURS } from './bcp-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface BcpSeedData {
  defaultConfigs: Record<string, unknown>;
  planTypes: Array<{ code: string; labelEn: string; labelAr: string }>;
  testTypes: Array<{ code: string; labelEn: string; labelAr: string; complexity: string }>;
  impactTiers: Array<{ code: string; labelEn: string; labelAr: string; maxRtoHours: number }>;
  activationTriggers: Array<{ code: string; labelEn: string; labelAr: string }>;
  bcpStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getBcpSeedData(): BcpSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'bcp',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: BCP_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      defaultRtoHours: BCP_DEFAULT_RTO_HOURS,
      defaultRpoHours: BCP_DEFAULT_RPO_HOURS,
      testFrequencyDays: BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS,
      testReminderBeforeDays: BCP_TIMEOUTS.TEST_REMINDER_BEFORE_DAYS,
      maxTeamMembers: BCP_LIMITS.MAX_TEAM_MEMBERS,
      maxRecoverySteps: BCP_LIMITS.MAX_RECOVERY_STEPS,
      maxCriticalSystems: BCP_LIMITS.MAX_CRITICAL_SYSTEMS,
      maxExportRows: BCP_LIMITS.MAX_EXPORT_ROWS,
    },
    planTypes: [
      { code: 'bcp', labelEn: 'Business Continuity Plan', labelAr: 'خطة استمرارية الأعمال' },
      { code: 'drp', labelEn: 'Disaster Recovery Plan', labelAr: 'خطة التعافي من الكوارث' },
      { code: 'crisis_management', labelEn: 'Crisis Management Plan', labelAr: 'خطة إدارة الأزمات' },
      { code: 'pandemic', labelEn: 'Pandemic Response Plan', labelAr: 'خطة الاستجابة للأوبئة' },
      { code: 'cyber_incident', labelEn: 'Cyber Incident Response', labelAr: 'خطة الاستجابة للحوادث السيبرانية' },
      { code: 'communication', labelEn: 'Crisis Communication Plan', labelAr: 'خطة اتصالات الأزمات' },
      { code: 'evacuation', labelEn: 'Evacuation Plan', labelAr: 'خطة الإخلاء' },
    ],
    testTypes: [
      { code: 'tabletop', labelEn: 'Tabletop Exercise', labelAr: 'تمرين طاولة', complexity: 'low' },
      { code: 'walkthrough', labelEn: 'Walkthrough', labelAr: 'تمرين مراجعة', complexity: 'low' },
      { code: 'simulation', labelEn: 'Simulation', labelAr: 'محاكاة', complexity: 'medium' },
      { code: 'full_scale', labelEn: 'Full-Scale Exercise', labelAr: 'تمرين كامل النطاق', complexity: 'high' },
      { code: 'parallel', labelEn: 'Parallel Test', labelAr: 'اختبار متوازي', complexity: 'high' },
      { code: 'cutover', labelEn: 'Cutover Test', labelAr: 'اختبار التحويل', complexity: 'critical' },
    ],
    impactTiers: [
      { code: 'tier1_critical', labelEn: 'Tier 1 - Critical', labelAr: 'المستوى 1 - حرج', maxRtoHours: 4 },
      { code: 'tier2_essential', labelEn: 'Tier 2 - Essential', labelAr: 'المستوى 2 - أساسي', maxRtoHours: 24 },
      { code: 'tier3_normal', labelEn: 'Tier 3 - Normal', labelAr: 'المستوى 3 - عادي', maxRtoHours: 72 },
      { code: 'tier4_deferrable', labelEn: 'Tier 4 - Deferrable', labelAr: 'المستوى 4 - قابل للتأجيل', maxRtoHours: 168 },
    ],
    activationTriggers: [
      { code: 'system_outage', labelEn: 'System Outage', labelAr: 'انقطاع النظام' },
      { code: 'natural_disaster', labelEn: 'Natural Disaster', labelAr: 'كارثة طبيعية' },
      { code: 'cyber_attack', labelEn: 'Cyber Attack', labelAr: 'هجوم سيبراني' },
      { code: 'pandemic', labelEn: 'Pandemic', labelAr: 'وباء' },
      { code: 'facility_loss', labelEn: 'Facility Loss', labelAr: 'فقدان المنشأة' },
      { code: 'key_personnel_loss', labelEn: 'Key Personnel Loss', labelAr: 'فقدان الكوادر الرئيسية' },
      { code: 'supply_chain', labelEn: 'Supply Chain Disruption', labelAr: 'اضطراب سلسلة التوريد' },
    ],
    bcpStatuses: [
      { code: 'draft', labelEn: 'Draft', labelAr: 'مسودة', terminal: false },
      { code: 'approved', labelEn: 'Approved', labelAr: 'معتمد', terminal: false },
      { code: 'active', labelEn: 'Active', labelAr: 'نشط', terminal: false },
      { code: 'testing', labelEn: 'Under Testing', labelAr: 'قيد الاختبار', terminal: false },
      { code: 'failed_test', labelEn: 'Test Failed', labelAr: 'فشل الاختبار', terminal: false },
      { code: 'review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', terminal: false },
      { code: 'retired', labelEn: 'Retired', labelAr: 'متقاعد', terminal: true },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
  };
}

export async function seedBcpModule(tenantId: string, schema: string): Promise<void> {
  const data = getBcpSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['bcp', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
