import type { ModuleShellDefinition, WorkspacePattern, ModuleKpiDefinition, ModuleTabDefinition, LifecycleStepDefinition, ModuleFilterDefinition } from './module-shell-definition';
import { MODULE_TABLE_VIEWS } from './module-table-views';

const incident_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-inc-active', labelEn: 'Active Incidents', labelAr: 'الحوادث النشطة', icon: 'pi-exclamation-triangle', color: 'orange', bg: 'bg-orange-50', route: '/incident/active', urgency: true },
  { id: 'kpi-inc-critical', labelEn: 'Critical Incidents', labelAr: 'حوادث حرجة', icon: 'pi-bolt', color: 'red', bg: 'bg-red-50', route: '/incident/active?severity=critical', urgency: true },
  { id: 'kpi-inc-mttr', labelEn: 'Avg. MTTR', labelAr: 'متوسط وقت الحل', icon: 'pi-clock', color: 'teal', bg: 'bg-teal-50', route: '/incident/metrics', health: true },
  { id: 'kpi-inc-sla', labelEn: 'SLA Compliance', labelAr: 'التزام مستوى الخدمة', icon: 'pi-check-circle', color: 'green', bg: 'bg-green-50', route: '/incident/sla', health: true },
  { id: 'kpi-inc-recurring', labelEn: 'Recurring Issues', labelAr: 'مشاكل متكررة', icon: 'pi-replay', color: 'amber', bg: 'bg-amber-50', route: '/incident/recurring', urgency: true },
];

const incident_TABS: ModuleTabDefinition[] = [
  { id: 'tab-inc-active', labelEn: 'Active Incidents', labelAr: 'الحوادث النشطة', icon: 'pi-bolt', route: '/incident/active', default: true },
  { id: 'tab-inc-timeline', labelEn: 'Timeline', labelAr: 'الجدول الزمني', icon: 'pi-calendar', route: '/incident/timeline' },
  { id: 'tab-inc-rca', labelEn: 'Root Cause Analysis', labelAr: 'تحليل السبب الجذري', icon: 'pi-search', route: '/incident/rca' },
  { id: 'tab-inc-lessons', labelEn: 'Lessons Learned', labelAr: 'الدروس المستفادة', icon: 'pi-book', route: '/incident/lessons' },
  { id: 'tab-inc-metrics', labelEn: 'Metrics', labelAr: 'المقاييس', icon: 'pi-chart-bar', route: '/incident/metrics' },
];

const incident_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'reported', to: 'triaged', requiredPermission: 'incident.triage', slaHours: 4 },
  { from: 'triaged', to: 'investigating', requiredPermission: 'incident.investigate' },
  { from: 'investigating', to: 'contained', requiredPermission: 'incident.contain', slaHours: 24 },
  { from: 'contained', to: 'resolved', requiredPermission: 'incident.resolve' },
  { from: 'resolved', to: 'closed', requiredPermission: 'incident.close', requiresApproval: true },
];

