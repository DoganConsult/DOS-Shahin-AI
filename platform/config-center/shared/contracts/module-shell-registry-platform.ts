import type { ModuleShellDefinition, WorkspacePattern, ModuleKpiDefinition, ModuleTabDefinition, LifecycleStepDefinition, ModuleFilterDefinition } from './module-shell-definition';
import { MODULE_TABLE_VIEWS } from './module-table-views';

const admin_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-adm-tenants', labelEn: 'Active Tenants', labelAr: 'مستأجرون نشطون', icon: 'pi-building', color: 'slate', bg: 'bg-slate-50', route: '/admin/tenants' },
  { id: 'kpi-adm-health', labelEn: 'System Health', labelAr: 'صحة النظام', icon: 'pi-heart', color: 'green', bg: 'bg-green-50', route: '/admin/health', health: true },
  { id: 'kpi-adm-features', labelEn: 'Feature Flags', labelAr: 'علامات الميزات', icon: 'pi-flag', color: 'blue', bg: 'bg-blue-50', route: '/admin/features' },
  { id: 'kpi-adm-licenses', labelEn: 'License Usage', labelAr: 'استخدام الرخص', icon: 'pi-key', color: 'amber', bg: 'bg-amber-50', route: '/admin/licenses', health: true },
  { id: 'kpi-adm-alerts', labelEn: 'System Alerts', labelAr: 'تنبيهات النظام', icon: 'pi-bell', color: 'red', bg: 'bg-red-50', route: '/admin/alerts', urgency: true },
];

const admin_TABS: ModuleTabDefinition[] = [
  { id: 'tab-adm-dashboard', labelEn: 'Admin Dashboard', labelAr: 'لوحة الإدارة', icon: 'pi-chart-pie', route: '/admin/dashboard', default: true },
  { id: 'tab-adm-tenants', labelEn: 'Tenants', labelAr: 'المستأجرون', icon: 'pi-building', route: '/admin/tenants' },
  { id: 'tab-adm-settings', labelEn: 'Settings', labelAr: 'الإعدادات', icon: 'pi-cog', route: '/admin/settings' },
  { id: 'tab-adm-features', labelEn: 'Feature Flags', labelAr: 'علامات الميزات', icon: 'pi-flag', route: '/admin/features' },
  { id: 'tab-adm-health', labelEn: 'System Health', labelAr: 'صحة النظام', icon: 'pi-heart', route: '/admin/health' },
];

const admin_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'pending', to: 'provisioned', requiredPermission: 'admin.provision' },
  { from: 'provisioned', to: 'active', requiredPermission: 'admin.activate' },
  { from: 'active', to: 'suspended', requiredPermission: 'admin.suspend' },
  { from: 'suspended', to: 'active', requiredPermission: 'admin.reactivate' },
  { from: 'active', to: 'decommissioned', requiredPermission: 'admin.decommission' },
];

const admin_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-adm-tenant', labelEn: 'Tenant', labelAr: 'المستأجر', type: 'select' },
  { id: 'f-adm-status', labelEn: 'Status', labelAr: 'الحالة', type: 'select', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'suspended', labelEn: 'Suspended', labelAr: 'معلق' }] },
  { id: 'f-adm-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
];

