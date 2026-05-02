import type { ModuleShellDefinition, WorkspacePattern, ModuleKpiDefinition, ModuleTabDefinition, LifecycleStepDefinition, ModuleFilterDefinition } from './module-shell-definition';
import { MODULE_TABLE_VIEWS } from './module-table-views';

const governance_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-gov-health', labelEn: 'Governance Health', labelAr: 'صحة الحوكمة', icon: 'pi-heart', color: 'cyan', bg: 'bg-cyan-50', route: '/governance/health', health: true },
  { id: 'kpi-gov-decisions', labelEn: 'Overdue Decisions', labelAr: 'قرارات متأخرة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/governance/decisions?status=overdue', urgency: true },
  { id: 'kpi-gov-actions', labelEn: 'Open Board Actions', labelAr: 'إجراءات مجلس مفتوحة', icon: 'pi-list-check', color: 'orange', bg: 'bg-orange-50', route: '/governance/actions?status=open', urgency: true },
  { id: 'kpi-gov-committees', labelEn: 'Active Committees', labelAr: 'اللجان النشطة', icon: 'pi-users', color: 'blue', bg: 'bg-blue-50', route: '/governance/committees' },
  { id: 'kpi-gov-effectiveness', labelEn: 'Committee Effectiveness', labelAr: 'فعالية اللجان', icon: 'pi-chart-bar', color: 'teal', bg: 'bg-teal-50', route: '/governance/effectiveness', health: true },
  { id: 'kpi-gov-delegation', labelEn: 'Delegation Conflicts', labelAr: 'تعارضات التفويض', icon: 'pi-exclamation-triangle', color: 'amber', bg: 'bg-amber-50', route: '/governance/delegation?conflicts=true', urgency: true },
];

const governance_TABS: ModuleTabDefinition[] = [
  { id: 'tab-gov-dashboard', labelEn: 'Governance Dashboard', labelAr: 'لوحة الحوكمة', icon: 'pi-chart-pie', route: '/governance/dashboard', default: true },
  { id: 'tab-gov-committees', labelEn: 'Committees', labelAr: 'اللجان', icon: 'pi-users', route: '/governance/committees' },
  { id: 'tab-gov-charters', labelEn: 'Charters', labelAr: 'المواثيق', icon: 'pi-file', route: '/governance/charters' },
  { id: 'tab-gov-decisions', labelEn: 'Decisions', labelAr: 'القرارات', icon: 'pi-check-square', route: '/governance/decisions' },
  { id: 'tab-gov-delegation', labelEn: 'Delegation Matrix', labelAr: 'مصفوفة التفويض', icon: 'pi-sitemap', route: '/governance/delegation' },
  { id: 'tab-gov-meetings', labelEn: 'Meeting Cycles', labelAr: 'دورات الاجتماعات', icon: 'pi-calendar', route: '/governance/meetings' },
];

const governance_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'charter_draft', to: 'charter_review', requiredPermission: 'governance.submit' },
  { from: 'charter_review', to: 'charter_approved', requiredPermission: 'governance.approve', requiresApproval: true, slaHours: 168 },
  { from: 'charter_approved', to: 'charter_published', requiredPermission: 'governance.publish' },
  { from: 'decision_proposed', to: 'decision_reviewed', requiredPermission: 'governance.review' },
  { from: 'decision_reviewed', to: 'decision_approved', requiredPermission: 'governance.approve', requiresApproval: true },
  { from: 'decision_approved', to: 'decision_actioned', requiredPermission: 'governance.action' },
];

