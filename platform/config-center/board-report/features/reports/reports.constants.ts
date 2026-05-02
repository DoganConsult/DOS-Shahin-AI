import { ModuleTabVM } from '@app/shared/models/module-overview.vm';

export const REPORT_TABS: ModuleTabVM[] = [
  { id: 'overview',   labelEn: 'Overview',    labelAr: 'نظرة عامة',   route: '/reports/overview',   icon: 'home' },
  { id: 'executive',  labelEn: 'Executive',   labelAr: 'تنفيذي',      route: '/reports/executive',  icon: 'chart-bar' },
  { id: 'risk',       labelEn: 'Risk',        labelAr: 'المخاطر',     route: '/reports/risk',       icon: 'exclamation-triangle' },
  { id: 'compliance', labelEn: 'Compliance',  labelAr: 'الامتثال',    route: '/reports/compliance', icon: 'shield' },
  { id: 'evidence',   labelEn: 'Evidence',    labelAr: 'الأدلة',      route: '/reports/evidence',   icon: 'folder' },
  { id: 'audit',      labelEn: 'Audit',       labelAr: 'التدقيق',     route: '/reports/audit',      icon: 'search' },
  { id: 'builder',    labelEn: 'Builder',     labelAr: 'المنشئ',      route: '/reports/builder',    icon: 'file-edit' },
  { id: 'scheduled',  labelEn: 'Scheduled',   labelAr: 'المجدولة',    route: '/reports/scheduled',  icon: 'calendar' },
  { id: 'exports',    labelEn: 'Exports',     labelAr: 'التصدير',     route: '/reports/exports',    icon: 'download' },
];

export type ReportPeriod = '7d' | '30d' | '90d' | '1y';

export const PERIOD_OPTIONS: { value: ReportPeriod; labelEn: string; labelAr: string }[] = [
  { value: '7d',  labelEn: '7 Days',  labelAr: '٧ أيام' },
  { value: '30d', labelEn: '30 Days', labelAr: '٣٠ يوم' },
  { value: '90d', labelEn: '90 Days', labelAr: '٩٠ يوم' },
  { value: '1y',  labelEn: '1 Year',  labelAr: 'سنة كاملة' },
];

export function periodToDates(period: ReportPeriod): { start: string; end: string } {
  const end = new Date().toISOString().slice(0, 10);
  const ms  = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const start = new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10);
  return { start, end };
}
