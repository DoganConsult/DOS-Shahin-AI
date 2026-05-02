import type { ModuleShellDefinition, WorkspacePattern, ModuleKpiDefinition, ModuleTabDefinition, LifecycleStepDefinition, ModuleFilterDefinition } from './module-shell-definition';
import { MODULE_TABLE_VIEWS } from './module-table-views';

const team_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-tm-active', labelEn: 'Active Teams', labelAr: 'فرق نشطة', icon: 'pi-users', color: 'sky', bg: 'bg-sky-50', route: '/team/list' },
  { id: 'kpi-tm-members', labelEn: 'Total Members', labelAr: 'إجمالي الأعضاء', icon: 'pi-user', color: 'blue', bg: 'bg-blue-50', route: '/team/members' },
  { id: 'kpi-tm-workload', labelEn: 'Avg. Workload', labelAr: 'متوسط عبء العمل', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/team/workload', health: true },
  { id: 'kpi-tm-overloaded', labelEn: 'Overloaded Members', labelAr: 'أعضاء مثقلون', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/team/workload?overloaded=true', urgency: true },
  { id: 'kpi-tm-capacity', labelEn: 'Capacity', labelAr: 'الطاقة', icon: 'pi-percentage', color: 'amber', bg: 'bg-amber-50', route: '/team/capacity', health: true },
];

const team_TABS: ModuleTabDefinition[] = [
  { id: 'tab-tm-list', labelEn: 'Teams', labelAr: 'الفرق', icon: 'pi-users', route: '/team/list', default: true },
  { id: 'tab-tm-members', labelEn: 'Members', labelAr: 'الأعضاء', icon: 'pi-user', route: '/team/members' },
  { id: 'tab-tm-workload', labelEn: 'Workload', labelAr: 'عبء العمل', icon: 'pi-chart-bar', route: '/team/workload' },
  { id: 'tab-tm-capacity', labelEn: 'Capacity', labelAr: 'الطاقة', icon: 'pi-percentage', route: '/team/capacity' },
];

const team_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'created', to: 'active', requiredPermission: 'team.activate' },
  { from: 'active', to: 'restructured', requiredPermission: 'team.restructure' },
  { from: 'active', to: 'archived', requiredPermission: 'team.archive' },
];

const team_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-tm-status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف' }] },
  { id: 'f-tm-dept', labelEn: 'Department', labelAr: 'القسم', type: 'select' },
  { id: 'f-tm-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
];

const issues_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-iss-open', labelEn: 'Open Issues', labelAr: 'مسائل مفتوحة', icon: 'pi-exclamation-circle', color: 'orange', bg: 'bg-orange-50', route: '/issues/list' },
  { id: 'kpi-iss-overdue', labelEn: 'Overdue', labelAr: 'متأخرة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/issues/list?status=overdue', urgency: true },
  { id: 'kpi-iss-critical', labelEn: 'Critical', labelAr: 'حرجة', icon: 'pi-bolt', color: 'rose', bg: 'bg-rose-50', route: '/issues/list?severity=critical', urgency: true },
  { id: 'kpi-iss-repeat', labelEn: 'Repeat Root Causes', labelAr: 'أسباب جذرية متكررة', icon: 'pi-replay', color: 'amber', bg: 'bg-amber-50', route: '/issues/root-causes', urgency: true },
  { id: 'kpi-iss-sla', labelEn: 'Closure SLA', labelAr: 'مستوى خدمة الإغلاق', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/issues/sla', health: true },
];

const issues_TABS: ModuleTabDefinition[] = [
  { id: 'tab-iss-list', labelEn: 'Issue List', labelAr: 'قائمة المسائل', icon: 'pi-list', route: '/issues/list', default: true },
  { id: 'tab-iss-triage', labelEn: 'Triage Queue', labelAr: 'قائمة الفرز', icon: 'pi-sort-amount-up', route: '/issues/triage' },
  { id: 'tab-iss-root-causes', labelEn: 'Root Causes', labelAr: 'الأسباب الجذرية', icon: 'pi-search', route: '/issues/root-causes' },
  { id: 'tab-iss-trends', labelEn: 'Trends', labelAr: 'الاتجاهات', icon: 'pi-chart-line', route: '/issues/trends' },
  { id: 'tab-iss-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-bar', route: '/issues/reports' },
];

const issues_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'raised', to: 'triaged', requiredPermission: 'issues.triage', slaHours: 8 },
  { from: 'triaged', to: 'assigned', requiredPermission: 'issues.assign' },
  { from: 'assigned', to: 'remediating', requiredPermission: 'issues.remediate' },
  { from: 'remediating', to: 'verified', requiredPermission: 'issues.verify', requiresApproval: true, slaHours: 72 },
  { from: 'verified', to: 'closed', requiredPermission: 'issues.close' },
];