const workflow_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-wf-active', labelEn: 'Active Workflows', labelAr: 'مسارات نشطة', icon: 'pi-sitemap', color: 'cyan', bg: 'bg-cyan-50', route: '/workflow/instances' },
  { id: 'kpi-wf-pending', labelEn: 'Pending Tasks', labelAr: 'مهام معلقة', icon: 'pi-clock', color: 'amber', bg: 'bg-amber-50', route: '/workflow/tasks?status=pending', urgency: true },
  { id: 'kpi-wf-sla', labelEn: 'SLA Breaches', labelAr: 'تجاوزات مستوى الخدمة', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/workflow/sla-breaches', urgency: true },
  { id: 'kpi-wf-templates', labelEn: 'Templates', labelAr: 'القوالب', icon: 'pi-file', color: 'indigo', bg: 'bg-indigo-50', route: '/workflow/templates' },
  { id: 'kpi-wf-throughput', labelEn: 'Throughput', labelAr: 'الإنتاجية', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/workflow/metrics', health: true },
];

const workflow_TABS: ModuleTabDefinition[] = [
  { id: 'tab-wf-instances', labelEn: 'Active Instances', labelAr: 'المسارات النشطة', icon: 'pi-play', route: '/workflow/instances', default: true },
  { id: 'tab-wf-tasks', labelEn: 'My Tasks', labelAr: 'مهامي', icon: 'pi-list-check', route: '/workflow/tasks' },
  { id: 'tab-wf-templates', labelEn: 'Templates', labelAr: 'القوالب', icon: 'pi-file', route: '/workflow/templates' },
  { id: 'tab-wf-designer', labelEn: 'Designer', labelAr: 'المصمم', icon: 'pi-pencil', route: '/workflow/designer' },
  { id: 'tab-wf-sla', labelEn: 'SLA Dashboard', labelAr: 'لوحة مستوى الخدمة', icon: 'pi-chart-bar', route: '/workflow/sla' },
];

const workflow_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'published', requiredPermission: 'workflow.publish' },
  { from: 'published', to: 'active', requiredPermission: 'workflow.activate' },
  { from: 'active', to: 'suspended', requiredPermission: 'workflow.suspend' },
  { from: 'active', to: 'completed', requiredPermission: 'workflow.complete' },
  { from: 'suspended', to: 'active', requiredPermission: 'workflow.resume' },
];

const workflow_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-wf-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' }, { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' }, { value: 'suspended', labelEn: 'Suspended', labelAr: 'معلق' }] },
  { id: 'f-wf-template', labelEn: 'Template', labelAr: 'القالب', type: 'select' },
  { id: 'f-wf-assignee', labelEn: 'Assignee', labelAr: 'المسؤول', type: 'search' },
  { id: 'f-wf-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-wf-sla', labelEn: 'SLA Breached', labelAr: 'تجاوز مستوى الخدمة', type: 'toggle' },
];

const notification_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-ntf-today', labelEn: 'Sent Today', labelAr: 'أرسلت اليوم', icon: 'pi-bell', color: 'amber', bg: 'bg-amber-50', route: '/notification/log' },
  { id: 'kpi-ntf-failed', labelEn: 'Failed Deliveries', labelAr: 'توصيلات فاشلة', icon: 'pi-times-circle', color: 'red', bg: 'bg-red-50', route: '/notification/failed', urgency: true },
  { id: 'kpi-ntf-channels', labelEn: 'Active Channels', labelAr: 'قنوات نشطة', icon: 'pi-link', color: 'teal', bg: 'bg-teal-50', route: '/notification/channels' },
  { id: 'kpi-ntf-subscriptions', labelEn: 'Subscriptions', labelAr: 'الاشتراكات', icon: 'pi-users', color: 'blue', bg: 'bg-blue-50', route: '/notification/subscriptions' },
  { id: 'kpi-ntf-read-rate', labelEn: 'Read Rate', labelAr: 'معدل القراءة', icon: 'pi-eye', color: 'green', bg: 'bg-green-50', route: '/notification/metrics', health: true },
];

const notification_TABS: ModuleTabDefinition[] = [
  { id: 'tab-ntf-log', labelEn: 'Notification Log', labelAr: 'سجل الإشعارات', icon: 'pi-list', route: '/notification/log', default: true },
  { id: 'tab-ntf-channels', labelEn: 'Channels', labelAr: 'القنوات', icon: 'pi-link', route: '/notification/channels' },
  { id: 'tab-ntf-templates', labelEn: 'Templates', labelAr: 'القوالب', icon: 'pi-file', route: '/notification/templates' },
  { id: 'tab-ntf-subscriptions', labelEn: 'Subscriptions', labelAr: 'الاشتراكات', icon: 'pi-users', route: '/notification/subscriptions' },
  { id: 'tab-ntf-preferences', labelEn: 'Preferences', labelAr: 'التفضيلات', icon: 'pi-cog', route: '/notification/preferences' },
];

const notification_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'queued', to: 'sent', requiredPermission: 'notification.send' },
  { from: 'sent', to: 'delivered', requiredPermission: 'notification.deliver' },
  { from: 'sent', to: 'failed', requiredPermission: 'notification.retry' },
  { from: 'failed', to: 'queued', requiredPermission: 'notification.retry' },
];

