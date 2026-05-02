import type { ModuleShellDefinition, WorkspacePattern, ModuleKpiDefinition, ModuleTabDefinition, LifecycleStepDefinition, ModuleFilterDefinition } from './module-shell-definition';
import { MODULE_TABLE_VIEWS } from './module-table-views';

const risk_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-risk-total', labelEn: 'Total Risks', labelAr: 'إجمالي المخاطر', icon: 'pi-shield', color: 'red', bg: 'bg-red-50', route: '/risk/register' },
  { id: 'kpi-risk-critical', labelEn: 'Critical Risks', labelAr: 'المخاطر الحرجة', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-100', route: '/risk/register?severity=critical', urgency: true },
  { id: 'kpi-risk-overdue-treatments', labelEn: 'Overdue Treatments', labelAr: 'المعالجات المتأخرة', icon: 'pi-clock', color: 'orange', bg: 'bg-orange-50', route: '/risk/treatments?status=overdue', urgency: true },
  { id: 'kpi-risk-appetite-breaches', labelEn: 'Appetite Breaches', labelAr: 'تجاوزات الرغبة', icon: 'pi-chart-line', color: 'rose', bg: 'bg-rose-50', route: '/risk/appetite', urgency: true },
  { id: 'kpi-risk-kri-active', labelEn: 'Active KRIs', labelAr: 'مؤشرات المخاطر النشطة', icon: 'pi-bolt', color: 'amber', bg: 'bg-amber-50', route: '/risk/kri', health: true },
  { id: 'kpi-risk-residual-trend', labelEn: 'Residual Risk Trend', labelAr: 'اتجاه المخاطر المتبقية', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/risk/trends', health: true },
];

const risk_TABS: ModuleTabDefinition[] = [
  { id: 'tab-risk-register', labelEn: 'Risk Register', labelAr: 'سجل المخاطر', icon: 'pi-list', route: '/risk/register', default: true },
  { id: 'tab-risk-heatmap', labelEn: 'Heatmap', labelAr: 'خريطة الحرارة', icon: 'pi-th-large', route: '/risk/heatmap' },
  { id: 'tab-risk-treatments', labelEn: 'Treatments', labelAr: 'المعالجات', icon: 'pi-wrench', route: '/risk/treatments' },
  { id: 'tab-risk-kri', labelEn: 'KRI Monitoring', labelAr: 'مراقبة المؤشرات', icon: 'pi-bolt', route: '/risk/kri' },
  { id: 'tab-risk-appetite', labelEn: 'Appetite & Tolerance', labelAr: 'الرغبة والتحمل', icon: 'pi-sliders-h', route: '/risk/appetite' },
  { id: 'tab-risk-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/risk/reports' },
];

const risk_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'assessed', requiredPermission: 'risk.assess' },
  { from: 'assessed', to: 'reviewed', requiredPermission: 'risk.review', requiresApproval: true, slaHours: 72 },
  { from: 'reviewed', to: 'treatment_active', requiredPermission: 'risk.approve', requiresApproval: true, slaHours: 168 },
  { from: 'treatment_active', to: 'accepted', requiredPermission: 'risk.accept' },
  { from: 'treatment_active', to: 'closed', requiredPermission: 'risk.close' },
  { from: 'accepted', to: 'closed', requiredPermission: 'risk.close' },
];

