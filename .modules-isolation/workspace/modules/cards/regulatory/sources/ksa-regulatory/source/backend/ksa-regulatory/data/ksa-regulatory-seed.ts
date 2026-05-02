import { KSA_FRAMEWORKS, KSA_AUTHORITIES as _KSA_AUTHORITIES } from './ksa-regulatory-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface KsaRegulatorySeedData {
  defaultConfigs: Record<string, unknown>;
  authorities: Array<{ code: string; nameEn: string; nameAr: string }>;
  frameworks: typeof KSA_FRAMEWORKS;
  maturityDimensions: Array<{ key: string; nameEn: string; nameAr: string; weight: number }>;
}

export function getKsaRegulatorySeedData(): KsaRegulatorySeedData {
  return {
    defaultConfigs: {
      moduleCode: 'ksa-regulatory',
      changeTrackingEnabled: true,
      maturityAssessmentEnabled: true,
      crossFrameworkMappingEnabled: true,
      complianceScoringEnabled: true,
      defaultJurisdiction: 'SA',
      snapshotFrequency: 'monthly',
    },
    authorities: [
      { code: 'SAMA', nameEn: 'Saudi Central Bank', nameAr: 'البنك المركزي السعودي' },
      { code: 'NCA', nameEn: 'National Cybersecurity Authority', nameAr: 'الهيئة الوطنية للأمن السيبراني' },
      { code: 'CMA', nameEn: 'Capital Market Authority', nameAr: 'هيئة السوق المالية' },
      { code: 'NDMO', nameEn: 'National Data Management Office', nameAr: 'مكتب إدارة البيانات الوطنية' },
      { code: 'CITC', nameEn: 'Communications, Space & Technology Commission', nameAr: 'هيئة الاتصالات والفضاء والتقنية' },
      { code: 'SDAIA', nameEn: 'Saudi Data & AI Authority', nameAr: 'الهيئة السعودية للبيانات والذكاء الاصطناعي' },
      { code: 'ZATCA', nameEn: 'Zakat, Tax and Customs Authority', nameAr: 'هيئة الزكاة والضريبة والجمارك' },
    ],
    frameworks: KSA_FRAMEWORKS,
    maturityDimensions: [
      { key: 'governance', nameEn: 'Governance', nameAr: 'الحوكمة', weight: 0.25 },
      { key: 'risk', nameEn: 'Risk Management', nameAr: 'إدارة المخاطر', weight: 0.20 },
      { key: 'compliance', nameEn: 'Compliance', nameAr: 'الامتثال', weight: 0.25 },
      { key: 'technology', nameEn: 'Technology', nameAr: 'التقنية', weight: 0.15 },
      { key: 'people', nameEn: 'People & Awareness', nameAr: 'الأفراد والتوعية', weight: 0.15 },
    ],
  };
}

export async function seedKsaRegulatoryModule(tenantId: string, schema: string): Promise<void> {
  const data = getKsaRegulatorySeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['ksa-regulatory', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