const notification_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-ntf-channel', labelEn: 'Channel', labelAr: 'القناة', type: 'select', options: [{ value: 'email', labelEn: 'Email', labelAr: 'بريد' }, { value: 'in-app', labelEn: 'In-App', labelAr: 'داخلي' }, { value: 'sms', labelEn: 'SMS', labelAr: 'رسالة' }, { value: 'webhook', labelEn: 'Webhook', labelAr: 'خطاف ويب' }] },
  { id: 'f-ntf-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'sent', labelEn: 'Sent', labelAr: 'مرسل' }, { value: 'delivered', labelEn: 'Delivered', labelAr: 'موصل' }, { value: 'failed', labelEn: 'Failed', labelAr: 'فاشل' }, { value: 'read', labelEn: 'Read', labelAr: 'مقروء' }] },
  { id: 'f-ntf-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-ntf-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
];

const analytics_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-anl-dashboards', labelEn: 'Active Dashboards', labelAr: 'لوحات نشطة', icon: 'pi-chart-pie', color: 'indigo', bg: 'bg-indigo-50', route: '/analytics/dashboards' },
  { id: 'kpi-anl-widgets', labelEn: 'Custom Widgets', labelAr: 'عناصر مخصصة', icon: 'pi-th-large', color: 'teal', bg: 'bg-teal-50', route: '/analytics/widgets' },
  { id: 'kpi-anl-queries', labelEn: 'Saved Queries', labelAr: 'استعلامات محفوظة', icon: 'pi-search', color: 'blue', bg: 'bg-blue-50', route: '/analytics/queries' },
  { id: 'kpi-anl-scheduled', labelEn: 'Scheduled Reports', labelAr: 'تقارير مجدولة', icon: 'pi-calendar', color: 'amber', bg: 'bg-amber-50', route: '/analytics/scheduled', urgency: true },
  { id: 'kpi-anl-insights', labelEn: 'AI Insights', labelAr: 'رؤى ذكية', icon: 'pi-sparkles', color: 'violet', bg: 'bg-violet-50', route: '/analytics/insights', health: true },
];

const analytics_TABS: ModuleTabDefinition[] = [
  { id: 'tab-anl-dashboards', labelEn: 'Dashboards', labelAr: 'اللوحات', icon: 'pi-chart-pie', route: '/analytics/dashboards', default: true },
  { id: 'tab-anl-explorer', labelEn: 'Data Explorer', labelAr: 'مستكشف البيانات', icon: 'pi-search', route: '/analytics/explorer' },
  { id: 'tab-anl-widgets', labelEn: 'Widget Builder', labelAr: 'بناء العناصر', icon: 'pi-th-large', route: '/analytics/widgets' },
  { id: 'tab-anl-insights', labelEn: 'AI Insights', labelAr: 'الرؤى الذكية', icon: 'pi-sparkles', route: '/analytics/insights' },
  { id: 'tab-anl-exports', labelEn: 'Exports', labelAr: 'التصدير', icon: 'pi-download', route: '/analytics/exports' },
];

const analytics_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'configured', requiredPermission: 'analytics.configure' },
  { from: 'configured', to: 'published', requiredPermission: 'analytics.publish' },
  { from: 'published', to: 'archived', requiredPermission: 'analytics.archive' },
  { from: 'archived', to: 'published', requiredPermission: 'analytics.restore' },
];

const analytics_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-anl-module', labelEn: 'Module', labelAr: 'الوحدة', type: 'select' },
  { id: 'f-anl-type', labelEn: 'Chart Type', labelAr: 'نوع الرسم', type: 'select', options: [{ value: 'line', labelEn: 'Line', labelAr: 'خطي' }, { value: 'bar', labelEn: 'Bar', labelAr: 'أعمدة' }, { value: 'pie', labelEn: 'Pie', labelAr: 'دائري' }, { value: 'heatmap', labelEn: 'Heatmap', labelAr: 'حرارة' }] },
  { id: 'f-anl-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-anl-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
];

const reporting_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-rpt-scheduled', labelEn: 'Scheduled Reports', labelAr: 'تقارير مجدولة', icon: 'pi-calendar', color: 'blue', bg: 'bg-blue-50', route: '/reporting/scheduled' },
  { id: 'kpi-rpt-generated', labelEn: 'Generated This Month', labelAr: 'مولدة هذا الشهر', icon: 'pi-chart-line', color: 'teal', bg: 'bg-teal-50', route: '/reporting/history', health: true },
  { id: 'kpi-rpt-regulatory', labelEn: 'Regulatory Due', labelAr: 'تنظيمية مستحقة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/reporting/regulatory?status=due', urgency: true },
  { id: 'kpi-rpt-templates', labelEn: 'Report Templates', labelAr: 'قوالب التقارير', icon: 'pi-file', color: 'indigo', bg: 'bg-indigo-50', route: '/reporting/templates' },
  { id: 'kpi-rpt-exports', labelEn: 'Pending Exports', labelAr: 'صادرات معلقة', icon: 'pi-download', color: 'amber', bg: 'bg-amber-50', route: '/reporting/exports?status=pending', workflow: true },
];