const risk_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-risk-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' }, { value: 'assessed', labelEn: 'Assessed', labelAr: 'مقيّم' }, { value: 'reviewed', labelEn: 'Reviewed', labelAr: 'مراجع' }, { value: 'treatment_active', labelEn: 'Treatment Active', labelAr: 'معالجة نشطة' }, { value: 'accepted', labelEn: 'Accepted', labelAr: 'مقبول' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-risk-severity', labelEn: 'Severity', labelAr: 'الخطورة', type: 'multiselect', options: [{ value: 'critical', labelEn: 'Critical', labelAr: 'حرج' }, { value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-risk-category', labelEn: 'Category', labelAr: 'الفئة', type: 'select' },
  { id: 'f-risk-owner', labelEn: 'Risk Owner', labelAr: 'مالك المخاطر', type: 'search' },
  { id: 'f-risk-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-risk-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

const compliance_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-comp-score', labelEn: 'Compliance Score', labelAr: 'درجة الامتثال', icon: 'pi-check-circle', color: 'blue', bg: 'bg-blue-50', route: '/compliance/dashboard', health: true },
  { id: 'kpi-comp-frameworks', labelEn: 'Active Frameworks', labelAr: 'الأطر النشطة', icon: 'pi-book', color: 'indigo', bg: 'bg-indigo-50', route: '/compliance/frameworks' },
  { id: 'kpi-comp-gaps', labelEn: 'Open Gaps', labelAr: 'الفجوات المفتوحة', icon: 'pi-exclamation-circle', color: 'orange', bg: 'bg-orange-50', route: '/compliance/gaps', urgency: true },
  { id: 'kpi-comp-obligations', labelEn: 'Obligation Coverage', labelAr: 'تغطية الالتزامات', icon: 'pi-percentage', color: 'teal', bg: 'bg-teal-50', route: '/compliance/obligations', health: true },
  { id: 'kpi-comp-assessments', labelEn: 'Pending Assessments', labelAr: 'التقييمات المعلقة', icon: 'pi-clock', color: 'amber', bg: 'bg-amber-50', route: '/compliance/assessments?status=pending', urgency: true },
  { id: 'kpi-comp-regulatory', labelEn: 'Regulatory Updates', labelAr: 'التحديثات التنظيمية', icon: 'pi-bell', color: 'purple', bg: 'bg-purple-50', route: '/compliance/regulatory' },
];

const compliance_TABS: ModuleTabDefinition[] = [
  { id: 'tab-comp-dashboard', labelEn: 'Dashboard', labelAr: 'لوحة المعلومات', icon: 'pi-chart-pie', route: '/compliance/dashboard', default: true },
  { id: 'tab-comp-frameworks', labelEn: 'Frameworks', labelAr: 'الأطر', icon: 'pi-book', route: '/compliance/frameworks' },
  { id: 'tab-comp-obligations', labelEn: 'Obligations', labelAr: 'الالتزامات', icon: 'pi-list-check', route: '/compliance/obligations' },
  { id: 'tab-comp-assessments', labelEn: 'Assessments', labelAr: 'التقييمات', icon: 'pi-clipboard', route: '/compliance/assessments' },
  { id: 'tab-comp-gaps', labelEn: 'Gap Analysis', labelAr: 'تحليل الفجوات', icon: 'pi-search', route: '/compliance/gaps' },
  { id: 'tab-comp-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/compliance/reports' },
];

const compliance_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'planned', to: 'in_progress', requiredPermission: 'compliance.assess' },
  { from: 'in_progress', to: 'reviewed', requiredPermission: 'compliance.review', slaHours: 168 },
  { from: 'reviewed', to: 'approved', requiredPermission: 'compliance.approve', requiresApproval: true, slaHours: 72 },
  { from: 'approved', to: 'closed', requiredPermission: 'compliance.close' },
];

const compliance_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-comp-framework', labelEn: 'Framework', labelAr: 'الإطار', type: 'multiselect' },
  { id: 'f-comp-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'planned', labelEn: 'Planned', labelAr: 'مخطط' }, { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' }, { value: 'reviewed', labelEn: 'Reviewed', labelAr: 'مراجع' }, { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-comp-entity', labelEn: 'Business Unit', labelAr: 'وحدة الأعمال', type: 'select' },
  { id: 'f-comp-score', labelEn: 'Score Range', labelAr: 'نطاق الدرجة', type: 'select' },
  { id: 'f-comp-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-comp-gaps-only', labelEn: 'With Gaps Only', labelAr: 'مع فجوات فقط', type: 'toggle' },
];