const governance_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-gov-entity', labelEn: 'Governance Body', labelAr: 'جهة الحوكمة', type: 'select' },
  { id: 'f-gov-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' }, { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' }] },
  { id: 'f-gov-committee', labelEn: 'Committee', labelAr: 'اللجنة', type: 'select' },
  { id: 'f-gov-owner', labelEn: 'Chair/Owner', labelAr: 'الرئيس/المالك', type: 'search' },
  { id: 'f-gov-date', labelEn: 'Meeting Date', labelAr: 'تاريخ الاجتماع', type: 'date-range' },
  { id: 'f-gov-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

const ai_governance_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-aig-models', labelEn: 'Registered Models', labelAr: 'النماذج المسجلة', icon: 'pi-microchip', color: 'pink', bg: 'bg-pink-50', route: '/ai-governance/models' },
  { id: 'kpi-aig-reviews', labelEn: 'Pending Reviews', labelAr: 'مراجعات معلقة', icon: 'pi-clock', color: 'amber', bg: 'bg-amber-50', route: '/ai-governance/reviews?status=pending', urgency: true },
  { id: 'kpi-aig-bias', labelEn: 'Bias Alerts', labelAr: 'تنبيهات التحيز', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/ai-governance/bias', urgency: true },
  { id: 'kpi-aig-compliance', labelEn: 'Ethics Compliance', labelAr: 'الامتثال الأخلاقي', icon: 'pi-check-circle', color: 'teal', bg: 'bg-teal-50', route: '/ai-governance/ethics', health: true },
  { id: 'kpi-aig-risk', labelEn: 'High-Risk AI', labelAr: 'ذكاء اصطناعي عالي المخاطر', icon: 'pi-shield', color: 'orange', bg: 'bg-orange-50', route: '/ai-governance/models?risk=high', urgency: true },
];

const ai_governance_TABS: ModuleTabDefinition[] = [
  { id: 'tab-aig-models', labelEn: 'Model Registry', labelAr: 'سجل النماذج', icon: 'pi-list', route: '/ai-governance/models', default: true },
  { id: 'tab-aig-reviews', labelEn: 'Ethical Reviews', labelAr: 'المراجعات الأخلاقية', icon: 'pi-search', route: '/ai-governance/reviews' },
  { id: 'tab-aig-bias', labelEn: 'Bias Detection', labelAr: 'كشف التحيز', icon: 'pi-chart-bar', route: '/ai-governance/bias' },
  { id: 'tab-aig-risk', labelEn: 'Risk Assessment', labelAr: 'تقييم المخاطر', icon: 'pi-shield', route: '/ai-governance/risk' },
  { id: 'tab-aig-compliance', labelEn: 'Ethics Compliance', labelAr: 'الامتثال الأخلاقي', icon: 'pi-check-circle', route: '/ai-governance/compliance' },
];

const ai_governance_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'registered', to: 'under_review', requiredPermission: 'ai-governance.review' },
  { from: 'under_review', to: 'approved', requiredPermission: 'ai-governance.approve', requiresApproval: true, slaHours: 168 },
  { from: 'under_review', to: 'restricted', requiredPermission: 'ai-governance.restrict' },
  { from: 'approved', to: 'deployed', requiredPermission: 'ai-governance.deploy' },
  { from: 'deployed', to: 'monitoring', requiredPermission: 'ai-governance.monitor' },
  { from: 'monitoring', to: 'retired', requiredPermission: 'ai-governance.retire' },
];

const ai_governance_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-aig-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'registered', labelEn: 'Registered', labelAr: 'مسجل' }, { value: 'under_review', labelEn: 'Under Review', labelAr: 'قيد المراجعة' }, { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' }, { value: 'deployed', labelEn: 'Deployed', labelAr: 'منشور' }, { value: 'retired', labelEn: 'Retired', labelAr: 'متقاعد' }] },
  { id: 'f-aig-risk', labelEn: 'Risk Level', labelAr: 'مستوى المخاطر', type: 'select', options: [{ value: 'high', labelEn: 'High', labelAr: 'عالي' }, { value: 'medium', labelEn: 'Medium', labelAr: 'متوسط' }, { value: 'low', labelEn: 'Low', labelAr: 'منخفض' }] },
  { id: 'f-aig-type', labelEn: 'Model Type', labelAr: 'نوع النموذج', type: 'select' },
  { id: 'f-aig-owner', labelEn: 'Model Owner', labelAr: 'مالك النموذج', type: 'search' },
  { id: 'f-aig-date', labelEn: 'Review Date', labelAr: 'تاريخ المراجعة', type: 'date-range' },
];