const reporting_TABS: ModuleTabDefinition[] = [
  { id: 'tab-rpt-dashboard', labelEn: 'Report Center', labelAr: 'مركز التقارير', icon: 'pi-chart-pie', route: '/reporting/center', default: true },
  { id: 'tab-rpt-templates', labelEn: 'Templates', labelAr: 'القوالب', icon: 'pi-file', route: '/reporting/templates' },
  { id: 'tab-rpt-scheduled', labelEn: 'Scheduled', labelAr: 'المجدولة', icon: 'pi-calendar', route: '/reporting/scheduled' },
  { id: 'tab-rpt-regulatory', labelEn: 'Regulatory', labelAr: 'التنظيمية', icon: 'pi-briefcase', route: '/reporting/regulatory' },
  { id: 'tab-rpt-history', labelEn: 'History', labelAr: 'السجل', icon: 'pi-history', route: '/reporting/history' },
];

const reporting_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'scheduled', requiredPermission: 'reporting.schedule' },
  { from: 'scheduled', to: 'generating', requiredPermission: 'reporting.generate' },
  { from: 'generating', to: 'review', requiredPermission: 'reporting.review' },
  { from: 'review', to: 'published', requiredPermission: 'reporting.publish', requiresApproval: true },
  { from: 'published', to: 'archived', requiredPermission: 'reporting.archive' },
];

const reporting_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-rpt-type', labelEn: 'Report Type', labelAr: 'نوع التقرير', type: 'select', options: [{ value: 'regulatory', labelEn: 'Regulatory', labelAr: 'تنظيمي' }, { value: 'executive', labelEn: 'Executive', labelAr: 'تنفيذي' }, { value: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي' }, { value: 'custom', labelEn: 'Custom', labelAr: 'مخصص' }] },
  { id: 'f-rpt-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' }, { value: 'scheduled', labelEn: 'Scheduled', labelAr: 'مجدول' }, { value: 'published', labelEn: 'Published', labelAr: 'منشور' }] },
  { id: 'f-rpt-module', labelEn: 'Source Module', labelAr: 'الوحدة المصدر', type: 'select' },
  { id: 'f-rpt-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
];

const integrations_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-int-active', labelEn: 'Active Connectors', labelAr: 'موصلات نشطة', icon: 'pi-link', color: 'emerald', bg: 'bg-emerald-50', route: '/integrations/connectors' },
  { id: 'kpi-int-health', labelEn: 'Connection Health', labelAr: 'صحة الاتصال', icon: 'pi-heart', color: 'teal', bg: 'bg-teal-50', route: '/integrations/health', health: true },
  { id: 'kpi-int-errors', labelEn: 'Failed Syncs', labelAr: 'مزامنات فاشلة', icon: 'pi-times-circle', color: 'red', bg: 'bg-red-50', route: '/integrations/errors', urgency: true },
  { id: 'kpi-int-webhooks', labelEn: 'Active Webhooks', labelAr: 'خطافات ويب نشطة', icon: 'pi-bolt', color: 'blue', bg: 'bg-blue-50', route: '/integrations/webhooks' },
  { id: 'kpi-int-keys', labelEn: 'API Keys', labelAr: 'مفاتيح API', icon: 'pi-key', color: 'amber', bg: 'bg-amber-50', route: '/integrations/keys' },
];

const integrations_TABS: ModuleTabDefinition[] = [
  { id: 'tab-int-connectors', labelEn: 'Connectors', labelAr: 'الموصلات', icon: 'pi-link', route: '/integrations/connectors', default: true },
  { id: 'tab-int-webhooks', labelEn: 'Webhooks', labelAr: 'خطافات الويب', icon: 'pi-bolt', route: '/integrations/webhooks' },
  { id: 'tab-int-keys', labelEn: 'API Keys', labelAr: 'مفاتيح API', icon: 'pi-key', route: '/integrations/keys' },
  { id: 'tab-int-logs', labelEn: 'Sync Logs', labelAr: 'سجلات المزامنة', icon: 'pi-list', route: '/integrations/logs' },
  { id: 'tab-int-health', labelEn: 'Health Monitor', labelAr: 'مراقب الصحة', icon: 'pi-heart', route: '/integrations/health' },
];