const incident_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-inc-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'reported', labelEn: 'Reported', labelAr: 'مبلغ عنه' }, { value: 'triaged', labelEn: 'Triaged', labelAr: 'مصنف' }, { value: 'investigating', labelEn: 'Investigating', labelAr: 'قيد التحقيق' }, { value: 'contained', labelEn: 'Contained', labelAr: 'محتوى' }, { value: 'resolved', labelEn: 'Resolved', labelAr: 'محلول' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-inc-severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'multiselect', options: [{ value: 'critical', labelEn: 'Critical', labelAr: 'حرج' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-inc-category', labelEn: 'Category', labelAr: 'الفئة', type: 'select' },
  { id: 'f-inc-assignee', labelEn: 'Assignee', labelAr: 'المسؤول', type: 'search' },
  { id: 'f-inc-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-inc-sla-breach', labelEn: 'SLA Breached', labelAr: 'تجاوز مستوى الخدمة', type: 'toggle' },
];

const exception_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-exc-active', labelEn: 'Active Exceptions', labelAr: 'الاستثناءات النشطة', icon: 'pi-ban', color: 'amber', bg: 'bg-amber-50', route: '/exception/active' },
  { id: 'kpi-exc-expired', labelEn: 'Expired', labelAr: 'منتهية', icon: 'pi-calendar-times', color: 'red', bg: 'bg-red-50', route: '/exception/expired', urgency: true },
  { id: 'kpi-exc-high-risk', labelEn: 'High-Risk', labelAr: 'عالية المخاطر', icon: 'pi-exclamation-triangle', color: 'rose', bg: 'bg-rose-50', route: '/exception/active?risk=high', urgency: true },
  { id: 'kpi-exc-no-comp', labelEn: 'Without Compensating Controls', labelAr: 'بدون ضوابط تعويضية', icon: 'pi-shield', color: 'orange', bg: 'bg-orange-50', route: '/exception/active?compensating=false', urgency: true },
  { id: 'kpi-exc-renewal', labelEn: 'Renewal Pipeline', labelAr: 'خط أنبوب التجديد', icon: 'pi-refresh', color: 'blue', bg: 'bg-blue-50', route: '/exception/renewals', workflow: true, health: true },
];

const exception_TABS: ModuleTabDefinition[] = [
  { id: 'tab-exc-active', labelEn: 'Active Exceptions', labelAr: 'الاستثناءات النشطة', icon: 'pi-ban', route: '/exception/active', default: true },
  { id: 'tab-exc-pending', labelEn: 'Pending Approval', labelAr: 'قيد الموافقة', icon: 'pi-clock', route: '/exception/pending' },
  { id: 'tab-exc-expired', labelEn: 'Expired', labelAr: 'منتهية', icon: 'pi-calendar-times', route: '/exception/expired' },
  { id: 'tab-exc-history', labelEn: 'History', labelAr: 'السجل', icon: 'pi-history', route: '/exception/history' },
  { id: 'tab-exc-compensating', labelEn: 'Compensating Controls', labelAr: 'الضوابط التعويضية', icon: 'pi-shield', route: '/exception/compensating' },
];

const exception_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'requested', to: 'risk_reviewed', requiredPermission: 'exception.review', slaHours: 72 },
  { from: 'risk_reviewed', to: 'approved', requiredPermission: 'exception.approve', requiresApproval: true, slaHours: 48 },
  { from: 'risk_reviewed', to: 'rejected', requiredPermission: 'exception.reject' },
  { from: 'approved', to: 'active', requiredPermission: 'exception.activate' },
  { from: 'active', to: 'renewed', requiredPermission: 'exception.renew' },
  { from: 'active', to: 'expired', requiredPermission: 'exception.expire' },
  { from: 'active', to: 'revoked', requiredPermission: 'exception.revoke' },
];

const exception_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-exc-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'requested', labelEn: 'Requested', labelAr: 'مطلوب' }, { value: 'risk_reviewed', labelEn: 'Risk Reviewed', labelAr: 'مراجعة مخاطر' }, { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' }, { value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' }, { value: 'revoked', labelEn: 'Revoked', labelAr: 'ملغي' }] },
  { id: 'f-exc-risk', labelEn: 'Risk Level', labelAr: 'مستوى المخاطر', type: 'select', options: [{ value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-exc-policy', labelEn: 'Linked Policy', labelAr: 'السياسة المرتبطة', type: 'search' },
  { id: 'f-exc-date', labelEn: 'Expiry Date', labelAr: 'تاريخ الانتهاء', type: 'date-range' },
  { id: 'f-exc-compensating', labelEn: 'Has Compensating Control', labelAr: 'لديه ضابط تعويضي', type: 'toggle' },
];

const remediation_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-rem-active', labelEn: 'Active Plans', labelAr: 'خطط نشطة', icon: 'pi-wrench', color: 'rose', bg: 'bg-rose-50', route: '/remediation/plans' },
  { id: 'kpi-rem-overdue', labelEn: 'Overdue Milestones', labelAr: 'معالم متأخرة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/remediation/milestones?status=overdue', urgency: true },
  { id: 'kpi-rem-verified', labelEn: 'Verified Fixes', labelAr: 'إصلاحات تم التحقق منها', icon: 'pi-check-circle', color: 'green', bg: 'bg-green-50', route: '/remediation/verified', health: true },
  { id: 'kpi-rem-pending', labelEn: 'Pending Verification', labelAr: 'بانتظار التحقق', icon: 'pi-hourglass', color: 'amber', bg: 'bg-amber-50', route: '/remediation/pending', workflow: true },
  { id: 'kpi-rem-effectiveness', labelEn: 'Fix Effectiveness', labelAr: 'فعالية الإصلاح', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/remediation/effectiveness', health: true },
];

const remediation_TABS: ModuleTabDefinition[] = [
  { id: 'tab-rem-plans', labelEn: 'Remediation Plans', labelAr: 'خطط المعالجة', icon: 'pi-list', route: '/remediation/plans', default: true },
  { id: 'tab-rem-milestones', labelEn: 'Milestones', labelAr: 'المعالم', icon: 'pi-flag', route: '/remediation/milestones' },
  { id: 'tab-rem-verification', labelEn: 'Verification', labelAr: 'التحقق', icon: 'pi-check-square', route: '/remediation/verification' },
  { id: 'tab-rem-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/remediation/reports' },
];

const remediation_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'planned', to: 'in_progress', requiredPermission: 'remediation.start' },
  { from: 'in_progress', to: 'verification', requiredPermission: 'remediation.submit', slaHours: 168 },
  { from: 'verification', to: 'verified', requiredPermission: 'remediation.verify', requiresApproval: true },
  { from: 'verification', to: 'rework', requiredPermission: 'remediation.reject' },
  { from: 'rework', to: 'in_progress', requiredPermission: 'remediation.restart' },
  { from: 'verified', to: 'closed', requiredPermission: 'remediation.close' },
];