const ai_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-ai-agents', labelEn: 'Active Agents', labelAr: 'وكلاء نشطون', icon: 'pi-sparkles', color: 'violet', bg: 'bg-violet-50', route: '/ai/agents' },
  { id: 'kpi-ai-requests', labelEn: 'Requests Today', labelAr: 'طلبات اليوم', icon: 'pi-bolt', color: 'teal', bg: 'bg-teal-50', route: '/ai/usage' },
  { id: 'kpi-ai-budget', labelEn: 'Budget Used', labelAr: 'الميزانية المستخدمة', icon: 'pi-dollar', color: 'amber', bg: 'bg-amber-50', route: '/ai/budget', health: true },
  { id: 'kpi-ai-errors', labelEn: 'Error Rate', labelAr: 'معدل الأخطاء', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/ai/errors', urgency: true },
  { id: 'kpi-ai-models', labelEn: 'Configured Models', labelAr: 'النماذج المكونة', icon: 'pi-cog', color: 'blue', bg: 'bg-blue-50', route: '/ai/models' },
];

const ai_TABS: ModuleTabDefinition[] = [
  { id: 'tab-ai-dashboard', labelEn: 'AI Dashboard', labelAr: 'لوحة الذكاء', icon: 'pi-chart-pie', route: '/ai/dashboard', default: true },
  { id: 'tab-ai-agents', labelEn: 'Agents', labelAr: 'الوكلاء', icon: 'pi-sparkles', route: '/ai/agents' },
  { id: 'tab-ai-prompts', labelEn: 'Prompt Library', labelAr: 'مكتبة الأوامر', icon: 'pi-file-edit', route: '/ai/prompts' },
  { id: 'tab-ai-models', labelEn: 'Models', labelAr: 'النماذج', icon: 'pi-cog', route: '/ai/models' },
  { id: 'tab-ai-budget', labelEn: 'Budget & Usage', labelAr: 'الميزانية والاستخدام', icon: 'pi-dollar', route: '/ai/budget' },
];

const ai_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'configured', to: 'testing', requiredPermission: 'ai.test' },
  { from: 'testing', to: 'active', requiredPermission: 'ai.activate' },
  { from: 'active', to: 'paused', requiredPermission: 'ai.pause' },
  { from: 'paused', to: 'active', requiredPermission: 'ai.resume' },
  { from: 'active', to: 'retired', requiredPermission: 'ai.retire' },
];

const ai_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-ai-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'paused', labelEn: 'Paused', labelAr: 'موقف' }, { value: 'testing', labelEn: 'Testing', labelAr: 'اختبار' }, { value: 'retired', labelEn: 'Retired', labelAr: 'متقاعد' }] },
  { id: 'f-ai-provider', labelEn: 'Provider', labelAr: 'المزود', type: 'select', options: [{ value: 'azure-openai', labelEn: 'Azure OpenAI', labelAr: 'Azure OpenAI' }, { value: 'anthropic', labelEn: 'Anthropic', labelAr: 'Anthropic' }, { value: 'ollama', labelEn: 'Ollama', labelAr: 'Ollama' }] },
  { id: 'f-ai-agent', labelEn: 'Agent', labelAr: 'الوكيل', type: 'select' },
  { id: 'f-ai-date', labelEn: 'Date Range', labelAr: 'نطاق التاريخ', type: 'date-range' },
];