const policy_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-pol-total', labelEn: 'Total Policies', labelAr: 'إجمالي السياسات', icon: 'pi-file', color: 'indigo', bg: 'bg-indigo-50', route: '/policy/library' },
  { id: 'kpi-pol-due-review', labelEn: 'Due for Review', labelAr: 'مستحقة للمراجعة', icon: 'pi-clock', color: 'orange', bg: 'bg-orange-50', route: '/policy/library?status=review_due', urgency: true },
  { id: 'kpi-pol-unacked', labelEn: 'Unacknowledged', labelAr: 'غير مقرة', icon: 'pi-user-minus', color: 'red', bg: 'bg-red-50', route: '/policy/acknowledgements?status=pending', urgency: true },
  { id: 'kpi-pol-coverage', labelEn: 'Framework Coverage', labelAr: 'تغطية الأطر', icon: 'pi-percentage', color: 'teal', bg: 'bg-teal-50', route: '/policy/coverage', health: true },
  { id: 'kpi-pol-stale', labelEn: 'Stale Policies', labelAr: 'سياسات قديمة', icon: 'pi-calendar-times', color: 'amber', bg: 'bg-amber-50', route: '/policy/library?stale=true', urgency: true },
];

const policy_TABS: ModuleTabDefinition[] = [
  { id: 'tab-pol-library', labelEn: 'Policy Library', labelAr: 'مكتبة السياسات', icon: 'pi-book', route: '/policy/library', default: true },
  { id: 'tab-pol-standards', labelEn: 'Standards', labelAr: 'المعايير', icon: 'pi-file-edit', route: '/policy/standards' },
  { id: 'tab-pol-procedures', labelEn: 'Procedures', labelAr: 'الإجراءات', icon: 'pi-list', route: '/policy/procedures' },
  { id: 'tab-pol-ack', labelEn: 'Acknowledgements', labelAr: 'الإقرارات', icon: 'pi-check-square', route: '/policy/acknowledgements' },
  { id: 'tab-pol-mapping', labelEn: 'Obligation Mapping', labelAr: 'ربط الالتزامات', icon: 'pi-link', route: '/policy/mapping' },
];

const policy_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'review', requiredPermission: 'policy.submit' },
  { from: 'review', to: 'approved', requiredPermission: 'policy.approve', requiresApproval: true, slaHours: 168 },
  { from: 'approved', to: 'published', requiredPermission: 'policy.publish' },
  { from: 'published', to: 'superseded', requiredPermission: 'policy.supersede' },
  { from: 'published', to: 'retired', requiredPermission: 'policy.retire' },
];

const policy_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-pol-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' }, { value: 'review', labelEn: 'In Review', labelAr: 'قيد المراجعة' }, { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' }, { value: 'published', labelEn: 'Published', labelAr: 'منشور' }, { value: 'retired', labelEn: 'Retired', labelAr: 'متقاعد' }] },
  { id: 'f-pol-type', labelEn: 'Document Type', labelAr: 'نوع الوثيقة', type: 'select', options: [{ value: 'policy', labelEn: 'Policy', labelAr: 'سياسة' }, { value: 'standard', labelEn: 'Standard', labelAr: 'معيار' }, { value: 'procedure', labelEn: 'Procedure', labelAr: 'إجراء' }] },
  { id: 'f-pol-owner', labelEn: 'Owner', labelAr: 'المالك', type: 'search' },
  { id: 'f-pol-date', labelEn: 'Review Date', labelAr: 'تاريخ المراجعة', type: 'date-range' },
  { id: 'f-pol-stale', labelEn: 'Stale Only', labelAr: 'القديمة فقط', type: 'toggle' },
];