const remediation_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-rem-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'planned', labelEn: 'Planned', labelAr: 'مخطط' }, { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' }, { value: 'verification', labelEn: 'Verification', labelAr: 'تحقق' }, { value: 'verified', labelEn: 'Verified', labelAr: 'تم التحقق' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-rem-source', labelEn: 'Source Module', labelAr: 'الوحدة المصدر', type: 'select' },
  { id: 'f-rem-owner', labelEn: 'Owner', labelAr: 'المالك', type: 'search' },
  { id: 'f-rem-date', labelEn: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date-range' },
  { id: 'f-rem-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

const action_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-act-open', labelEn: 'Open Actions', labelAr: 'إجراءات مفتوحة', icon: 'pi-list-check', color: 'sky', bg: 'bg-sky-50', route: '/action/list' },
  { id: 'kpi-act-overdue', labelEn: 'Overdue', labelAr: 'متأخرة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/action/list?status=overdue', urgency: true },
  { id: 'kpi-act-completed', labelEn: 'Completed This Month', labelAr: 'مكتملة هذا الشهر', icon: 'pi-check-circle', color: 'green', bg: 'bg-green-50', route: '/action/completed', health: true },
  { id: 'kpi-act-blocked', labelEn: 'Blocked', labelAr: 'محظورة', icon: 'pi-ban', color: 'amber', bg: 'bg-amber-50', route: '/action/list?status=blocked', urgency: true },
  { id: 'kpi-act-sla', labelEn: 'SLA Compliance', labelAr: 'التزام مستوى الخدمة', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/action/sla', health: true },
];

const action_TABS: ModuleTabDefinition[] = [
  { id: 'tab-act-list', labelEn: 'Action Items', labelAr: 'بنود الإجراءات', icon: 'pi-list', route: '/action/list', default: true },
  { id: 'tab-act-plans', labelEn: 'Action Plans', labelAr: 'خطط الإجراءات', icon: 'pi-sitemap', route: '/action/plans' },
  { id: 'tab-act-timeline', labelEn: 'Timeline', labelAr: 'الجدول الزمني', icon: 'pi-calendar', route: '/action/timeline' },
  { id: 'tab-act-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/action/reports' },
];

const action_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'created', to: 'assigned', requiredPermission: 'action.assign' },
  { from: 'assigned', to: 'in_progress', requiredPermission: 'action.start' },
  { from: 'in_progress', to: 'completed', requiredPermission: 'action.complete', slaHours: 168 },
  { from: 'completed', to: 'verified', requiredPermission: 'action.verify', requiresApproval: true },
  { from: 'in_progress', to: 'blocked', requiredPermission: 'action.block' },
  { from: 'blocked', to: 'in_progress', requiredPermission: 'action.unblock' },
  { from: 'verified', to: 'closed', requiredPermission: 'action.close' },
];