const foundation_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-fnd-users', labelEn: 'Active Users', labelAr: 'المستخدمون النشطون', icon: 'pi-users', color: 'gray', bg: 'bg-gray-50', route: '/foundation/users' },
  { id: 'kpi-fnd-roles', labelEn: 'Defined Roles', labelAr: 'الأدوار المعرفة', icon: 'pi-id-card', color: 'blue', bg: 'bg-blue-50', route: '/foundation/roles', health: true },
  { id: 'kpi-fnd-departments', labelEn: 'Departments', labelAr: 'الأقسام', icon: 'pi-building', color: 'teal', bg: 'bg-teal-50', route: '/foundation/departments' },
  { id: 'kpi-fnd-orphaned', labelEn: 'Orphaned Users', labelAr: 'مستخدمون بدون قسم', icon: 'pi-user-minus', color: 'amber', bg: 'bg-amber-50', route: '/foundation/users?orphaned=true', urgency: true },
  { id: 'kpi-fnd-sod', labelEn: 'SoD Conflicts', labelAr: 'تعارضات فصل المهام', icon: 'pi-exclamation-triangle', color: 'red', bg: 'bg-red-50', route: '/foundation/sod', urgency: true },
];

const foundation_TABS: ModuleTabDefinition[] = [
  { id: 'tab-fnd-users', labelEn: 'Users', labelAr: 'المستخدمون', icon: 'pi-users', route: '/foundation/users', default: true },
  { id: 'tab-fnd-roles', labelEn: 'Roles & Permissions', labelAr: 'الأدوار والصلاحيات', icon: 'pi-id-card', route: '/foundation/roles' },
  { id: 'tab-fnd-departments', labelEn: 'Departments', labelAr: 'الأقسام', icon: 'pi-building', route: '/foundation/departments' },
  { id: 'tab-fnd-org', labelEn: 'Org Chart', labelAr: 'الهيكل التنظيمي', icon: 'pi-sitemap', route: '/foundation/org' },
  { id: 'tab-fnd-authority', labelEn: 'Authority Matrix', labelAr: 'مصفوفة السلطة', icon: 'pi-th-large', route: '/foundation/authority' },
];

const foundation_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'invited', to: 'active', requiredPermission: 'foundation.activate' },
  { from: 'active', to: 'suspended', requiredPermission: 'foundation.suspend' },
  { from: 'suspended', to: 'active', requiredPermission: 'foundation.reactivate' },
  { from: 'active', to: 'offboarded', requiredPermission: 'foundation.offboard' },
];

const foundation_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-fnd-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'suspended', labelEn: 'Suspended', labelAr: 'معلق' }, { value: 'invited', labelEn: 'Invited', labelAr: 'مدعو' }, { value: 'offboarded', labelEn: 'Offboarded', labelAr: 'منهي' }] },
  { id: 'f-fnd-role', labelEn: 'Role', labelAr: 'الدور', type: 'select' },
  { id: 'f-fnd-dept', labelEn: 'Department', labelAr: 'القسم', type: 'select' },
  { id: 'f-fnd-search', labelEn: 'Search', labelAr: 'بحث', type: 'search' },
];

const training_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-trn-campaigns', labelEn: 'Active Campaigns', labelAr: 'حملات نشطة', icon: 'pi-megaphone', color: 'violet', bg: 'bg-violet-50', route: '/training/campaigns' },
  { id: 'kpi-trn-completion', labelEn: 'Completion Rate', labelAr: 'معدل الإكمال', icon: 'pi-percentage', color: 'teal', bg: 'bg-teal-50', route: '/training/metrics', health: true },
  { id: 'kpi-trn-overdue', labelEn: 'Overdue Assignments', labelAr: 'مهام متأخرة', icon: 'pi-clock', color: 'red', bg: 'bg-red-50', route: '/training/assignments?status=overdue', urgency: true },
  { id: 'kpi-trn-certs', labelEn: 'Expiring Certs', labelAr: 'شهادات تنتهي', icon: 'pi-id-card', color: 'amber', bg: 'bg-amber-50', route: '/training/certifications?expiring=true', urgency: true },
  { id: 'kpi-trn-gaps', labelEn: 'Skill Gaps', labelAr: 'فجوات المهارات', icon: 'pi-exclamation-circle', color: 'orange', bg: 'bg-orange-50', route: '/training/gaps', urgency: true },
];