const issues_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-iss-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'raised', labelEn: 'Raised', labelAr: 'مرفوع' }, { value: 'triaged', labelEn: 'Triaged', labelAr: 'مصنف' }, { value: 'assigned', labelEn: 'Assigned', labelAr: 'معين' }, { value: 'remediating', labelEn: 'Remediating', labelAr: 'قيد المعالجة' }, { value: 'verified', labelEn: 'Verified', labelAr: 'تم التحقق' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-iss-severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'multiselect', options: [{ value: 'critical', labelEn: 'Critical', labelAr: 'حرج' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-iss-source', labelEn: 'Source', labelAr: 'المصدر', type: 'select' },
  { id: 'f-iss-assignee', labelEn: 'Assignee', labelAr: 'المسؤول', type: 'search' },
  { id: 'f-iss-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-iss-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

const inbox_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-ibx-unread', labelEn: 'Unread', labelAr: 'غير مقروء', icon: 'pi-envelope', color: 'blue', bg: 'bg-blue-50', route: '/inbox?status=unread', urgency: true },
  { id: 'kpi-ibx-action', labelEn: 'Action Required', labelAr: 'يتطلب إجراء', icon: 'pi-bolt', color: 'red', bg: 'bg-red-50', route: '/inbox?action=true', urgency: true },
  { id: 'kpi-ibx-today', labelEn: 'Today\'s Messages', labelAr: 'رسائل اليوم', icon: 'pi-inbox', color: 'gray', bg: 'bg-gray-50', route: '/inbox' },
  { id: 'kpi-ibx-threads', labelEn: 'Active Threads', labelAr: 'محادثات نشطة', icon: 'pi-comments', color: 'teal', bg: 'bg-teal-50', route: '/inbox?threads=true' },
  { id: 'kpi-ibx-sla', labelEn: 'Response SLA', labelAr: 'مستوى خدمة الرد', icon: 'pi-clock', color: 'amber', bg: 'bg-amber-50', route: '/inbox/sla', health: true },
];

const inbox_TABS: ModuleTabDefinition[] = [
  { id: 'tab-ibx-inbox', labelEn: 'Inbox', labelAr: 'الوارد', icon: 'pi-inbox', route: '/inbox', default: true },
  { id: 'tab-ibx-sent', labelEn: 'Sent', labelAr: 'المرسل', icon: 'pi-send', route: '/inbox/sent' },
  { id: 'tab-ibx-archived', labelEn: 'Archived', labelAr: 'المؤرشف', icon: 'pi-folder', route: '/inbox/archived' },
  { id: 'tab-ibx-broadcasts', labelEn: 'Broadcasts', labelAr: 'البث', icon: 'pi-megaphone', route: '/inbox/broadcasts' },
];

const inbox_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'unread', to: 'read', requiredPermission: 'inbox.read' },
  { from: 'read', to: 'actioned', requiredPermission: 'inbox.action' },
  { from: 'read', to: 'archived', requiredPermission: 'inbox.archive' },
];

const inbox_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-ibx-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'unread', labelEn: 'Unread', labelAr: 'غير مقروء' }, { value: 'read', labelEn: 'Read', labelAr: 'مقروء' }, { value: 'actioned', labelEn: 'Actioned', labelAr: 'تم الإجراء' }, { value: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف' }] },
  { id: 'f-ibx-priority', labelEn: 'Priority', labelAr: 'الأولوية', type: 'select', options: [{ value: 'urgent', labelEn: 'Urgent', labelAr: 'عاجل' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'normal', labelEn: 'Normal', labelAr: 'عادي' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-ibx-channel', labelEn: 'Channel', labelAr: 'القناة', type: 'select' },
  { id: 'f-ibx-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-ibx-action', labelEn: 'Action Required', labelAr: 'يتطلب إجراء', type: 'toggle' },
];

const portals_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-ptl-active', labelEn: 'Active Portals', labelAr: 'بوابات نشطة', icon: 'pi-globe', color: 'teal', bg: 'bg-teal-50', route: '/portals/list' },
  { id: 'kpi-ptl-sessions', labelEn: 'Active Sessions', labelAr: 'جلسات نشطة', icon: 'pi-users', color: 'blue', bg: 'bg-blue-50', route: '/portals/sessions' },
  { id: 'kpi-ptl-expiring', labelEn: 'Expiring Access', labelAr: 'صلاحيات تنتهي', icon: 'pi-calendar-times', color: 'amber', bg: 'bg-amber-50', route: '/portals/list?expiring=true', urgency: true },
  { id: 'kpi-ptl-submissions', labelEn: 'Pending Submissions', labelAr: 'تقديمات معلقة', icon: 'pi-inbox', color: 'orange', bg: 'bg-orange-50', route: '/portals/submissions', urgency: true },
  { id: 'kpi-ptl-health', labelEn: 'Portal Health', labelAr: 'صحة البوابات', icon: 'pi-heart', color: 'green', bg: 'bg-green-50', route: '/portals/health', health: true },
];

const portals_TABS: ModuleTabDefinition[] = [
  { id: 'tab-ptl-list', labelEn: 'Portal Registry', labelAr: 'سجل البوابات', icon: 'pi-list', route: '/portals/list', default: true },
  { id: 'tab-ptl-sessions', labelEn: 'Active Sessions', labelAr: 'الجلسات', icon: 'pi-users', route: '/portals/sessions' },
  { id: 'tab-ptl-submissions', labelEn: 'Submissions', labelAr: 'التقديمات', icon: 'pi-inbox', route: '/portals/submissions' },
  { id: 'tab-ptl-config', labelEn: 'Configuration', labelAr: 'الإعدادات', icon: 'pi-cog', route: '/portals/config' },
];

const portals_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'active', requiredPermission: 'portals.activate' },
  { from: 'active', to: 'inactive', requiredPermission: 'portals.deactivate' },
  { from: 'inactive', to: 'active', requiredPermission: 'portals.reactivate' },
  { from: 'active', to: 'expired', requiredPermission: 'portals.expire' },
];

