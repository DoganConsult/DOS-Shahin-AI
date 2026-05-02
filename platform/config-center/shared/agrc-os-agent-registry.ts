/**
 * AGRC-OS Agent Registry
 * Single source of truth mapping A01–A12 agents to their metadata,
 * route ownership, delegation scopes, module binding, and contextual quick prompts.
 */

export interface AgrcAgentMeta {
  id: string;
  name: string;
  nameAr: string;
  domain: string;
  domainAr: string;
  icon: string;       // PrimeIcons class (pi-*)
  color: string;      // hex accent colour matching agents/AXX.json
  moduleCode: string; // canonical module code binding
  routePatterns: string[];
  delegationScope: string;
  quickPrompts: { en: string; ar: string }[];
}

export const AGRC_AGENT_REGISTRY: Record<string, AgrcAgentMeta> = {
  A01: {
    id: 'A01', name: 'Onboarding Agent', nameAr: 'وكيل الإعداد',
    domain: 'Onboarding', domainAr: 'الإعداد',
    icon: 'pi-home', color: '#6366f1',
    moduleCode: 'foundation',
    routePatterns: ['/integrations/overview', '/onboarding', '/welcome', '/bootstrap', '/connector-hub'],
    delegationScope: 'onboarding',
    quickPrompts: [
      { en: 'Check workspace health', ar: 'فحص صحة مساحة العمل' },
      { en: 'What frameworks should we adopt?', ar: 'ما الأطر التي يجب اعتمادها؟' },
      { en: 'Show onboarding progress', ar: 'عرض تقدم الإعداد' },
    ],
  },
  A02: {
    id: 'A02', name: 'Identity Provisioning Agent', nameAr: 'وكيل توفير الهويات',
    domain: 'Identity & RBAC', domainAr: 'الهوية والصلاحيات',
    icon: 'pi-id-card', color: '#8b5cf6',
    moduleCode: 'admin',
    routePatterns: ['/admin/users', '/admin/roles', '/admin/teams', '/admin/overview'],
    delegationScope: 'full_platform',
    quickPrompts: [
      { en: 'Show users without MFA', ar: 'عرض المستخدمين بدون مصادقة ثنائية' },
      { en: 'Check role distribution', ar: 'فحص توزيع الأدوار' },
      { en: 'Flag over-privileged accounts', ar: 'تحديد الحسابات ذات الصلاحيات المفرطة' },
    ],
  },
  A03: {
    id: 'A03', name: 'Framework Mapping Agent', nameAr: 'وكيل رسم الأطر',
    domain: 'Frameworks', domainAr: 'الأطر',
    icon: 'pi-th-large', color: '#3b82f6',
    moduleCode: 'compliance',
    routePatterns: ['/compliance/frameworks', '/compliance/controls', '/ai-governance/overview', '/knowledge/overview'],
    delegationScope: 'control_mapping',
    quickPrompts: [
      { en: 'Show framework coverage gaps', ar: 'عرض فجوات تغطية الأطر' },
      { en: 'Compare NCA-ECC vs SAMA-CSF', ar: 'مقارنة NCA-ECC مع SAMA-CSF' },
      { en: 'List unmapped controls', ar: 'عرض الضوابط غير المربوطة' },
    ],
  },
  A04: {
    id: 'A04', name: 'Control Authoring Agent', nameAr: 'وكيل تأليف الضوابط',
    domain: 'Controls', domainAr: 'الضوابط',
    icon: 'pi-check-circle', color: '#10b981',
    moduleCode: 'compliance',
    routePatterns: ['/ai/overview', '/ai-hub', '/compliance/controls'],
    delegationScope: 'control_mapping',
    quickPrompts: [
      { en: 'Draft missing control documentation', ar: 'صياغة توثيق الضوابط المفقودة' },
      { en: 'Show controls needing test procedures', ar: 'عرض الضوابط التي تحتاج إجراءات اختبار' },
      { en: 'Generate implementation guidance', ar: 'إنشاء دليل التنفيذ' },
    ],
  },
  A05: {
    id: 'A05', name: 'Evidence Collection Agent', nameAr: 'وكيل جمع الأدلة',
    domain: 'Evidence', domainAr: 'الأدلة',
    icon: 'pi-folder-open', color: '#14b8a6',
    moduleCode: 'evidence',
    routePatterns: ['/evidence/overview', '/evidence'],
    delegationScope: 'evidence_upload',
    quickPrompts: [
      { en: 'Show expired evidence items', ar: 'عرض الأدلة المنتهية' },
      { en: 'Which controls lack evidence?', ar: 'ما الضوابط التي تفتقر إلى أدلة؟' },
      { en: 'Check evidence freshness', ar: 'فحص حداثة الأدلة' },
    ],
  },
  A06: {
    id: 'A06', name: 'Gap Remediation Agent', nameAr: 'وكيل معالجة الثغرات',
    domain: 'Roadmaps', domainAr: 'خرائط الطريق',
    icon: 'pi-map', color: '#ef4444',
    moduleCode: 'remediation',
    routePatterns: ['/compliance/overview', '/incidents/overview', '/workflow/overview', '/compliance', '/incidents'],
    delegationScope: 'assessment',
    quickPrompts: [
      { en: 'Show overdue remediations', ar: 'عرض المعالجات المتأخرة' },
      { en: 'Analyze open compliance gaps', ar: 'تحليل ثغرات الامتثال المفتوحة' },
      { en: 'Generate remediation roadmap', ar: 'إنشاء خريطة طريق المعالجة' },
    ],
  },
  A07: {
    id: 'A07', name: 'Risk Register Agent', nameAr: 'وكيل سجل المخاطر',
    domain: 'Risk Scoring', domainAr: 'تقييم المخاطر',
    icon: 'pi-exclamation-triangle', color: '#06b6d4',
    moduleCode: 'risk',
    routePatterns: ['/risk', '/risk/home', '/risk/register', '/risk/heatmap', '/risk/treatment', '/risk/indicators', '/risk/acceptance', '/risk/appetite', '/risk/scoring', '/risk/metrics', '/risk/assessments'],
    delegationScope: 'risk_seeding',
    quickPrompts: [
      { en: 'Show top risks by score', ar: 'عرض أعلى المخاطر حسب الدرجة' },
      { en: 'Score unscored risks', ar: 'تقييم المخاطر غير المسجلة' },
      { en: 'Check risk appetite breaches', ar: 'فحص تجاوزات شهية المخاطر' },
      { en: 'Generate risk heatmap', ar: 'إنشاء خريطة حرارية للمخاطر' },
    ],
  },
  A08: {
    id: 'A08', name: 'Policy Lifecycle Agent', nameAr: 'وكيل دورة حياة السياسات',
    domain: 'Governance', domainAr: 'الحوكمة',
    icon: 'pi-book', color: '#f97316',
    moduleCode: 'governance',
    routePatterns: ['/governance/overview', '/governance/policies', '/governance/committees', '/governance/charters', '/governance/delegations', '/workflow/overview'],
    delegationScope: 'policy_drafting',
    quickPrompts: [
      { en: 'Show policies overdue for review', ar: 'عرض السياسات المتأخرة للمراجعة' },
      { en: 'List pending policy approvals', ar: 'عرض الموافقات المعلقة' },
      { en: 'Check policy expiry dates', ar: 'فحص تواريخ انتهاء السياسات' },
    ],
  },
  A09: {
    id: 'A09', name: 'Third-Party Risk Agent', nameAr: 'وكيل مخاطر الأطراف الثالثة',
    domain: 'Third-Party', domainAr: 'الأطراف الثالثة',
    icon: 'pi-truck', color: '#a855f7',
    moduleCode: 'vendor',
    routePatterns: ['/vendor-hub', '/vendor-risk/home', '/vendor-risk/vendors', '/vendor-risk/assessments', '/vendor-risk/contracts'],
    delegationScope: 'assessment',
    quickPrompts: [
      { en: 'Show high-risk vendors', ar: 'عرض الموردين عاليي الخطورة' },
      { en: 'Vendors due for assessment', ar: 'الموردين المستحقين للتقييم' },
      { en: 'Check vendor SLA compliance', ar: 'فحص امتثال الموردين لاتفاقيات الخدمة' },
    ],
  },
  A10: {
    id: 'A10', name: 'Audit Reporting Agent', nameAr: 'وكيل التقارير التدقيقية',
    domain: 'Audit Reports', domainAr: 'تقارير التدقيق',
    icon: 'pi-file-pdf', color: '#64748b',
    moduleCode: 'audit',
    routePatterns: ['/audit/overview', '/audit/findings', '/audit/engagements', '/reports/overview', '/analytics/overview'],
    delegationScope: 'assessment',
    quickPrompts: [
      { en: 'Show open audit findings', ar: 'عرض نتائج التدقيق المفتوحة' },
      { en: 'Check audit readiness score', ar: 'فحص درجة جاهزية التدقيق' },
      { en: 'Generate compliance summary', ar: 'إنشاء ملخص الامتثال' },
    ],
  },
  A11: {
    id: 'A11', name: 'BCP Continuity Agent', nameAr: 'وكيل استمرارية الأعمال',
    domain: 'Business Continuity', domainAr: 'استمرارية الأعمال',
    icon: 'pi-shield', color: '#059669',
    moduleCode: 'bcp',
    routePatterns: ['/bcp', '/bcp/overview', '/bcp/plans', '/bcp/bia', '/bcp/exercises', '/bcp/crisis-comm', '/bcp/recovery', '/bcp/activation', '/bcp/dependencies', '/bcp/maturity'],
    delegationScope: 'assessment',
    quickPrompts: [
      { en: 'Show BCP readiness score', ar: 'عرض درجة جاهزية استمرارية الأعمال' },
      { en: 'Check overdue exercises', ar: 'فحص التمارين المتأخرة' },
      { en: 'Detect single points of failure', ar: 'كشف نقاط الفشل الأحادية' },
      { en: 'Show RTO/RPO drift', ar: 'عرض انحراف RTO/RPO' },
    ],
  },
  A12: {
    id: 'A12', name: 'Security Awareness & Training Agent', nameAr: 'وكيل التوعية والتدريب الأمني',
    domain: 'Training & Awareness', domainAr: 'التدريب والتوعية',
    icon: 'pi-graduation-cap', color: '#d946ef',
    routePatterns: ['/training-awareness', '/training-awareness/programs', '/training-awareness/campaigns', '/training-awareness/completion', '/training-awareness/gaps'],
    moduleCode: 'training_awareness', delegationScope: 'assessment',
    quickPrompts: [
      { en: 'Show overdue training assignments', ar: 'عرض تعيينات التدريب المتأخرة' },
      { en: 'Check training completion rate', ar: 'فحص معدل إتمام التدريب' },
      { en: 'Identify training gaps', ar: 'تحديد فجوات التدريب' },
      { en: 'Recommend training programs', ar: 'اقتراح برامج تدريبية' },
    ],
  },
};

/** Returns agent metadata or undefined if agentId is any. */
export function getAgent(agentId: string | undefined): AgrcAgentMeta | undefined {
  if (!agentId) return undefined;
  return AGRC_AGENT_REGISTRY[agentId];
}

/** Resolve the responsible agent for a given route URL. */
export function resolveAgentFromRoute(url: string): AgrcAgentMeta | undefined {
  const path = url.split('?')[0].split('#')[0];
  for (const agent of Object.values(AGRC_AGENT_REGISTRY)) {
    if (agent.routePatterns.some(p => path === p || path.startsWith(p + '/'))) {
      return agent;
    }
  }
  // Fallback: try matching first two segments (e.g. /risk/anything)
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 1) {
    const prefix = '/' + segments[0];
    for (const agent of Object.values(AGRC_AGENT_REGISTRY)) {
      if (agent.routePatterns.some(p => p.startsWith(prefix))) {
        return agent;
      }
    }
  }
  return undefined;
}
