import { ModuleTabVM } from '@app/shared/models/module-overview.vm';

export { EVIDENCE_TABS as EVIDENCE_TAB_CONFIG } from './config/evidence-tabs.config';
export { EVIDENCE_LABELS_EN, EVIDENCE_LABELS_AR } from './config/evidence.labels';
export type { EvidenceLabels } from './config/evidence.labels';
export * from './models/evidence.models';
export { EvidenceApiService as EvidenceFeatureApiService } from '@app/features/evidence/services/evidence-api.service';

export const EVIDENCE_TABS: ModuleTabVM[] = [
  { id: 'overview',    labelEn: 'Overview',             labelAr: 'نظرة عامة',         route: '/evidence/overview',              icon: 'home' },
  { id: 'vault',       labelEn: 'Evidence Vault',       labelAr: 'خزينة الأدلة',      route: '/evidence/vault',                 icon: 'folder' },
  { id: 'tasks',       labelEn: 'Tasks',                labelAr: 'المهام',             route: '/evidence/tasks',                 icon: 'clipboard' },
  { id: 'requests',    labelEn: 'Requests',             labelAr: 'الطلبات',            route: '/evidence/requests',              icon: 'inbox' },
  { id: 'reviews',     labelEn: 'Reviews',              labelAr: 'المراجعات',          route: '/evidence/reviews',               icon: 'search' },
  { id: 'expiry',      labelEn: 'Expiry & Coverage',    labelAr: 'الانتهاء والتغطية', route: '/evidence/expiry',                icon: 'clock' },
  { id: 'automated',   labelEn: 'Automated Collection', labelAr: 'التجميع التلقائي',  route: '/evidence/automated-collection',  icon: 'refresh-cw' },
  { id: 'mappings',    labelEn: 'Mappings',             labelAr: 'الربط',              route: '/evidence/mappings',              icon: 'share-alt' },
  { id: 'catalog',     labelEn: 'Catalog',              labelAr: 'الفهرس',             route: '/evidence/catalog',               icon: 'list' },
];