const evidence_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-evi-total', labelEn: 'Evidence Items', labelAr: 'عناصر الأدلة', icon: 'pi-folder-open', color: 'teal', bg: 'bg-teal-50', route: '/evidence/vault' },
  { id: 'kpi-evi-overdue', labelEn: 'Overdue Requests', labelAr: 'طلبات متأخرة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/evidence/requests?status=overdue', urgency: true },
  { id: 'kpi-evi-expiring', labelEn: 'Expiring Soon', labelAr: 'تنتهي قريباً', icon: 'pi-calendar-times', color: 'amber', bg: 'bg-amber-50', route: '/evidence/vault?expiring=true', urgency: true },
  { id: 'kpi-evi-rejected', labelEn: 'Rejected', labelAr: 'مرفوضة', icon: 'pi-times-circle', color: 'rose', bg: 'bg-rose-50', route: '/evidence/vault?status=rejected', urgency: true },
  { id: 'kpi-evi-freshness', labelEn: 'Freshness Score', labelAr: 'درجة الحداثة', icon: 'pi-star', color: 'emerald', bg: 'bg-emerald-50', route: '/evidence/quality', health: true },
];

const evidence_TABS: ModuleTabDefinition[] = [
  { id: 'tab-evi-vault', labelEn: 'Evidence Vault', labelAr: 'خزنة الأدلة', icon: 'pi-folder', route: '/evidence/vault', default: true },
  { id: 'tab-evi-requests', labelEn: 'Requests', labelAr: 'الطلبات', icon: 'pi-inbox', route: '/evidence/requests' },
  { id: 'tab-evi-quality', labelEn: 'Quality Scores', labelAr: 'درجات الجودة', icon: 'pi-star', route: '/evidence/quality' },
  { id: 'tab-evi-custody', labelEn: 'Chain of Custody', labelAr: 'سلسلة الحفظ', icon: 'pi-link', route: '/evidence/custody' },
  { id: 'tab-evi-retention', labelEn: 'Retention', labelAr: 'الاحتفاظ', icon: 'pi-calendar', route: '/evidence/retention' },
];

const evidence_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'requested', to: 'uploaded', requiredPermission: 'evidence.upload' },
  { from: 'uploaded', to: 'reviewed', requiredPermission: 'evidence.review', slaHours: 72 },
  { from: 'reviewed', to: 'accepted', requiredPermission: 'evidence.accept' },
  { from: 'reviewed', to: 'rejected', requiredPermission: 'evidence.reject' },
  { from: 'accepted', to: 'archived', requiredPermission: 'evidence.archive' },
];

const evidence_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-evi-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'requested', labelEn: 'Requested', labelAr: 'مطلوب' }, { value: 'uploaded', labelEn: 'Uploaded', labelAr: 'مرفوع' }, { value: 'reviewed', labelEn: 'Reviewed', labelAr: 'مراجع' }, { value: 'accepted', labelEn: 'Accepted', labelAr: 'مقبول' }, { value: 'rejected', labelEn: 'Rejected', labelAr: 'مرفوض' }, { value: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف' }] },
  { id: 'f-evi-control', labelEn: 'Linked Control', labelAr: 'الضابط المرتبط', type: 'search' },
  { id: 'f-evi-date', labelEn: 'Upload Date', labelAr: 'تاريخ الرفع', type: 'date-range' },
  { id: 'f-evi-expiring', labelEn: 'Expiring Only', labelAr: 'المنتهية فقط', type: 'toggle' },
];

const audit_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-aud-plans', labelEn: 'Active Audit Plans', labelAr: 'خطط التدقيق النشطة', icon: 'pi-calendar', color: 'purple', bg: 'bg-purple-50', route: '/audit/plans' },
  { id: 'kpi-aud-findings', labelEn: 'Open Findings', labelAr: 'النتائج المفتوحة', icon: 'pi-exclamation-circle', color: 'red', bg: 'bg-red-50', route: '/audit/findings?status=open', urgency: true },
  { id: 'kpi-aud-overdue', labelEn: 'Overdue Responses', labelAr: 'الردود المتأخرة', icon: 'pi-clock', color: 'orange', bg: 'bg-orange-50', route: '/audit/findings?overdue=true', urgency: true },
  { id: 'kpi-aud-progress', labelEn: 'Audit Progress', labelAr: 'تقدم التدقيق', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/audit/progress', health: true },
  { id: 'kpi-aud-universe', labelEn: 'Audit Universe', labelAr: 'عالم التدقيق', icon: 'pi-globe', color: 'indigo', bg: 'bg-indigo-50', route: '/audit/universe' },
];