const training_TABS: ModuleTabDefinition[] = [
  { id: 'tab-trn-campaigns', labelEn: 'Campaigns', labelAr: 'الحملات', icon: 'pi-megaphone', route: '/training/campaigns', default: true },
  { id: 'tab-trn-courses', labelEn: 'Course Library', labelAr: 'مكتبة الدورات', icon: 'pi-book', route: '/training/courses' },
  { id: 'tab-trn-assignments', labelEn: 'Assignments', labelAr: 'المهام', icon: 'pi-list', route: '/training/assignments' },
  { id: 'tab-trn-certs', labelEn: 'Certifications', labelAr: 'الشهادات', icon: 'pi-id-card', route: '/training/certifications' },
  { id: 'tab-trn-gaps', labelEn: 'Gap Analysis', labelAr: 'تحليل الفجوات', icon: 'pi-search', route: '/training/gaps' },
];

const training_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'draft', to: 'published', requiredPermission: 'training.publish' },
  { from: 'published', to: 'active', requiredPermission: 'training.activate' },
  { from: 'active', to: 'completed', requiredPermission: 'training.complete' },
  { from: 'active', to: 'expired', requiredPermission: 'training.expire' },
  { from: 'completed', to: 'certified', requiredPermission: 'training.certify' },
];

const training_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-trn-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' }, { value: 'active', labelEn: 'Active', labelAr: 'نشط' }, { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' }, { value: 'expired', labelEn: 'Expired', labelAr: 'منتهي' }] },
  { id: 'f-trn-type', labelEn: 'Training Type', labelAr: 'نوع التدريب', type: 'select', options: [{ value: 'mandatory', labelEn: 'Mandatory', labelAr: 'إلزامي' }, { value: 'optional', labelEn: 'Optional', labelAr: 'اختياري' }, { value: 'certification', labelEn: 'Certification', labelAr: 'شهادة' }] },
  { id: 'f-trn-dept', labelEn: 'Department', labelAr: 'القسم', type: 'select' },
  { id: 'f-trn-date', labelEn: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'date-range' },
  { id: 'f-trn-overdue', labelEn: 'Overdue Only', labelAr: 'المتأخرة فقط', type: 'toggle' },
];

const qiyas_KPIS: ModuleKpiDefinition[] = [
  { id: 'kpi-qiy-score', labelEn: 'Maturity Score', labelAr: 'درجة النضج', icon: 'pi-chart-bar', color: 'fuchsia', bg: 'bg-fuchsia-50', route: '/qiyas/dashboard', health: true },
  { id: 'kpi-qiy-domains', labelEn: 'Domains Assessed', labelAr: 'المجالات المقيمة', icon: 'pi-th-large', color: 'purple', bg: 'bg-purple-50', route: '/qiyas/domains' },
  { id: 'kpi-qiy-gaps', labelEn: 'Improvement Gaps', labelAr: 'فجوات التحسين', icon: 'pi-exclamation-circle', color: 'orange', bg: 'bg-orange-50', route: '/qiyas/gaps', urgency: true },
  { id: 'kpi-qiy-roadmap', labelEn: 'Roadmap Items', labelAr: 'عناصر خارطة الطريق', icon: 'pi-map', color: 'teal', bg: 'bg-teal-50', route: '/qiyas/roadmap' },
  { id: 'kpi-qiy-benchmark', labelEn: 'Benchmark Rank', labelAr: 'ترتيب المقارنة', icon: 'pi-sort-amount-up', color: 'blue', bg: 'bg-blue-50', route: '/qiyas/benchmark', health: true },
];

