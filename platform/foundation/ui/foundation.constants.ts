import { ModuleTabVM } from './types/module-overview';
import { registerModuleTabs } from './types/module-overview';

export const FOUNDATION_TABS: ModuleTabVM[] = [
  { id: 'overview', labelEn: 'Overview', labelAr: 'نظرة عامة', route: '/foundation/overview', icon: 'home' },
  { id: 'organization', labelEn: 'Organization', labelAr: 'الهيكل التنظيمي', route: '/foundation/organization', icon: 'sitemap' },
  { id: 'departments', labelEn: 'Departments', labelAr: 'الأقسام', route: '/foundation/departments', icon: 'building' },
  { id: 'business-units', labelEn: 'Business Units', labelAr: 'وحدات الأعمال', route: '/foundation/business-units', icon: 'th-large' },
  { id: 'users', labelEn: 'Users', labelAr: 'المستخدمون', route: '/foundation/users', icon: 'users' },
  { id: 'roles', labelEn: 'Roles', labelAr: 'الأدوار', route: '/foundation/roles', icon: 'id-card' },
  { id: 'teams', labelEn: 'Teams', labelAr: 'الفرق', route: '/foundation/teams', icon: 'people-fill' },
  { id: 'positions', labelEn: 'Positions', labelAr: 'المناصب', route: '/foundation/positions', icon: 'briefcase' },
  { id: 'locations', labelEn: 'Locations', labelAr: 'المواقع', route: '/foundation/locations', icon: 'map-marker' },
  { id: 'committees', labelEn: 'Committees', labelAr: 'اللجان', route: '/foundation/committees', icon: 'users' },
  { id: 'delegations', labelEn: 'Delegations', labelAr: 'التفويضات', route: '/foundation/delegations', icon: 'share-alt' },
  { id: 'ownership-mapping', labelEn: 'Ownership', labelAr: 'الملكية', route: '/foundation/ownership-mapping', icon: 'link' },
  { id: 'reference-data', labelEn: 'Reference Data', labelAr: 'البيانات المرجعية', route: '/foundation/reference-data', icon: 'database' },
  { id: 'policies', labelEn: 'Policies', labelAr: 'السياسات', route: '/foundation/policies', icon: 'file' },
  { id: 'data-processing', labelEn: 'Data Processing', labelAr: 'معالجة البيانات', route: '/foundation/data-processing', icon: 'cog' },
  { id: 'access-review', labelEn: 'Access Review', labelAr: 'مراجعة الوصول', route: '/foundation/access-review', icon: 'shield' },
  { id: 'notifications', labelEn: 'Notifications', labelAr: 'الإشعارات', route: '/foundation/settings', icon: 'bell' },
  { id: 'approvals', labelEn: 'Approvals', labelAr: 'الموافقات', route: '/foundation/settings', icon: 'check-circle' },
  { id: 'audit', labelEn: 'Audit Trail', labelAr: 'سجل التدقيق', route: '/foundation/audit', icon: 'history' },
  { id: 'settings', labelEn: 'Settings', labelAr: 'الإعدادات', route: '/foundation/settings', icon: 'cog' },
];

// Register tabs in the shared registry for cross-module access
registerModuleTabs('foundation', FOUNDATION_TABS);
