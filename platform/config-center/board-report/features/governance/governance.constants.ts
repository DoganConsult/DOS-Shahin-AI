import { ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { registerModuleTabs } from '@app/shared/contracts/module-tab-registry';

export const GOVERNANCE_TABS: ModuleTabVM[] = [
  { id: 'overview',           labelEn: 'Overview',               labelAr: 'نظرة عامة',            route: '/governance/overview',           icon: 'home' },
  { id: 'policies',           labelEn: 'Policies',               labelAr: 'السياسات',              route: '/governance/policies',           icon: 'file' },
  { id: 'procedures',         labelEn: 'Procedures & Standards', labelAr: 'الإجراءات والمعايير',   route: '/governance/procedures',         icon: 'list' },
  { id: 'committees',         labelEn: 'Committees',             labelAr: 'اللجان',                route: '/governance/committees',         icon: 'users' },
  { id: 'decisions',          labelEn: 'Decisions',              labelAr: 'القرارات',              route: '/governance/decisions',          icon: 'check-square' },
  { id: 'actions',            labelEn: 'Actions',                labelAr: 'المهام',                route: '/governance/actions',            icon: 'bolt' },
  { id: 'exceptions',         labelEn: 'Exceptions',             labelAr: 'الاستثناءات',           route: '/governance/exceptions',         icon: 'exclamation-triangle' },
  { id: 'calendar',           labelEn: 'Calendar',               labelAr: 'التقويم',               route: '/governance/calendar',           icon: 'calendar' },
  { id: 'mandates',           labelEn: 'Mandates',               labelAr: 'التفويضات التنظيمية',   route: '/governance/mandates',           icon: 'hammer' },
  { id: 'reviews',            labelEn: 'Reviews',                labelAr: 'المراجعات',             route: '/governance/reviews',            icon: 'search' },
  { id: 'acknowledgements',   labelEn: 'Acknowledgements',       labelAr: 'الإقرارات',             route: '/governance/acknowledgements',   icon: 'list-check' },
  { id: 'objectives',         labelEn: 'Objectives',             labelAr: 'الأهداف',               route: '/governance/objectives',         icon: 'bullseye' },
  { id: 'delegations',        labelEn: 'Delegations',            labelAr: 'التفويضات',             route: '/governance/delegations',        icon: 'share-alt' },
  { id: 'responsibilities',   labelEn: 'Responsibilities',       labelAr: 'المسؤوليات',            route: '/governance/responsibilities',   icon: 'id-card' },
  { id: 'raci',               labelEn: 'RACI Templates',         labelAr: 'قوالب RACI',            route: '/governance/raci',               icon: 'table' },
  { id: 'obligations',        labelEn: 'Obligations',            labelAr: 'الالتزامات',            route: '/governance/obligations',        icon: 'receipt' },
  { id: 'charters',           labelEn: 'Charters',               labelAr: 'المواثيق',              route: '/governance/charters',           icon: 'file-o' },
  { id: 'health',             labelEn: 'Health Score',           labelAr: 'مؤشر الصحة',            route: '/governance/health',             icon: 'wave-pulse' },
  { id: 'structure',          labelEn: 'Structure',              labelAr: 'الهيكل التنظيمي',       route: '/governance/structure',          icon: 'sitemap' },
  { id: 'board-packs',        labelEn: 'Board Packs',            labelAr: 'حزم مجلس الإدارة',      route: '/governance/board-packs',        icon: 'briefcase' },
  { id: 'executive-summaries', labelEn: 'Executive Summaries', labelAr: 'الملخصات التنفيذية',    route: '/governance/executive-summaries', icon: 'newspaper' },
  { id: 'initiatives',         labelEn: 'Initiatives',          labelAr: 'المبادرات',             route: '/governance/initiatives',         icon: 'rocket' },
  { id: 'milestones',          labelEn: 'Milestones',           labelAr: 'المعالم',               route: '/governance/milestones',          icon: 'flag' },
  { id: 'digests',             labelEn: 'Digests',              labelAr: 'الملخصات',              route: '/governance/digests',             icon: 'file-text' },
];

// Register tabs in the shared registry for cross-module access
registerModuleTabs('governance', GOVERNANCE_TABS);

export const GOV_HEADER_ACTIONS: PageHeaderAction[] = [
  { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
];