const audit_TABS: ModuleTabDefinition[] = [
  { id: 'tab-aud-plans', labelEn: 'Audit Plans', labelAr: 'خطط التدقيق', icon: 'pi-calendar', route: '/audit/plans', default: true },
  { id: 'tab-aud-engagements', labelEn: 'Engagements', labelAr: 'المهام', icon: 'pi-briefcase', route: '/audit/engagements' },
  { id: 'tab-aud-findings', labelEn: 'Findings', labelAr: 'النتائج', icon: 'pi-search', route: '/audit/findings' },
  { id: 'tab-aud-universe', labelEn: 'Audit Universe', labelAr: 'عالم التدقيق', icon: 'pi-globe', route: '/audit/universe' },
  { id: 'tab-aud-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/audit/reports' },
];

const audit_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'planned', to: 'fieldwork', requiredPermission: 'audit.execute' },
  { from: 'fieldwork', to: 'review', requiredPermission: 'audit.review', slaHours: 168 },
  { from: 'review', to: 'report_draft', requiredPermission: 'audit.draft' },
  { from: 'report_draft', to: 'issued', requiredPermission: 'audit.issue', requiresApproval: true, slaHours: 72 },
  { from: 'issued', to: 'closed', requiredPermission: 'audit.close' },
];

const audit_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-aud-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'planned', labelEn: 'Planned', labelAr: 'مخطط' }, { value: 'fieldwork', labelEn: 'Fieldwork', labelAr: 'عمل ميداني' }, { value: 'review', labelEn: 'Review', labelAr: 'مراجعة' }, { value: 'report_draft', labelEn: 'Report Draft', labelAr: 'مسودة تقرير' }, { value: 'issued', labelEn: 'Issued', labelAr: 'صادر' }, { value: 'closed', labelEn: 'Closed', labelAr: 'مغلق' }] },
  { id: 'f-aud-type', labelEn: 'Audit Type', labelAr: 'نوع التدقيق', type: 'select', options: [{ value: 'internal', labelEn: 'Internal', labelAr: 'داخلي' }, { value: 'external', labelEn: 'External', labelAr: 'خارجي' }, { value: 'regulatory', labelEn: 'Regulatory', labelAr: 'تنظيمي' }] },
  { id: 'f-aud-auditor', labelEn: 'Lead Auditor', labelAr: 'المدقق الرئيسي', type: 'search' },
  { id: 'f-aud-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
  { id: 'f-aud-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

export const GRC_SHELL_ENTRIES: Record<string, ModuleShellDefinition> = {
  risk: {
    moduleCode: 'risk',
    moduleName: { en: 'Risk Management', ar: 'إدارة المخاطر' },
    moduleIcon: 'pi-shield',
    moduleAccentToken: 'red',
    purposeLine: { en: 'Continuous enterprise risk intelligence — identification, assessment, treatment & KRI monitoring.', ar: 'ذكاء المخاطر المؤسسية المستمر — التحديد والتقييم والمعالجة ومراقبة مؤشرات المخاطر الرئيسية.' },
    primaryAiAction: { id: 'ai-risk-scan', label: { en: 'AI Risk Scan', ar: 'فحص المخاطر بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: risk_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: risk_TABS,
    lifecycleDefinition: risk_LIFECYCLE,
    relatedObjectTypes: ['control', 'compliance', 'incident', 'vendor', 'audit', 'action', 'evidence'],
    aiCapabilities: ['risk_statement_writer', 'treatment_recommender', 'trend_early_warning', 'duplicate_risk_detector', 'kri_anomaly_detection', 'risk_scoring'],
    filters: risk_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['risk'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 168,
    agents: [{ id: 'A02', name: 'Risk Sentinel', nameAr: 'حارس المخاطر', icon: 'pi-shield', color: 'red', domain: 'Risk Intelligence', domainAr: 'ذكاء المخاطر', autonomyLevel: 'hybrid' }, { id: 'A02-kri', name: 'KRI Monitor', nameAr: 'مراقب المؤشرات', icon: 'pi-bolt', color: 'amber', domain: 'KRI Analysis', domainAr: 'تحليل المؤشرات', autonomyLevel: 'shadow_agent' }],
  },
  compliance: {
    moduleCode: 'compliance',
    moduleName: { en: 'Compliance', ar: 'الامتثال' },
    moduleIcon: 'pi-check-circle',
    moduleAccentToken: 'blue',
    purposeLine: { en: 'Always-on compliance posture across Saudi and global frameworks — NCA ECC, SAMA CSF, PDPL.', ar: 'وضع الامتثال المستمر عبر الأطر السعودية والعالمية — NCA ECC، SAMA CSF، PDPL.' },
    primaryAiAction: { id: 'ai-compliance-check', label: { en: 'AI Compliance Check', ar: 'فحص الامتثال بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: compliance_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: compliance_TABS,
    lifecycleDefinition: compliance_LIFECYCLE,
    relatedObjectTypes: ['risk', 'control', 'policy', 'evidence', 'audit', 'exception', 'action'],
    aiCapabilities: ['regulation_intake_mapper', 'obligation_extractor', 'impact_analyzer', 'compliance_narrative_generator', 'gap_predictor', 'cross_framework_mapper'],
    filters: compliance_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['compliance'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 168,
    agents: [{ id: 'A03', name: 'Compliance Navigator', nameAr: 'ملاح الامتثال', icon: 'pi-check-circle', color: 'blue', domain: 'Compliance Intelligence', domainAr: 'ذكاء الامتثال', autonomyLevel: 'hybrid' }, { id: 'A03-reg', name: 'Regulatory Radar', nameAr: 'رادار تنظيمي', icon: 'pi-bell', color: 'purple', domain: 'Regulatory Monitoring', domainAr: 'مراقبة تنظيمية', autonomyLevel: 'shadow_agent' }],
  },
  policy: {
    moduleCode: 'policy',
    moduleName: { en: 'Policy Management', ar: 'إدارة السياسات' },
    moduleIcon: 'pi-file-edit',
    moduleAccentToken: 'indigo',
    purposeLine: { en: 'Policy operating system — lifecycle management, review cycles, acknowledgements & obligation mapping.', ar: 'نظام تشغيل السياسات — إدارة دورة الحياة ودورات المراجعة والإقرارات وربط الالتزامات.' },
    primaryAiAction: { id: 'ai-policy-review', label: { en: 'AI Policy Review', ar: 'مراجعة السياسة بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: policy_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: policy_TABS,
    lifecycleDefinition: policy_LIFECYCLE,
    relatedObjectTypes: ['compliance', 'control', 'exception', 'evidence', 'governance', 'action'],
    aiCapabilities: ['policy_drafting_copilot', 'regulation_to_policy_mapper', 'policy_simplifier', 'conflict_detector', 'gap_analyzer'],
    filters: policy_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['policy'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 336,
    agents: [{ id: 'A04', name: 'Policy Architect', nameAr: 'مهندس السياسات', icon: 'pi-file-edit', color: 'indigo', domain: 'Policy Intelligence', domainAr: 'ذكاء السياسات', autonomyLevel: 'hybrid' }],
  },
  evidence: {
    moduleCode: 'evidence',
    moduleName: { en: 'Evidence', ar: 'الأدلة' },
    moduleIcon: 'pi-folder-open',
    moduleAccentToken: 'teal',
    purposeLine: { en: 'Evidence vault with chain of custody, freshness tracking, quality scoring & audit trust.', ar: 'خزنة الأدلة مع سلسلة الحفظ وتتبع الحداثة وتسجيل الجودة وثقة التدقيق.' },
    primaryAiAction: { id: 'ai-evidence-collect', label: { en: 'Auto-Collect', ar: 'جمع تلقائي' }, icon: 'bolt' },
    kpiDefinitions: evidence_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: evidence_TABS,
    lifecycleDefinition: evidence_LIFECYCLE,
    relatedObjectTypes: ['control', 'compliance', 'audit', 'policy', 'risk', 'action'],
    aiCapabilities: ['evidence_classifier', 'missing_evidence_predictor', 'document_quality_scorer', 'auto_control_evidence_linkage', 'freshness_monitor'],
    filters: evidence_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['evidence'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'full',
    slaDefaultHours: 168,
    agents: [{ id: 'A05', name: 'Evidence Collector', nameAr: 'جامع الأدلة', icon: 'pi-folder-open', color: 'teal', domain: 'Evidence Management', domainAr: 'إدارة الأدلة', autonomyLevel: 'full' }],
  },
  audit: {
    moduleCode: 'audit',
    moduleName: { en: 'Audit Management', ar: 'إدارة التدقيق' },
    moduleIcon: 'pi-search',
    moduleAccentToken: 'purple',
    purposeLine: { en: 'Internal and external audit planning, execution, findings & corrective action tracking.', ar: 'تخطيط وتنفيذ التدقيق الداخلي والخارجي وإدارة النتائج وتتبع الإجراءات التصحيحية.' },
    primaryAiAction: { id: 'ai-audit-assist', label: { en: 'AI Audit Assist', ar: 'مساعد التدقيق بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: audit_KPIS,
    defaultWorkspacePattern: 'case-workspace' as WorkspacePattern,
    allowedWorkspacePatterns: ['case-workspace'] as WorkspacePattern[],
    defaultRecordTabs: audit_TABS,
    lifecycleDefinition: audit_LIFECYCLE,
    relatedObjectTypes: ['risk', 'compliance', 'control', 'evidence', 'issues', 'action', 'governance'],
    aiCapabilities: ['audit_planning_assistant', 'finding_writer', 'risk_based_sampling', 'evidence_gap_detector', 'audit_report_generator'],
    filters: audit_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['audit'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 504,
    agents: [{ id: 'A06', name: 'Audit Copilot', nameAr: 'مساعد التدقيق', icon: 'pi-search', color: 'purple', domain: 'Audit Intelligence', domainAr: 'ذكاء التدقيق', autonomyLevel: 'hybrid' }],
  },
  controls: {
    moduleCode: 'controls',
    moduleName: { en: 'Control Management', ar: 'إدارة الضوابط' },
    moduleIcon: 'pi-sliders-h',
    moduleAccentToken: 'sky',
    purposeLine: { en: 'Control library, testing, effectiveness assessment & gap remediation tracking.', ar: 'مكتبة الضوابط والاختبار وتقييم الفعالية وتتبع معالجة الفجوات.' },
    primaryAiAction: { id: 'ai-control-test', label: { en: 'AI Control Test', ar: 'اختبار الضوابط بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: [
      { id: 'kpi-ctrl-total', labelEn: 'Total Controls', labelAr: 'إجمالي الضوابط', icon: 'pi-sliders-h', color: 'sky', bg: 'bg-sky-50', route: '/controls/library' },
      { id: 'kpi-ctrl-ineffective', labelEn: 'Ineffective Controls', labelAr: 'ضوابط غير فعالة', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/controls/library?effectiveness=ineffective', urgency: true },
      { id: 'kpi-ctrl-untested', labelEn: 'Untested', labelAr: 'غير مختبرة', icon: 'pi-question-circle', color: 'amber', bg: 'bg-amber-50', route: '/controls/library?tested=false', urgency: true },
      { id: 'kpi-ctrl-coverage', labelEn: 'Framework Coverage', labelAr: 'تغطية الأطر', icon: 'pi-percentage', color: 'teal', bg: 'bg-teal-50', route: '/controls/coverage', health: true },
      { id: 'kpi-ctrl-automated', labelEn: 'Automated Controls', labelAr: 'ضوابط مؤتمتة', icon: 'pi-microchip-ai', color: 'blue', bg: 'bg-blue-50', route: '/controls/library?automated=true' },
    ],
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: [
      { id: 'tab-ctrl-library', labelEn: 'Control Library', labelAr: 'مكتبة الضوابط', icon: 'pi-list', route: '/controls/library', default: true },
      { id: 'tab-ctrl-testing', labelEn: 'Testing', labelAr: 'الاختبار', icon: 'pi-check-square', route: '/controls/testing' },
      { id: 'tab-ctrl-coverage', labelEn: 'Coverage Map', labelAr: 'خريطة التغطية', icon: 'pi-th-large', route: '/controls/coverage' },
      { id: 'tab-ctrl-gaps', labelEn: 'Gap Analysis', labelAr: 'تحليل الفجوات', icon: 'pi-search', route: '/controls/gaps' },
      { id: 'tab-ctrl-reports', labelEn: 'Reports', labelAr: 'التقارير', icon: 'pi-chart-line', route: '/controls/reports' },
    ],
    lifecycleDefinition: [
      { from: 'draft', to: 'active', requiredPermission: 'control.activate' },
      { from: 'active', to: 'testing', requiredPermission: 'control.test', slaHours: 168 },
      { from: 'testing', to: 'effective', requiredPermission: 'control.certify' },
      { from: 'testing', to: 'ineffective', requiredPermission: 'control.fail' },
      { from: 'ineffective', to: 'remediation', requiredPermission: 'control.remediate' },
      { from: 'active', to: 'retired', requiredPermission: 'control.retire' },
    ],
    relatedObjectTypes: ['risk', 'compliance', 'evidence', 'audit', 'policy', 'action', 'vendor'],
    aiCapabilities: ['control_effectiveness_scorer', 'control_gap_detector', 'test_plan_generator', 'duplicate_control_finder', 'control_evidence_mapper'],
    filters: [
      { id: 'f-ctrl-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' }, { value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'testing', labelEn: 'Testing', labelAr: 'قيد الاختبار' }, { value: 'effective', labelEn: 'Effective', labelAr: 'فعال' }, { value: 'ineffective', labelEn: 'Ineffective', labelAr: 'غير فعال' }, { value: 'retired', labelEn: 'Retired', labelAr: 'متقاعد' }] },
      { id: 'f-ctrl-type', labelEn: 'Control Type', labelAr: 'نوع الضابط', type: 'select', options: [{ value: 'preventive', labelEn: 'Preventive', labelAr: 'وقائي' }, { value: 'detective', labelEn: 'Detective', labelAr: 'كشفي' }, { value: 'corrective', labelEn: 'Corrective', labelAr: 'تصحيحي' }] },
      { id: 'f-ctrl-owner', labelEn: 'Control Owner', labelAr: 'مالك الضابط', type: 'search' },
      { id: 'f-ctrl-framework', labelEn: 'Framework', labelAr: 'الإطار', type: 'multiselect' },
      { id: 'f-ctrl-automated', labelEn: 'Automated Only', labelAr: 'المؤتمتة فقط', type: 'toggle' },
    ],
    tableViews: MODULE_TABLE_VIEWS['controls'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'semi',
    slaDefaultHours: 168,
    agents: [{ id: 'A04-ctrl', name: 'Control Analyst', nameAr: 'محلل الضوابط', icon: 'pi-sliders-h', color: 'sky', domain: 'Control Intelligence', domainAr: 'ذكاء الضوابط', autonomyLevel: 'hybrid' }],
  },
};
