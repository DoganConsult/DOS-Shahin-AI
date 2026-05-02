/**
 * Compliance Tabs Configuration — AGRC-OS
 */

export interface ComplianceTab {
  key: string;
  index: number;
  labelEn: string;
  labelAr: string;
  icon: string;
}

export const COMPLIANCE_TABS: ComplianceTab[] = [
  { key: 'overview',    index: 0, labelEn: 'Compliance Overview', labelAr: 'نظرة عامة على الالتزام', icon: 'pi-chart-bar' },
  { key: 'frameworks',  index: 1, labelEn: 'Frameworks',          labelAr: 'الأطر',                   icon: 'pi-th-large' },
  { key: 'domains',     index: 2, labelEn: 'Domains',             labelAr: 'المجالات',                icon: 'pi-sitemap' },
  { key: 'obligations', index: 3, labelEn: 'Obligations',         labelAr: 'الالتزامات',              icon: 'pi-list' },
  { key: 'gaps',        index: 4, labelEn: 'Gap Assessment',      labelAr: 'تقييم الفجوات',           icon: 'pi-exclamation-triangle' },
  { key: 'roadmap',     index: 5, labelEn: 'Compliance Roadmap',  labelAr: 'خارطة طريق الالتزام',     icon: 'pi-map' },
];