const qiyas_TABS: ModuleTabDefinition[] = [
  { id: 'tab-qiy-dashboard', labelEn: 'Maturity Dashboard', labelAr: 'لوحة النضج', icon: 'pi-chart-pie', route: '/qiyas/dashboard', default: true },
  { id: 'tab-qiy-assessments', labelEn: 'Assessments', labelAr: 'التقييمات', icon: 'pi-clipboard', route: '/qiyas/assessments' },
  { id: 'tab-qiy-domains', labelEn: 'Domains', labelAr: 'المجالات', icon: 'pi-th-large', route: '/qiyas/domains' },
  { id: 'tab-qiy-roadmap', labelEn: 'Roadmap', labelAr: 'خارطة الطريق', icon: 'pi-map', route: '/qiyas/roadmap' },
  { id: 'tab-qiy-benchmark', labelEn: 'Benchmarking', labelAr: 'المقارنة المرجعية', icon: 'pi-sort-amount-up', route: '/qiyas/benchmark' },
];

const qiyas_LIFECYCLE: LifecycleStepDefinition[] = [
  { from: 'planned', to: 'launched', requiredPermission: 'qiyas.launch' },
  { from: 'launched', to: 'responded', requiredPermission: 'qiyas.respond', slaHours: 336 },
  { from: 'responded', to: 'reviewed', requiredPermission: 'qiyas.review' },
  { from: 'reviewed', to: 'approved', requiredPermission: 'qiyas.approve', requiresApproval: true },
  { from: 'approved', to: 'actioned', requiredPermission: 'qiyas.action' },
];