const portals_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-ptl-type', labelEn: 'Portal Type', labelAr: 'نوع البوابة', type: 'select', options: [{ value: 'vendor', labelEn: 'Vendor', labelAr: 'مورد' }, { value: 'audit', labelEn: 'Audit', labelAr: 'تدقيق' }, { value: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال' }, { value: 'stakeholder', labelEn: 'Stakeholder', labelAr: 'أصحاب مصلحة' }] },
  { id: 'f-ptl-status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'inactive', labelEn: 'Inactive', labelAr: 'غير نشط' }, { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' }] },
  { id: 'f-ptl-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
  { id: 'f-ptl-date', labelEn: 'Expiry Date', labelAr: 'تاريخ الانتهاء', type: 'date-range' },
];

const records_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-rec-total', labelEn: 'Total Records', labelAr: 'إجمالي السجلات', icon: 'pi-database', color: 'slate', bg: 'bg-slate-50', route: '/records/list' },
  { id: 'kpi-rec-legal-hold', labelEn: 'Legal Holds', labelAr: 'حجوزات قانونية', icon: 'pi-lock', color: 'red', bg: 'bg-red-50', route: '/records/list?legalHold=true' },
  { id: 'kpi-rec-disposal', labelEn: 'Disposal Due', labelAr: 'مستحقة للتخلص', icon: 'pi-trash', color: 'amber', bg: 'bg-amber-50', route: '/records/disposal?status=due', urgency: true },
  { id: 'kpi-rec-unclassified', labelEn: 'Unclassified', labelAr: 'غير مصنفة', icon: 'pi-question-circle', color: 'orange', bg: 'bg-orange-50', route: '/records/list?classification=none', urgency: true },
  { id: 'kpi-rec-retention', labelEn: 'Retention Compliance', labelAr: 'التزام الاحتفاظ', icon: 'pi-check-circle', color: 'teal', bg: 'bg-teal-50', route: '/records/retention', health: true },
];

const records_TABS: ModuleTabDefinition[] = [
  { id: 'tab-rec-list', labelEn: 'Records', labelAr: 'السجلات', icon: 'pi-list', route: '/records/list', default: true },
  { id: 'tab-rec-classification', labelEn: 'Classification', labelAr: 'التصنيف', icon: 'pi-tag', route: '/records/classification' },
  { id: 'tab-rec-retention', labelEn: 'Retention', labelAr: 'الاحتفاظ', icon: 'pi-calendar', route: '/records/retention' },
  { id: 'tab-rec-legal', labelEn: 'Legal Holds', labelAr: 'الحجوزات القانونية', icon: 'pi-lock', route: '/records/legal' },
  { id: 'tab-rec-disposal', labelEn: 'Disposal', labelAr: 'التخلص', icon: 'pi-trash', route: '/records/disposal' },
];