const action_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-act-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'created', labelEn: 'Created', labelAr: 'منشأ' }, { value: 'assigned', labelEn: 'Assigned', labelAr: 'معين' }, { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' }, { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' }, { value: 'blocked', labelEn: 'Blocked', labelAr: 'محظور' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-act-priority', labelEn: 'Priority', labelAr: 'الأولوية', type: 'select', options: [{ value: 'critical', labelEn: 'Critical', labelAr: 'حرج' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-act-assignee', labelEn: 'Assignee', labelAr: 'المسؤول', type: 'search' },
  { id: 'f-act-source', labelEn: 'Source Module', labelAr: 'الوحدة المصدر', type: 'select' },
  { id: 'f-act-date', labelEn: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date-range' },
  { id: 'f-act-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

const bcp_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-bcp-plans', labelEn: 'Active Plans', labelAr: 'خطط نشطة', icon: 'pi-file', color: 'emerald', bg: 'bg-emerald-50', route: '/bcp/plans' },
  { id: 'kpi-bcp-bia', labelEn: 'BIA Coverage', labelAr: 'تغطية تحليل التأثير', icon: 'pi-percentage', color: 'teal', bg: 'bg-teal-50', route: '/bcp/bia', health: true },
  { id: 'kpi-bcp-exercises', labelEn: 'Upcoming Exercises', labelAr: 'تمارين قادمة', icon: 'pi-calendar', color: 'blue', bg: 'bg-blue-50', route: '/bcp/exercises', workflow: true },
  { id: 'kpi-bcp-rto', labelEn: 'RTO Compliance', labelAr: 'التزام RTO', icon: 'pi-clock', color: 'amber', bg: 'bg-amber-50', route: '/bcp/recovery', health: true },
  { id: 'kpi-bcp-gaps', labelEn: 'Recovery Gaps', labelAr: 'فجوات التعافي', icon: 'pi-exclamation-circle', color: 'red', bg: 'bg-red-50', route: '/bcp/gaps', urgency: true },
];

const bcp_TABS: ModuleTabDefinition[] = [
  { id: 'tab-bcp-plans', labelEn: 'Continuity Plans', labelAr: 'خطط الاستمرارية', icon: 'pi-file', route: '/bcp/plans', default: true },
  { id: 'tab-bcp-bia', labelEn: 'Business Impact', labelAr: 'تحليل التأثير', icon: 'pi-chart-bar', route: '/bcp/bia' },
  { id: 'tab-bcp-dr', labelEn: 'Disaster Recovery', labelAr: 'التعافي من الكوارث', icon: 'pi-refresh', route: '/bcp/dr' },
  { id: 'tab-bcp-exercises', labelEn: 'Exercises', labelAr: 'التمارين', icon: 'pi-play', route: '/bcp/exercises' },
  { id: 'tab-bcp-recovery', labelEn: 'Recovery Tracking', labelAr: 'تتبع التعافي', icon: 'pi-chart-line', route: '/bcp/recovery' },
];

const bcp_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'bia_complete', requiredPermission: 'bcp.assess' },
  { from: 'bia_complete', to: 'reviewed', requiredPermission: 'bcp.review', slaHours: 168 },
  { from: 'reviewed', to: 'approved', requiredPermission: 'bcp.approve', requiresApproval: true },
  { from: 'approved', to: 'active', requiredPermission: 'bcp.activate' },
  { from: 'active', to: 'exercised', requiredPermission: 'bcp.exercise' },
  { from: 'exercised', to: 'updated', requiredPermission: 'bcp.update' },
];

const bcp_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-bcp-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' }, { value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'exercised', labelEn: 'Exercised', labelAr: 'تمت التمارين' }, { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' }] },
  { id: 'f-bcp-bu', labelEn: 'Business Unit', labelAr: 'وحدة الأعمال', type: 'select' },
  { id: 'f-bcp-rto', labelEn: 'RTO Category', labelAr: 'فئة RTO', type: 'select' },
  { id: 'f-bcp-date', labelEn: 'Next Exercise', labelAr: 'التمرين القادم', type: 'date-range' },
  { id: 'f-bcp-gaps', labelEn: 'Has Gaps', labelAr: 'لديه فجوات', type: 'toggle' },
];