const integrations_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'configured', to: 'testing', requiredPermission: 'integrations.test' },
  { from: 'testing', to: 'active', requiredPermission: 'integrations.activate' },
  { from: 'active', to: 'paused', requiredPermission: 'integrations.pause' },
  { from: 'paused', to: 'active', requiredPermission: 'integrations.resume' },
  { from: 'active', to: 'decommissioned', requiredPermission: 'integrations.decommission' },
];

const integrations_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-int-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'paused', labelEn: 'Paused', labelAr: 'موقف' }, { value: 'error', labelEn: 'Error', labelAr: 'خطأ' }] },
  { id: 'f-int-type', labelEn: 'Connector Type', labelAr: 'نوع الموصل', type: 'select' },
  { id: 'f-int-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
  { id: 'f-int-date', labelEn: 'Last Sync', labelAr: 'آخر مزامنة', type: 'date-range' },
];

export const PLATFORM_SHELL_ENTRIES: Record<string, ModuleShellDefinition> = {
  admin: {
    moduleCode: 'admin',
    moduleName: { en: 'Administration', ar: 'الإدارة' },
    moduleIcon: 'pi-cog',
    moduleAccentToken: 'slate',
    purposeLine: { en: 'Platform administration — tenant settings, feature flags, system health & license management.', ar: 'إدارة المنصة — إعدادات المستأجر وعلامات الميزات وصحة النظام وإدارة الرخص.' },
    primaryAiAction: { id: 'ai-admin-health', label: { en: 'System Health', ar: 'صحة النظام' }, icon: 'bolt' },
    kpiDefinitions: admin_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: admin_TABS,
    lifecycleDefinition: admin_LIFECYCLE,
    relatedObjectTypes: ['foundation', 'integrations', 'notification', 'ai'],
    aiCapabilities: ['system_health_monitor', 'capacity_planner', 'usage_trend_analyzer', 'config_drift_detector'],
    filters: admin_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['admin'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A00-adm', name: 'System Monitor', nameAr: 'مراقب النظام', icon: 'pi-cog', color: 'slate', domain: 'Administration', domainAr: 'الإدارة', autonomyLevel: 'shadow_agent' }],
  },
  workflow: {
    moduleCode: 'workflow',
    moduleName: { en: 'Workflows', ar: 'سير العمل' },
    moduleIcon: 'pi-sitemap',
    moduleAccentToken: 'cyan',
    purposeLine: { en: 'Workflow engine for approvals, escalations, SLA management & process automation.', ar: 'محرك سير العمل للموافقات والتصعيد وإدارة مستوى الخدمة وأتمتة العمليات.' },
    primaryAiAction: { id: 'ai-workflow-optimize', label: { en: 'AI Optimize', ar: 'تحسين بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: workflow_KPIS,
    defaultWorkspacePattern: 'studio' as WorkspacePattern,
    allowedWorkspacePatterns: ['studio'] as WorkspacePattern[],
    defaultRecordTabs: workflow_TABS,
    lifecycleDefinition: workflow_LIFECYCLE,
    relatedObjectTypes: ['admin', 'notification', 'action', 'team'],
    aiCapabilities: ['workflow_optimizer', 'bottleneck_detector', 'sla_predictor', 'auto_escalation', 'process_recommender'],
    filters: workflow_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['workflow'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A03-wf', name: 'Workflow Optimizer', nameAr: 'محسن سير العمل', icon: 'pi-sitemap', color: 'cyan', domain: 'Process Automation', domainAr: 'أتمتة العمليات', autonomyLevel: 'hybrid' }],
  },
  notification: {
    moduleCode: 'notification',
    moduleName: { en: 'Notifications', ar: 'الإشعارات' },
    moduleIcon: 'pi-bell',
    moduleAccentToken: 'amber',
    purposeLine: { en: 'Notification channels, delivery management, subscription preferences & alert routing.', ar: 'قنوات الإشعارات وإدارة التوصيل وتفضيلات الاشتراك وتوجيه التنبيهات.' },
    primaryAiAction: { id: 'ai-notification-optimize', label: { en: 'AI Optimize', ar: 'تحسين بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: notification_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: notification_TABS,
    lifecycleDefinition: notification_LIFECYCLE,
    relatedObjectTypes: ['admin', 'workflow', 'inbox', 'team'],
    aiCapabilities: ['delivery_optimizer', 'priority_ranker', 'channel_recommender', 'noise_reducer'],
    filters: notification_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['notification'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A07-ntf', name: 'Notification Router', nameAr: 'موجه الإشعارات', icon: 'pi-bell', color: 'amber', domain: 'Notifications', domainAr: 'الإشعارات', autonomyLevel: 'shadow_agent' }],
  },
  analytics: {
    moduleCode: 'analytics',
    moduleName: { en: 'Analytics', ar: 'التحليلات' },
    moduleIcon: 'pi-chart-pie',
    moduleAccentToken: 'indigo',
    purposeLine: { en: 'Custom dashboards, metrics, real-time data insights & cross-module analytics.', ar: 'لوحات المعلومات المخصصة والمقاييس والرؤى الفورية والتحليلات عبر الوحدات.' },
    primaryAiAction: { id: 'ai-analytics-insight', label: { en: 'AI Insight', ar: 'رؤية بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: analytics_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: analytics_TABS,
    lifecycleDefinition: analytics_LIFECYCLE,
    relatedObjectTypes: ['reporting', 'risk', 'compliance', 'governance', 'admin'],
    aiCapabilities: ['insight_generator', 'anomaly_detector', 'trend_predictor', 'dashboard_recommender', 'data_storyteller'],
    filters: analytics_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['analytics'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A06-anl', name: 'Analytics Engine', nameAr: 'محرك التحليلات', icon: 'pi-chart-pie', color: 'indigo', domain: 'Analytics', domainAr: 'التحليلات', autonomyLevel: 'hybrid' }],
  },
  reporting: {
    moduleCode: 'reporting',
    moduleName: { en: 'Reporting', ar: 'التقارير' },
    moduleIcon: 'pi-chart-line',
    moduleAccentToken: 'blue',
    purposeLine: { en: 'Regulatory and executive reporting, scheduled exports & board pack generation.', ar: 'التقارير التنظيمية والتنفيذية والتصدير المجدول وإنشاء حزم المجلس.' },
    primaryAiAction: { id: 'ai-report-generate', label: { en: 'AI Generate', ar: 'إنشاء بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: reporting_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: reporting_TABS,
    lifecycleDefinition: reporting_LIFECYCLE,
    relatedObjectTypes: ['compliance', 'risk', 'governance', 'audit', 'analytics'],
    aiCapabilities: ['report_narrative_generator', 'data_insight_extractor', 'executive_summary_writer', 'trend_commentator', 'regulatory_formatter'],
    filters: reporting_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['reporting'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A06-rpt', name: 'Report Generator', nameAr: 'مولد التقارير', icon: 'pi-chart-line', color: 'blue', domain: 'Reporting', domainAr: 'التقارير', autonomyLevel: 'full' }],
  },
  integrations: {
    moduleCode: 'integrations',
    moduleName: { en: 'Integrations', ar: 'التكاملات' },
    moduleIcon: 'pi-link',
    moduleAccentToken: 'emerald',
    purposeLine: { en: 'Third-party connectors, webhooks, API key management & data sync monitoring.', ar: 'موصلات الطرف الثالث وخطافات الويب وإدارة مفاتيح API ومراقبة مزامنة البيانات.' },
    primaryAiAction: { id: 'ai-integration-test', label: { en: 'AI Connection Test', ar: 'اختبار الاتصال بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: integrations_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: integrations_TABS,
    lifecycleDefinition: integrations_LIFECYCLE,
    relatedObjectTypes: ['admin', 'ai', 'vendor', 'evidence', 'notification'],
    aiCapabilities: ['connection_health_predictor', 'sync_error_classifier', 'api_usage_analyzer', 'webhook_optimizer'],
    filters: integrations_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['integrations'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A09-int', name: 'Integration Monitor', nameAr: 'مراقب التكامل', icon: 'pi-link', color: 'emerald', domain: 'Integrations', domainAr: 'التكاملات', autonomyLevel: 'shadow_agent' }],
  },
};