const records_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'active', requiredPermission: 'records.activate' },
  { from: 'active', to: 'under_review', requiredPermission: 'records.review' },
  { from: 'under_review', to: 'archived', requiredPermission: 'records.archive' },
  { from: 'archived', to: 'disposed', requiredPermission: 'records.dispose', requiresApproval: true },
  { from: 'active', to: 'legal_hold', requiredPermission: 'records.hold' },
];

const records_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-rec-type', labelEn: 'Record Type', labelAr: 'نوع السجل', type: 'multiselect', options: [{ value: 'document', labelEn: 'Document', labelAr: 'وثيقة' }, { value: 'policy', labelEn: 'Policy', labelAr: 'سياسة' }, { value: 'evidence', labelEn: 'Evidence', labelAr: 'دليل' }, { value: 'report', labelEn: 'Report', labelAr: 'تقرير' }, { value: 'correspondence', labelEn: 'Correspondence', labelAr: 'مراسلة' }] },
  { id: 'f-rec-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف' }, { value: 'disposed', labelEn: 'Disposed', labelAr: 'تم التخلص' }, { value: 'legal_hold', labelEn: 'Legal Hold', labelAr: 'حجز قانوني' }] },
  { id: 'f-rec-classification', labelEn: 'Classification', labelAr: 'التصنيف', type: 'select' },
  { id: 'f-rec-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
  { id: 'f-rec-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-rec-legal-hold', labelEn: 'Legal Hold Only', labelAr: 'الحجوزات القانونية فقط', type: 'toggle' },
];

const privacy_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-prv-dsr', labelEn: 'Open DSRs', labelAr: 'طلبات مفتوحة', icon: 'pi-user', color: 'rose', bg: 'bg-rose-50', route: '/privacy/dsr', urgency: true },
  { id: 'kpi-prv-breaches', labelEn: 'Active Breaches', labelAr: 'اختراقات نشطة', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/privacy/breaches', urgency: true },
  { id: 'kpi-prv-consents', labelEn: 'Active Consents', labelAr: 'موافقات نشطة', icon: 'pi-check-circle', color: 'teal', bg: 'bg-teal-50', route: '/privacy/consents' },
  { id: 'kpi-prv-transfers', labelEn: 'Pending Transfers', labelAr: 'نقل معلق', icon: 'pi-send', color: 'amber', bg: 'bg-amber-50', route: '/privacy/transfers?status=pending', urgency: true },
  { id: 'kpi-prv-ropa', labelEn: 'ROPA Coverage', labelAr: 'تغطية سجل الأنشطة', icon: 'pi-percentage', color: 'blue', bg: 'bg-blue-50', route: '/privacy/ropa', health: true },
  { id: 'kpi-prv-compliance', labelEn: 'PDPL Compliance', labelAr: 'التزام نظام حماية البيانات', icon: 'pi-shield', color: 'green', bg: 'bg-green-50', route: '/privacy/compliance', health: true },
];

const privacy_TABS: ModuleTabDefinition[] = [
  { id: 'tab-prv-dashboard', labelEn: 'Privacy Dashboard', labelAr: 'لوحة الخصوصية', icon: 'pi-chart-pie', route: '/privacy/dashboard', default: true },
  { id: 'tab-prv-dsr', labelEn: 'DSR Management', labelAr: 'إدارة الطلبات', icon: 'pi-user', route: '/privacy/dsr' },
  { id: 'tab-prv-breaches', labelEn: 'Breach Management', labelAr: 'إدارة الاختراقات', icon: 'pi-exclamation-triangle', route: '/privacy/breaches' },
  { id: 'tab-prv-consents', labelEn: 'Consent Records', labelAr: 'سجلات الموافقة', icon: 'pi-check-square', route: '/privacy/consents' },
  { id: 'tab-prv-transfers', labelEn: 'Data Transfers', labelAr: 'نقل البيانات', icon: 'pi-send', route: '/privacy/transfers' },
  { id: 'tab-prv-ropa', labelEn: 'ROPA', labelAr: 'سجل الأنشطة', icon: 'pi-file', route: '/privacy/ropa' },
];

const privacy_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'submitted', to: 'in_progress', requiredPermission: 'privacy.process', slaHours: 48 },
  { from: 'in_progress', to: 'completed', requiredPermission: 'privacy.complete', slaHours: 720 },
  { from: 'in_progress', to: 'escalated', requiredPermission: 'privacy.escalate' },
  { from: 'completed', to: 'closed', requiredPermission: 'privacy.close' },
  { from: 'in_progress', to: 'rejected', requiredPermission: 'privacy.reject', requiresApproval: true },
];