const vendor_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-ven-total', labelEn: 'Total Vendors', labelAr: 'إجمالي الموردين', icon: 'pi-truck', color: 'lime', bg: 'bg-lime-50', route: '/vendor/registry' },
  { id: 'kpi-ven-critical', labelEn: 'Critical Vendors', labelAr: 'موردون حرجون', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/vendor/registry?tier=critical', urgency: true },
  { id: 'kpi-ven-overdue', labelEn: 'Overdue Assessments', labelAr: 'تقييمات متأخرة', icon: 'pi-clock', color: 'orange', bg: 'bg-orange-50', route: '/vendor/assessments?status=overdue', urgency: true },
  { id: 'kpi-ven-avg-score', labelEn: 'Avg. Risk Score', labelAr: 'متوسط درجة المخاطر', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/vendor/scoring', health: true },
  { id: 'kpi-ven-contracts', labelEn: 'Expiring Contracts', labelAr: 'عقود تنتهي', icon: 'pi-calendar-times', color: 'amber', bg: 'bg-amber-50', route: '/vendor/contracts?expiring=true', urgency: true },
];

const vendor_TABS: ModuleTabDefinition[] = [
  { id: 'tab-ven-registry', labelEn: 'Vendor Registry', labelAr: 'سجل الموردين', icon: 'pi-list', route: '/vendor/registry', default: true },
  { id: 'tab-ven-assessments', labelEn: 'Assessments', labelAr: 'التقييمات', icon: 'pi-clipboard', route: '/vendor/assessments' },
  { id: 'tab-ven-scoring', labelEn: 'Risk Scoring', labelAr: 'تقييم المخاطر', icon: 'pi-chart-bar', route: '/vendor/scoring' },
  { id: 'tab-ven-contracts', labelEn: 'Contracts', labelAr: 'العقود', icon: 'pi-file', route: '/vendor/contracts' },
  { id: 'tab-ven-4thparty', labelEn: 'Fourth-Party', labelAr: 'الطرف الرابع', icon: 'pi-sitemap', route: '/vendor/fourth-party' },
];

const vendor_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'prospect', to: 'due_diligence', requiredPermission: 'vendor.assess' },
  { from: 'due_diligence', to: 'approved', requiredPermission: 'vendor.approve', requiresApproval: true, slaHours: 168 },
  { from: 'due_diligence', to: 'rejected', requiredPermission: 'vendor.reject' },
  { from: 'approved', to: 'active', requiredPermission: 'vendor.activate' },
  { from: 'active', to: 'under_review', requiredPermission: 'vendor.review' },
  { from: 'active', to: 'offboarded', requiredPermission: 'vendor.offboard' },
];