const qiyas_FILTERS: ModuleFilterDefinition[] = [
  { id: 'f-qiy-status', labelEn: 'Status', labelAr: 'الحالة', type: 'multiselect', options: [{ value: 'planned', labelEn: 'Planned', labelAr: 'مخطط' }, { value: 'launched', labelEn: 'Launched', labelAr: 'مطلق' }, { value: 'reviewed', labelEn: 'Reviewed', labelAr: 'مراجع' }, { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' }] },
  { id: 'f-qiy-domain', labelEn: 'Domain', labelAr: 'المجال', type: 'select' },
  { id: 'f-qiy-model', labelEn: 'Maturity Model', labelAr: 'نموذج النضج', type: 'select' },
  { id: 'f-qiy-date', labelEn: 'Assessment Date', labelAr: 'تاريخ التقييم', type: 'date-range' },
];

export const GOV_SHELL_ENTRIES: Record<string, ModuleShellDefinition> = {
  governance: {
    moduleCode: 'governance',
    moduleName: { en: 'Governance', ar: 'الحوكمة' },
    moduleIcon: 'pi-sitemap',
    moduleAccentToken: 'cyan',
    purposeLine: { en: 'Executive operating system for authority, decisions, committees, charters & accountability.', ar: 'نظام التشغيل التنفيذي للسلطة والقرارات واللجان والمواثيق والمساءلة.' },
    primaryAiAction: { id: 'ai-gov-insight', label: { en: 'AI Governance Insight', ar: 'رؤية الحوكمة بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: governance_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: governance_TABS,
    lifecycleDefinition: governance_LIFECYCLE,
    relatedObjectTypes: ['risk', 'compliance', 'policy', 'action', 'audit', 'team', 'foundation'],
    aiCapabilities: ['board_pack_summarizer', 'decision_risk_impact_explainer', 'governance_gap_detector', 'charter_policy_alignment_checker', 'meeting_action_extractor'],
    filters: governance_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['governance'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'full',
    automationLevel: 'manual',
    slaDefaultHours: 720,
    agents: [{ id: 'A01', name: 'Governance Advisor', nameAr: 'مستشار الحوكمة', icon: 'pi-sitemap', color: 'cyan', domain: 'Governance Intelligence', domainAr: 'ذكاء الحوكمة', autonomyLevel: 'hybrid' }, { id: 'A01-bp', name: 'Board Pack Builder', nameAr: 'بناء حزمة المجلس', icon: 'pi-file', color: 'blue', domain: 'Board Reporting', domainAr: 'تقارير المجلس', autonomyLevel: 'shadow_agent' }],
  },
  'ai-governance': {
    moduleCode: 'ai-governance',
    moduleName: { en: 'AI Governance', ar: 'حوكمة الذكاء الاصطناعي' },
    moduleIcon: 'pi-microchip',
    moduleAccentToken: 'pink',
    purposeLine: { en: 'AI model registry, bias detection, ethical reviews, risk assessment & responsible AI.', ar: 'سجل نماذج الذكاء الاصطناعي وكشف التحيز والمراجعات الأخلاقية وتقييم المخاطر والذكاء المسؤول.' },
    primaryAiAction: { id: 'ai-model-audit', label: { en: 'AI Model Audit', ar: 'تدقيق النموذج بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: ai_governance_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: ai_governance_TABS,
    lifecycleDefinition: ai_governance_LIFECYCLE,
    relatedObjectTypes: ['risk', 'compliance', 'governance', 'evidence', 'action', 'privacy'],
    aiCapabilities: ['bias_detector', 'fairness_scorer', 'explainability_generator', 'model_risk_assessor', 'ethical_compliance_checker'],
    filters: ai_governance_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['ai-governance'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'domain',
    automationLevel: 'semi',
    slaDefaultHours: 336,
    agents: [{ id: 'A10-aig', name: 'AI Ethics Sentinel', nameAr: 'حارس أخلاقيات الذكاء', icon: 'pi-microchip', color: 'pink', domain: 'AI Ethics', domainAr: 'أخلاقيات الذكاء الاصطناعي', autonomyLevel: 'hybrid' }],
  },
  ai: {
    moduleCode: 'ai',
    moduleName: { en: 'AI Engine', ar: 'محرك الذكاء الاصطناعي' },
    moduleIcon: 'pi-sparkles',
    moduleAccentToken: 'violet',
    purposeLine: { en: 'AI agents, prompt management, budget controls, model configuration & usage analytics.', ar: 'وكلاء الذكاء الاصطناعي وإدارة الأوامر وضوابط الميزانية وتكوين النماذج وتحليلات الاستخدام.' },
    primaryAiAction: { id: 'ai-engine-status', label: { en: 'Engine Status', ar: 'حالة المحرك' }, icon: 'bolt' },
    kpiDefinitions: ai_KPIS,
    defaultWorkspacePattern: 'studio' as WorkspacePattern,
    allowedWorkspacePatterns: ['studio'] as WorkspacePattern[],
    defaultRecordTabs: ai_TABS,
    lifecycleDefinition: ai_LIFECYCLE,
    relatedObjectTypes: ['ai-governance', 'admin', 'analytics', 'workflow'],
    aiCapabilities: ['agent_health_monitor', 'prompt_optimizer', 'budget_forecaster', 'usage_analyzer', 'model_performance_scorer'],
    filters: ai_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['ai'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A00', name: 'AI Orchestrator', nameAr: 'منسق الذكاء', icon: 'pi-sparkles', color: 'violet', domain: 'AI Operations', domainAr: 'عمليات الذكاء', autonomyLevel: 'full' }],
  },
  foundation: {
    moduleCode: 'foundation',
    moduleName: { en: 'Foundation', ar: 'الأساس' },
    moduleIcon: 'pi-building',
    moduleAccentToken: 'gray',
    purposeLine: { en: 'Core organizational structure — users, roles, departments, org units & authority matrix.', ar: 'الهيكل التنظيمي الأساسي — المستخدمين والأدوار والأقسام ووحدات التنظيم ومصفوفة السلطة.' },
    primaryAiAction: { id: 'ai-org-scan', label: { en: 'AI Org Scan', ar: 'فحص المنظمة بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: foundation_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: foundation_TABS,
    lifecycleDefinition: foundation_LIFECYCLE,
    relatedObjectTypes: ['team', 'governance', 'admin', 'action', 'training'],
    aiCapabilities: ['org_structure_analyzer', 'sod_conflict_detector', 'role_optimizer', 'access_reviewer', 'reporting_line_validator'],
    filters: foundation_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['foundation'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'platform',
    automationLevel: null,
    slaDefaultHours: null,
    agents: [{ id: 'A01-fnd', name: 'Org Analyst', nameAr: 'محلل المنظمة', icon: 'pi-building', color: 'gray', domain: 'Organization', domainAr: 'المنظمة', autonomyLevel: 'shadow_agent' }],
  },
  training: {
    moduleCode: 'training',
    moduleName: { en: 'Training & Awareness', ar: 'التدريب والتوعية' },
    moduleIcon: 'pi-graduation-cap',
    moduleAccentToken: 'violet',
    purposeLine: { en: 'Compliance training campaigns, course management, certification tracking & gap analysis.', ar: 'حملات التدريب على الامتثال وإدارة الدورات وتتبع الشهادات وتحليل الفجوات.' },
    primaryAiAction: { id: 'ai-training-recommend', label: { en: 'AI Recommend', ar: 'توصية بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: training_KPIS,
    defaultWorkspacePattern: 'registry' as WorkspacePattern,
    allowedWorkspacePatterns: ['registry'] as WorkspacePattern[],
    defaultRecordTabs: training_TABS,
    lifecycleDefinition: training_LIFECYCLE,
    relatedObjectTypes: ['compliance', 'policy', 'risk', 'team', 'foundation', 'action'],
    aiCapabilities: ['training_recommender', 'gap_analyzer', 'content_generator', 'completion_predictor', 'skill_mapper'],
    filters: training_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['training'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'domain',
    automationLevel: 'semi',
    slaDefaultHours: 336,
    agents: [{ id: 'A07-trn', name: 'Training Advisor', nameAr: 'مستشار التدريب', icon: 'pi-graduation-cap', color: 'violet', domain: 'Learning Intelligence', domainAr: 'ذكاء التعلم', autonomyLevel: 'shadow_agent' }],
  },
  qiyas: {
    moduleCode: 'qiyas',
    moduleName: { en: 'Qiyas Maturity Assessment', ar: 'قياس النضج' },
    moduleIcon: 'pi-chart-bar',
    moduleAccentToken: 'fuchsia',
    purposeLine: { en: 'GRC maturity assessment, benchmarking, roadmap planning & continuous improvement.', ar: 'تقييم نضج الحوكمة والمخاطر والامتثال والمقارنة المرجعية وتخطيط خارطة الطريق.' },
    primaryAiAction: { id: 'ai-maturity-assess', label: { en: 'AI Assess', ar: 'تقييم بالذكاء الاصطناعي' }, icon: 'bolt' },
    kpiDefinitions: qiyas_KPIS,
    defaultWorkspacePattern: 'command-center' as WorkspacePattern,
    allowedWorkspacePatterns: ['command-center'] as WorkspacePattern[],
    defaultRecordTabs: qiyas_TABS,
    lifecycleDefinition: qiyas_LIFECYCLE,
    relatedObjectTypes: ['compliance', 'risk', 'governance', 'action', 'training', 'policy'],
    aiCapabilities: ['dynamic_questionnaire_generator', 'response_anomaly_detector', 'scoring_explainer', 'maturity_recommender', 'benchmark_analyzer'],
    filters: qiyas_FILTERS,
    tableViews: MODULE_TABLE_VIEWS['qiyas'] ?? [],
    emptyStatePreset: 'empty',
    tier: 'domain',
    automationLevel: 'semi',
    slaDefaultHours: 504,
    agents: [{ id: 'A04-qiy', name: 'Maturity Assessor', nameAr: 'مقيم النضج', icon: 'pi-chart-bar', color: 'fuchsia', domain: 'Maturity Intelligence', domainAr: 'ذكاء النضج', autonomyLevel: 'hybrid' }],
  },
};
