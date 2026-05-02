/**
 * Evidence Tabs Configuration — AGRC-OS
 */

export interface EvidenceTab {
  key: string;
  index: number;
  labelEn: string;
  labelAr: string;
  icon: string;
}

export const EVIDENCE_TABS: EvidenceTab[] = [
  { key: 'overview',    index: 0,  labelEn: 'Overview',             labelAr: 'نظرة عامة',         icon: 'pi-home' },
  { key: 'work-queue',  index: 1,  labelEn: 'My Work',              labelAr: 'عملي',              icon: 'pi-list' },
  { key: 'vault',       index: 2,  labelEn: 'Evidence Vault',       labelAr: 'خزينة الأدلة',      icon: 'pi-folder' },
  { key: 'requests',    index: 3,  labelEn: 'Requests',             labelAr: 'الطلبات',            icon: 'pi-inbox' },
  { key: 'reviews',     index: 4,  labelEn: 'Reviews & Quality',    labelAr: 'المراجعات والجودة', icon: 'pi-eye' },
  { key: 'expiry',      index: 5,  labelEn: 'Freshness & Expiry',   labelAr: 'الصلاحية والانتهاء', icon: 'pi-clock' },
  { key: 'reuse',       index: 6,  labelEn: 'Reuse & Linkage',      labelAr: 'إعادة الاستخدام',   icon: 'pi-link' },
  { key: 'packages',    index: 7,  labelEn: 'Packages & Exports',   labelAr: 'الحزم والتصدير',    icon: 'pi-box' },
  { key: 'automated',   index: 8,  labelEn: 'Connectors & Jobs',    labelAr: 'الموصّلات والمهام',  icon: 'pi-refresh' },
  { key: 'mappings',    index: 9,  labelEn: 'Mappings',             labelAr: 'الربط',              icon: 'pi-share-alt' },
  { key: 'catalog',     index: 10, labelEn: 'Catalog',              labelAr: 'الفهرس',             icon: 'pi-book' },
  { key: 'tasks',       index: 11, labelEn: 'Tasks',                labelAr: 'المهام',             icon: 'pi-check-square' },
  { key: 'reports',     index: 12, labelEn: 'Reports',              labelAr: 'التقارير',           icon: 'pi-chart-bar' },
  { key: 'admin',       index: 13, labelEn: 'Admin',                labelAr: 'الإدارة',            icon: 'pi-cog' },
];