const vendor_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-ven-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'prospect', labelEn: 'Prospect', labelAr: 'محتمل' }, { value: 'due_diligence', labelEn: 'Due Diligence', labelAr: 'عناية واجبة' }, { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' }, { value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة' }, { value: 'offboarded', labelEn: 'Offboarded', labelAr: 'منهي' }] },
  { id: 'f-ven-tier', labelEn: 'Risk Tier', labelAr: 'طبقة المخاطر', type: 'select', options: [{ value: 'critical', labelEn: 'Critical', labelAr: 'حرج' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-ven-category', labelEn: 'Category', labelAr: 'الفئة', type: 'select' },
  { id: 'f-ven-search', labelEn: 'Vendor Name', labelAr: 'اسم المورد', type: 'search' },
  { id: 'f-ven-date', labelEn: 'Contract Expiry', labelAr: 'انتهاء العقد', type: 'date-range' },
];

const asset_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-ast-total', labelEn: 'Total Assets', labelAr: 'إجمالي الأصول', icon: 'pi-server', color: 'slate', bg: 'bg-slate-50', route: '/asset/inventory' },
  { id: 'kpi-ast-critical', labelEn: 'Critical Assets', labelAr: 'أصول حرجة', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/asset/inventory?criticality=critical' },
  { id: 'kpi-ast-unclassified', labelEn: 'Unclassified', labelAr: 'غير مصنفة', icon: 'pi-question-circle', color: 'amber', bg: 'bg-amber-50', route: '/asset/inventory?classification=none', urgency: true },
  { id: 'kpi-ast-eol', labelEn: 'End-of-Life', labelAr: 'نهاية العمر', icon: 'pi-calendar-times', color: 'orange', bg: 'bg-orange-50', route: '/asset/lifecycle?status=eol', urgency: true },
  { id: 'kpi-ast-coverage', labelEn: 'Control Coverage', labelAr: 'تغطية الضوابط', icon: 'pi-shield', color: 'teal', bg: 'bg-teal-50', route: '/asset/controls', health: true },
];

const asset_TABS: ModuleTabDefinition[] = [
  { id: 'tab-ast-inventory', labelEn: 'Inventory', labelAr: 'الجرد', icon: 'pi-list', route: '/asset/inventory', default: true },
  { id: 'tab-ast-classification', labelEn: 'Classification', labelAr: 'التصنيف', icon: 'pi-tag', route: '/asset/classification' },
  { id: 'tab-ast-lifecycle', labelEn: 'Lifecycle', labelAr: 'دورة الحياة', icon: 'pi-refresh', route: '/asset/lifecycle' },
  { id: 'tab-ast-dependencies', labelEn: 'Dependencies', labelAr: 'التبعيات', icon: 'pi-sitemap', route: '/asset/dependencies' },
  { id: 'tab-ast-controls', labelEn: 'Controls', labelAr: 'الضوابط', icon: 'pi-shield', route: '/asset/controls' },
];

const asset_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'discovered', to: 'classified', requiredPermission: 'asset.classify' },
  { from: 'classified', to: 'active', requiredPermission: 'asset.activate' },
  { from: 'active', to: 'under_review', requiredPermission: 'asset.review' },
  { from: 'active', to: 'decommissioned', requiredPermission: 'asset.decommission', requiresApproval: true },
  { from: 'decommissioned', to: 'disposed', requiredPermission: 'asset.dispose' },
];

const asset_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-ast-type', labelEn: 'Asset Type', labelAr: 'نوع الأصل', type: 'multiselect', options: [{ value: 'hardware', labelEn: 'Hardware', labelAr: 'أجهزة' }, { value: 'software', labelEn: 'Software', labelAr: 'برمجيات' }, { value: 'data', labelEn: 'Data', labelAr: 'بيانات' }, { value: 'people', labelEn: 'People', labelAr: 'أشخاص' }, { value: 'facility', labelEn: 'Facility', labelAr: 'منشأة' }] },
  { id: 'f-ast-criticality', labelEn: 'Criticality', labelAr: 'الأهمية', type: 'select', options: [{ value: 'critical', labelEn: 'Critical', labelAr: 'حرج' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-ast-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'decommissioned', labelEn: 'Decommissioned', labelAr: 'خارج الخدمة' }, { value: 'disposed', labelEn: 'Disposed', labelAr: 'تم التخلص' }] },
  { id: 'f-ast-owner', labelEn: 'Owner', labelAr: 'المالك', type: 'search' },
  { id: 'f-ast-date', labelEn: 'Acquisition Date', labelAr: 'تاريخ الاقتناء', type: 'date-range' },
];