const privacy_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-prv-type', labelEn: 'Request Type', labelAr: 'نوع الطلب', type: 'multiselect', options: [{ value: 'access', labelEn: 'Access', labelAr: 'وصول' }, { value: 'deletion', labelEn: 'Deletion', labelAr: 'حذف' }, { value: 'rectification', labelEn: 'Rectification', labelAr: 'تصحيح' }, { value: 'portability', labelEn: 'Portability', labelAr: 'نقل' }, { value: 'restriction', labelEn: 'Restriction', labelAr: 'تقييد' }, { value: 'objection', labelEn: 'Objection', labelAr: 'اعتراض' }] },
  { id: 'f-prv-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'submitted', labelEn: 'Submitted', labelAr: 'مقدم' }, { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' }, { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' }, { value: 'rejected', labelEn: 'Rejected', labelAr: 'مرفوض' }, { value: 'escalated', labelEn: 'Escalated', labelAr: 'مصعد' }] },
  { id: 'f-prv-regulation', labelEn: 'Regulation', labelAr: 'التنظيم', type: 'select', options: [{ value: 'pdpl', labelEn: 'PDPL', labelAr: 'نظام حماية البيانات' }, { value: 'gdpr', labelEn: 'GDPR', labelAr: 'GDPR' }, { value: 'ccpa', labelEn: 'CCPA', labelAr: 'CCPA' }] },
  { id: 'f-prv-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-prv-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

export const EXT_SHELL_ENTRIES: Record<string, ModuleShellDefinition> = {
  team: {
    moduleCode: 'team',
    moduleName: { en: 'Teams', ar: 'الفرق' },
    moduleIcon: 'pi-users',
    moduleAccentToken: 'sky',
    purposeLine: { en: 'Team management, workload balancing, capacity planning & cross-functional coordination.', ar: 'إدارة الفرق وتوازن عبء العمل وتخطيط الطاقة الإنتاجية والتنسيق عبر الوظائف.' },
    primaryAiAction: { id: 'ai-team-balance', label: { en: 'AI Balance', ar: 'موازنة بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: team_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: team_TABS,
    lifecycleDefinition: team_LIFECYCLE,
    relatedObjectTypes: ['foundation', 'action', 'governance', 'training'],
    aiCapabilities: ['workload_balancer', 'capacity_forecaster', 'skill_matcher', 'team_optimizer'],
    filters: team_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['team'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A01-tm', name: 'Team Balancer', nameAr: 'موازن الفرق', icon: 'pi-users', color: 'sky', domain: 'Team Ops', domainAr: 'عمليات الفرق', autonomyLevel: 'shadow_agent' }],
  },
  issues: {
    moduleCode: 'issues',
    moduleName: { en: 'Issues', ar: 'المسائل' },
    moduleIcon: 'pi-exclamation-circle',
    moduleAccentToken: 'orange',
    purposeLine: { en: 'Unified issue intelligence from audit, compliance, incidents & controls — single backbone.', ar: 'ذكاء موحد للمسائل من التدقيق والامتثال والحوادث والضوابط — عمود فقري واحد.' },
    primaryAiAction: { id: 'ai-issue-triage', label: { en: 'AI Triage', ar: 'فرز بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: issues_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: issues_TABS,
    lifecycleDefinition: issues_LIFECYCLE,
    relatedObjectTypes: ['risk', 'audit', 'compliance', 'control', 'action', 'remediation', 'incident', 'evidence'],
    aiCapabilities: ['root_cause_clusterer', 'duplicate_detector', 'action_recommender', 'closure_readiness_checker', 'severity_predictor'],
    filters: issues_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['issues'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 72,
    agents: [{ id: 'A08-iss', name: 'Issue Intelligence', nameAr: 'ذكاء المسائل', icon: 'pi-exclamation-circle', color: 'orange', domain: 'Issue Management', domainAr: 'إدارة المسائل', autonomyLevel: 'hybrid' }],
  },
  inbox: {
    moduleCode: 'inbox',
    moduleName: { en: 'Inbox', ar: 'صندوق الوارد' },
    moduleIcon: 'pi-inbox',
    moduleAccentToken: 'gray',
    purposeLine: { en: 'Internal messaging, workflow notifications, broadcasts & smart priority inbox.', ar: 'المراسلة الداخلية وإشعارات سير العمل والبث الجماعي وصندوق الأولويات الذكي.' },
    primaryAiAction: { id: 'ai-inbox-prioritize', label: { en: 'AI Prioritize', ar: 'تحديد الأولويات بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: inbox_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: inbox_TABS,
    lifecycleDefinition: inbox_LIFECYCLE,
    relatedObjectTypes: ['notification', 'workflow', 'team', 'action'],
    aiCapabilities: ['priority_ranker', 'smart_categorizer', 'response_suggester', 'thread_summarizer'],
    filters: inbox_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['inbox'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A07-ibx', name: 'Inbox Assistant', nameAr: 'مساعد الوارد', icon: 'pi-inbox', color: 'gray', domain: 'Messaging', domainAr: 'المراسلة', autonomyLevel: 'shadow_agent' }],
  },
  portals: {
    moduleCode: 'portals',
    moduleName: { en: 'External Portals', ar: 'البوابات الخارجية' },
    moduleIcon: 'pi-globe',
    moduleAccentToken: 'teal',
    purposeLine: { en: 'Regulator, vendor, consultant & public explorer portals with controlled access.', ar: 'بوابات الجهات التنظيمية والموردين والمستشارين والمستكشف العام مع وصول مضبوط.' },
    primaryAiAction: { id: 'ai-portal-content', label: { en: 'AI Content', ar: 'محتوى بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: portals_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: portals_TABS,
    lifecycleDefinition: portals_LIFECYCLE,
    relatedObjectTypes: ['vendor', 'compliance', 'audit', 'evidence', 'privacy'],
    aiCapabilities: ['content_generator', 'access_optimizer', 'submission_classifier', 'portal_health_monitor'],
    filters: portals_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['portals'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'domain',
    automationLevel: 'semi',
    slaDefaultHours: 24,
    agents: [{ id: 'A09-ptl', name: 'Portal Manager', nameAr: 'مدير البوابات', icon: 'pi-globe', color: 'teal', domain: 'External Access', domainAr: 'الوصول الخارجي', autonomyLevel: 'shadow_agent' }],
  },
  records: {
    moduleCode: 'records',
    moduleName: { en: 'Records Management', ar: 'إدارة السجلات' },
    moduleIcon: 'pi-database',
    moduleAccentToken: 'slate',
    purposeLine: { en: 'Document records, retention policies, legal holds, classification & disposal management.', ar: 'سجلات الوثائق وسياسات الاحتفاظ والحجوزات القانونية والتصنيف وإدارة التخلص.' },
    primaryAiAction: { id: 'ai-records-classify', label: { en: 'AI Classify', ar: 'تصنيف بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: records_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: records_TABS,
    lifecycleDefinition: records_LIFECYCLE,
    relatedObjectTypes: ['evidence', 'policy', 'compliance', 'audit', 'privacy'],
    aiCapabilities: ['auto_classifier', 'retention_advisor', 'disposal_scheduler', 'legal_hold_monitor', 'duplicate_detector'],
    filters: records_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['records'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'domain',
    automationLevel: 'semi',
    slaDefaultHours: 720,
    agents: [{ id: 'A05-rec', name: 'Records Curator', nameAr: 'أمين السجلات', icon: 'pi-database', color: 'slate', domain: 'Records Management', domainAr: 'إدارة السجلات', autonomyLevel: 'shadow_agent' }],
  },
  dora: {
    moduleCode: 'dora',
    moduleName: { en: 'DORA Compliance', ar: 'امتثال DORA' },
    moduleIcon: 'pi-globe',
    moduleAccentToken: 'violet',
    purposeLine: { en: 'Digital Operational Resilience Act — ICT risk, incident reporting, resilience testing & third-party oversight.', ar: 'قانون المرونة التشغيلية الرقمية — مخاطر تقنية المعلومات والإبلاغ عن الحوادث واختبار المرونة والرقابة على الأطراف الثالثة.' },
    primaryAiAction: { id: 'ai-dora-assess', label: { en: 'AI DORA Assessment', ar: 'تقييم DORA بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: [
      { id: 'kpi-dora-score', labelEn: 'DORA Score', labelAr: 'درجة DORA', icon: 'pi-check-circle', color: 'violet', bg: 'bg-violet-50', route: '/dora/dashboard', health: true },
      { id: 'kpi-dora-ict-risks', labelEn: 'ICT Risk Items', labelAr: 'عناصر مخاطر تقنية المعلومات', icon: 'pi-server', color: 'red', bg: 'bg-red-50', route: '/dora/ict-risks', urgency: true },
      { id: 'kpi-dora-incidents', labelEn: 'Reportable Incidents', labelAr: 'حوادث يجب الإبلاغ عنها', icon: 'pi-exclamation-triangle', color: 'orange', bg: 'bg-orange-50', route: '/dora/incidents', urgency: true },
      { id: 'kpi-dora-tests', labelEn: 'Resilience Tests', labelAr: 'اختبارات المرونة', icon: 'pi-bolt', color: 'teal', bg: 'bg-teal-50', route: '/dora/testing', workflow: true },
      { id: 'kpi-dora-tpp', labelEn: 'Third-Party Providers', labelAr: 'مقدمو الخدمات الخارجيون', icon: 'pi-truck', color: 'blue', bg: 'bg-blue-50', route: '/dora/third-party' },
    ],
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: [
      { id: 'tab-dora-dashboard', labelEn: 'Dashboard', labelAr: 'لوحة المعلومات', icon: 'pi-chart-pie', route: '/dora/dashboard', default: true },
      { id: 'tab-dora-ict', labelEn: 'ICT Risk', labelAr: 'مخاطر تقنية المعلومات', icon: 'pi-server', route: '/dora/ict-risks' },
      { id: 'tab-dora-incidents', labelEn: 'Incidents', labelAr: 'الحوادث', icon: 'pi-exclamation-triangle', route: '/dora/incidents' },
      { id: 'tab-dora-testing', labelEn: 'Resilience Testing', labelAr: 'اختبار المرونة', icon: 'pi-bolt', route: '/dora/testing' },
      { id: 'tab-dora-tpp', labelEn: 'Third-Party', labelAr: 'الأطراف الثالثة', icon: 'pi-truck', route: '/dora/third-party' },
    ],
    lifecycleDefinition: [
      { from: 'identified', to: 'assessed', requiredPermission: 'dora.assess' },
      { from: 'assessed', to: 'mitigated', requiredPermission: 'dora.mitigate', slaHours: 336 },
      { from: 'mitigated', to: 'verified', requiredPermission: 'dora.verify', requiresApproval: true },
      { from: 'verified', to: 'closed', requiredPermission: 'dora.close' },
    ],
    relatedObjectTypes: ['risk', 'compliance', 'vendor', 'incident', 'bcp', 'control', 'evidence'],
    aiCapabilities: ['ict_risk_classifier', 'dora_gap_analyzer', 'incident_reporting_assistant', 'resilience_test_planner', 'tpp_risk_scorer'],
    filters: [
      { id: 'f-dora-pillar', labelEn: 'DORA Pillar', labelAr: 'ركيزة DORA', type: 'multiselect', options: [{ value: 'ict_risk', labelEn: 'ICT Risk Mgmt', labelAr: 'إدارة مخاطر تقنية المعلومات' }, { value: 'incident', labelEn: 'Incident Reporting', labelAr: 'الإبلاغ عن الحوادث' }, { value: 'testing', labelEn: 'Resilience Testing', labelAr: 'اختبار المرونة' }, { value: 'tpp', labelEn: 'Third-Party', labelAr: 'الأطراف الثالثة' }, { value: 'info_sharing', labelEn: 'Info Sharing', labelAr: 'مشاركة المعلومات' }] },
      { id: 'f-dora-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect' },
      { id: 'f-dora-entity', labelEn: 'Entity', labelAr: 'الكيان', type: 'select' },
    ],
    tableViews: MODULE_TABLE_VIEWS['dora'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 336,
    agents: [{ id: 'A03-dora', name: 'DORA Analyst', nameAr: 'محلل DORA', icon: 'pi-globe', color: 'violet', domain: 'DORA Intelligence', domainAr: 'ذكاء DORA', autonomyLevel: 'hybrid' }],
  },
  journey: {
    moduleCode: 'journey',
    moduleName: { en: 'Journey & Maturity', ar: 'الرحلة والنضج' },
    moduleIcon: 'pi-map',
    moduleAccentToken: 'emerald',
    purposeLine: { en: 'GRC maturity model journey — capability assessment, roadmap planning & progress tracking.', ar: 'رحلة نموذج نضج حوكمة المخاطر والامتثال — تقييم القدرات وتخطيط خارطة الطريق وتتبع التقدم.' },
    primaryAiAction: { id: 'ai-journey-assess', label: { en: 'AI Maturity Assessment', ar: 'تقييم النضج بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: [
      { id: 'kpi-jrn-maturity', labelEn: 'Maturity Level', labelAr: 'مستوى النضج', icon: 'pi-chart-bar', color: 'emerald', bg: 'bg-emerald-50', route: '/journey/assessment', health: true },
      { id: 'kpi-jrn-gaps', labelEn: 'Capability Gaps', labelAr: 'فجوات القدرات', icon: 'pi-exclamation-circle', color: 'orange', bg: 'bg-orange-50', route: '/journey/gaps', urgency: true },
      { id: 'kpi-jrn-milestones', labelEn: 'Milestones Due', labelAr: 'معالم مستحقة', icon: 'pi-flag', color: 'amber', bg: 'bg-amber-50', route: '/journey/roadmap?due=soon', workflow: true },
      { id: 'kpi-jrn-progress', labelEn: 'Roadmap Progress', labelAr: 'تقدم خارطة الطريق', icon: 'pi-percentage', color: 'blue', bg: 'bg-blue-50', route: '/journey/roadmap', health: true },
      { id: 'kpi-jrn-domains', labelEn: 'Assessed Domains', labelAr: 'المجالات المقيمة', icon: 'pi-th-large', color: 'teal', bg: 'bg-teal-50', route: '/journey/domains' },
    ],
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center', 'studio'] as WorkspacePattern[],
    defaultRecordTabs: [
      { id: 'tab-jrn-dashboard', labelEn: 'Dashboard', labelAr: 'لوحة المعلومات', icon: 'pi-chart-pie', route: '/journey/dashboard', default: true },
      { id: 'tab-jrn-assessment', labelEn: 'Assessment', labelAr: 'التقييم', icon: 'pi-check-square', route: '/journey/assessment' },
      { id: 'tab-jrn-roadmap', labelEn: 'Roadmap', labelAr: 'خارطة الطريق', icon: 'pi-map', route: '/journey/roadmap' },
      { id: 'tab-jrn-domains', labelEn: 'Domains', labelAr: 'المجالات', icon: 'pi-th-large', route: '/journey/domains' },
      { id: 'tab-jrn-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/journey/reports' },
    ],
    lifecycleDefinition: [
      { from: 'planned', to: 'assessing', requiredPermission: 'journey.assess' },
      { from: 'assessing', to: 'reviewed', requiredPermission: 'journey.review', slaHours: 336 },
      { from: 'reviewed', to: 'roadmap_active', requiredPermission: 'journey.approve', requiresApproval: true },
      { from: 'roadmap_active', to: 'completed', requiredPermission: 'journey.complete' },
    ],
    relatedObjectTypes: ['compliance', 'risk', 'governance', 'training', 'action', 'policy'],
    aiCapabilities: ['maturity_gap_analyzer', 'roadmap_prioritizer', 'benchmark_comparator', 'capability_recommender', 'progress_predictor'],
    filters: [
      { id: 'f-jrn-domain', labelEn: 'Domain', labelAr: 'المجال', type: 'multiselect' },
      { id: 'f-jrn-level', labelEn: 'Maturity Level', labelAr: 'مستوى النضج', type: 'select', options: [{ value: '1', labelEn: 'Initial', labelAr: 'أولي' }, { value: '2', labelEn: 'Managed', labelAr: 'مُدار' }, { value: '3', labelEn: 'Defined', labelAr: 'محدد' }, { value: '4', labelEn: 'Quantified', labelAr: 'كمي' }, { value: '5', labelEn: 'Optimizing', labelAr: 'مُحسَّن' }] },
      { id: 'f-jrn-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect' },
    ],
    tableViews: MODULE_TABLE_VIEWS['journey'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 720,
    agents: [{ id: 'A01-jrn', name: 'Maturity Advisor', nameAr: 'مستشار النضج', icon: 'pi-map', color: 'emerald', domain: 'Maturity Intelligence', domainAr: 'ذكاء النضج', autonomyLevel: 'hybrid' }],
  },
  privacy: {
    moduleCode: 'privacy',
    moduleName: { en: 'Privacy Management', ar: 'إدارة الخصوصية' },
    moduleIcon: 'pi-lock',
    moduleAccentToken: 'rose',
    purposeLine: { en: 'Data subject requests, privacy assessments, breach management, consent records & ROPA.', ar: 'طلبات أصحاب البيانات وتقييمات الخصوصية وإدارة الاختراقات وسجلات الموافقة وسجل الأنشطة.' },
    primaryAiAction: { id: 'ai-privacy-scan', label: { en: 'AI Privacy Scan', ar: 'فحص الخصوصية بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: privacy_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: privacy_TABS,
    lifecycleDefinition: privacy_LIFECYCLE,
    relatedObjectTypes: ['compliance', 'risk', 'vendor', 'evidence', 'governance', 'records', 'action'],
    aiCapabilities: ['dsr_auto_classifier', 'breach_severity_scorer', 'consent_gap_detector', 'data_mapping_assistant', 'pdpl_compliance_checker', 'ropa_generator'],
    filters: privacy_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['privacy'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 720,
    agents: [{ id: 'A10-prv', name: 'Privacy Guardian', nameAr: 'حارس الخصوصية', icon: 'pi-lock', color: 'rose', domain: 'Privacy & Data Protection', domainAr: 'الخصوصية وحماية البيانات', autonomyLevel: 'hybrid' }],
  },
};
