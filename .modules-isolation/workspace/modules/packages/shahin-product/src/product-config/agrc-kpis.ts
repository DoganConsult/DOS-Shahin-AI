import type { KpiDef } from '@dos/contracts';

export const AGRC_KPI_DEFINITIONS: KpiDef[] = [
  { key: 'complianceScore', labelEn: 'Compliance Score', labelAr: 'درجة الامتثال', icon: 'pi-shield', module: 'compliance' },
  { key: 'highRisks', labelEn: 'High Risks', labelAr: 'مخاطر عالية', icon: 'pi-exclamation-triangle', module: 'risk' },
  { key: 'vendorHealth', labelEn: 'Vendor Health', labelAr: 'صحة الموردين', icon: 'pi-truck', module: 'vendor' },
  { key: 'openFindings', labelEn: 'Open Findings', labelAr: 'نتائج مفتوحة', icon: 'pi-search', module: 'audit' },
  { key: 'auditReadiness', labelEn: 'Audit Readiness', labelAr: 'جاهزية التدقيق', icon: 'pi-check-circle', module: 'audit' },
  { key: 'controlsCoverage', labelEn: 'Controls Coverage', labelAr: 'تغطية الضوابط', icon: 'pi-check-square', module: 'compliance' },
  { key: 'overdueActions', labelEn: 'Overdue Actions', labelAr: 'إجراءات متأخرة', icon: 'pi-clock', module: 'governance' },
];

export const AGRC_ROLE_KPI_PRIORITY: Record<string, string[]> = {
  owner: ['complianceScore', 'highRisks', 'vendorHealth', 'openFindings', 'auditReadiness', 'controlsCoverage', 'overdueActions'],
  admin: ['complianceScore', 'highRisks', 'vendorHealth', 'overdueActions', 'openFindings', 'auditReadiness', 'controlsCoverage'],
  compliance_officer: ['complianceScore', 'controlsCoverage', 'vendorHealth', 'auditReadiness', 'overdueActions', 'openFindings', 'highRisks'],
  risk_manager: ['highRisks', 'vendorHealth', 'complianceScore', 'openFindings', 'overdueActions', 'controlsCoverage', 'auditReadiness'],
  auditor: ['auditReadiness', 'openFindings', 'vendorHealth', 'complianceScore', 'controlsCoverage', 'overdueActions', 'highRisks'],
  viewer: ['complianceScore', 'highRisks', 'vendorHealth', 'openFindings', 'auditReadiness', 'controlsCoverage', 'overdueActions'],
};