export const OPS_SHELL_ENTRIES: Record<string, ModuleShellDefinition> = {
  incident: {
    moduleCode: 'incident',
    moduleName: { en: 'Incident Management', ar: 'إدارة الحوادث' },
    moduleIcon: 'pi-exclamation-triangle',
    moduleAccentToken: 'orange',
    purposeLine: { en: 'Incident response, classification, root cause analysis & lessons learned.', ar: 'الاستجابة للحوادث والتصنيف وتحليل السبب الجذري والدروس المستفادة.' },
    primaryAiAction: { id: 'ai-incident-triage', label: { en: 'AI Triage', ar: 'فرز بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: incident_KPIS,
    defaultWorkspacePattern: 'case-workspace' as WorkspacePattern,
    allowedWorkspacePatterns: ['case-workspace'] as WorkspacePattern[],
    defaultRecordTabs: incident_TABS,
    lifecycleDefinition: incident_LIFECYCLE,
    relatedObjectTypes: ['risk', 'control', 'action', 'evidence', 'bcp', 'vendor', 'issues'],
    aiCapabilities: ['incident_auto_triage', 'root_cause_clusterer', 'impact_estimator', 'playbook_recommender', 'lessons_extractor'],
    filters: incident_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['incident'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'full',
    slaDefaultHours: 24,
    agents: [{ id: 'A07', name: 'Incident Commander', nameAr: 'قائد الحوادث', icon: 'pi-exclamation-triangle', color: 'orange', domain: 'Incident Response', domainAr: 'الاستجابة للحوادث', autonomyLevel: 'full' }],
  },
  exception: {
    moduleCode: 'exception',
    moduleName: { en: 'Exceptions', ar: 'الاستثناءات' },
    moduleIcon: 'pi-ban',
    moduleAccentToken: 'amber',
    purposeLine: { en: 'Controlled deviation with accountability, compensating controls, expiry & renewal management.', ar: 'انحراف مضبوط بمساءلة وضوابط تعويضية وانتهاء صلاحية وإدارة تجديد.' },
    primaryAiAction: { id: 'ai-exception-assess', label: { en: 'AI Risk Assessment', ar: 'تقييم المخاطر بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: exception_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: exception_TABS,
    lifecycleDefinition: exception_LIFECYCLE,
    relatedObjectTypes: ['policy', 'compliance', 'control', 'risk', 'evidence', 'action'],
    aiCapabilities: ['exception_risk_scorer', 'compensating_control_suggester', 'expiry_alerting', 'exception_pattern_analyzer'],
    filters: exception_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['exception'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 168,
    agents: [{ id: 'A08', name: 'Exception Evaluator', nameAr: 'مقيم الاستثناءات', icon: 'pi-ban', color: 'amber', domain: 'Exception Governance', domainAr: 'حوكمة الاستثناءات', autonomyLevel: 'shadow_agent' }],
  },
  remediation: {
    moduleCode: 'remediation',
    moduleName: { en: 'Remediation', ar: 'المعالجة' },
    moduleIcon: 'pi-wrench',
    moduleAccentToken: 'rose',
    purposeLine: { en: 'Remediation plan tracking, milestones, verification & cross-module fix coordination.', ar: 'تتبع خطط المعالجة والمعالم والتحقق وتنسيق الإصلاح عبر الوحدات.' },
    primaryAiAction: { id: 'ai-remediate', label: { en: 'AI Auto-Remediate', ar: 'معالجة تلقائية بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: remediation_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: remediation_TABS,
    lifecycleDefinition: remediation_LIFECYCLE,
    relatedObjectTypes: ['risk', 'issues', 'audit', 'control', 'action', 'compliance', 'evidence'],
    aiCapabilities: ['fix_recommender', 'milestone_predictor', 'verification_automator', 'effectiveness_scorer', 'cross_module_impact_analyzer'],
    filters: remediation_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['remediation'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'full',
    slaDefaultHours: 168,
    agents: [{ id: 'A08-rem', name: 'Remediation Tracker', nameAr: 'متتبع المعالجة', icon: 'pi-wrench', color: 'rose', domain: 'Remediation Ops', domainAr: 'عمليات المعالجة', autonomyLevel: 'full' }],
  },
  action: {
    moduleCode: 'action',
    moduleName: { en: 'Action Items', ar: 'بنود الإجراءات' },
    moduleIcon: 'pi-list-check',
    moduleAccentToken: 'sky',
    purposeLine: { en: 'Execution engine for fixing what governance discovers — plans, tasks, owners & SLA tracking.', ar: 'محرك التنفيذ لإصلاح ما تكتشفه الحوكمة — الخطط والمهام والمالكين وتتبع مستوى الخدمة.' },
    primaryAiAction: { id: 'ai-action-prioritize', label: { en: 'AI Prioritize', ar: 'تحديد الأولويات بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: action_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: action_TABS,
    lifecycleDefinition: action_LIFECYCLE,
    relatedObjectTypes: ['risk', 'issues', 'audit', 'compliance', 'governance', 'remediation', 'incident'],
    aiCapabilities: ['action_prioritizer', 'workload_balancer', 'deadline_predictor', 'dependency_resolver', 'completion_estimator'],
    filters: action_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['action'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'full',
    slaDefaultHours: 168,
    agents: [{ id: 'A08-act', name: 'Action Orchestrator', nameAr: 'منسق الإجراءات', icon: 'pi-list-check', color: 'sky', domain: 'Action Management', domainAr: 'إدارة الإجراءات', autonomyLevel: 'full' }],
  },
  bcp: {
    moduleCode: 'bcp',
    moduleName: { en: 'Business Continuity', ar: 'استمرارية الأعمال' },
    moduleIcon: 'pi-replay',
    moduleAccentToken: 'emerald',
    purposeLine: { en: 'Business continuity planning, BIA, DR coordination, exercise management & recovery tracking.', ar: 'تخطيط استمرارية الأعمال وتحليل التأثير والتنسيق للتعافي وإدارة التمارين.' },
    primaryAiAction: { id: 'ai-bcp-simulate', label: { en: 'AI BCP Simulate', ar: 'محاكاة الاستمرارية بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: bcp_KPIS,
    defaultWorkspacePattern: 'case-workspace' as WorkspacePattern,
    allowedWorkspacePatterns: ['case-workspace'] as WorkspacePattern[],
    defaultRecordTabs: bcp_TABS,
    lifecycleDefinition: bcp_LIFECYCLE,
    relatedObjectTypes: ['risk', 'asset', 'incident', 'vendor', 'action', 'team'],
    aiCapabilities: ['bcp_scenario_simulator', 'bia_estimator', 'recovery_gap_analyzer', 'exercise_planner', 'dr_readiness_scorer'],
    filters: bcp_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['bcp'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 720,
    agents: [{ id: 'A10', name: 'Continuity Planner', nameAr: 'مخطط الاستمرارية', icon: 'pi-replay', color: 'emerald', domain: 'Business Continuity', domainAr: 'استمرارية الأعمال', autonomyLevel: 'hybrid' }],
  },
  vendor: {
    moduleCode: 'vendor',
    moduleName: { en: 'Vendor Risk Management', ar: 'إدارة مخاطر الموردين' },
    moduleIcon: 'pi-truck',
    moduleAccentToken: 'lime',
    purposeLine: { en: 'Vendor due diligence, risk scoring, fourth-party risk & contract lifecycle.', ar: 'العناية الواجبة للموردين وتقييم المخاطر ومخاطر الطرف الرابع ودورة حياة العقود.' },
    primaryAiAction: { id: 'ai-vendor-scan', label: { en: 'AI Vendor Scan', ar: 'فحص المورد بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: vendor_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: vendor_TABS,
    lifecycleDefinition: vendor_LIFECYCLE,
    relatedObjectTypes: ['risk', 'compliance', 'control', 'evidence', 'bcp', 'action', 'privacy'],
    aiCapabilities: ['vendor_risk_scorer', 'due_diligence_automator', 'fourth_party_mapper', 'contract_analyzer', 'vendor_benchmark'],
    filters: vendor_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['vendor'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 336,
    agents: [{ id: 'A09', name: 'Vendor Analyst', nameAr: 'محلل الموردين', icon: 'pi-truck', color: 'lime', domain: 'Vendor Intelligence', domainAr: 'ذكاء الموردين', autonomyLevel: 'hybrid' }],
  },
  asset: {
    moduleCode: 'asset',
    moduleName: { en: 'Asset Management', ar: 'إدارة الأصول' },
    moduleIcon: 'pi-server',
    moduleAccentToken: 'slate',
    purposeLine: { en: 'Asset inventory, classification, lifecycle management & criticality assessment.', ar: 'جرد الأصول والتصنيف وإدارة دورة الحياة وتقييم الأهمية.' },
    primaryAiAction: { id: 'ai-asset-classify', label: { en: 'AI Classify', ar: 'تصنيف بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: asset_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: asset_TABS,
    lifecycleDefinition: asset_LIFECYCLE,
    relatedObjectTypes: ['risk', 'control', 'bcp', 'vendor', 'incident', 'compliance'],
    aiCapabilities: ['asset_auto_classifier', 'criticality_scorer', 'dependency_mapper', 'eol_predictor', 'control_gap_detector'],
    filters: asset_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['asset'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 168,
    agents: [{ id: 'A05-ast', name: 'Asset Intelligence', nameAr: 'ذكاء الأصول', icon: 'pi-server', color: 'slate', domain: 'Asset Analysis', domainAr: 'تحليل الأصول', autonomyLevel: 'shadow_agent' }],
  },
};
