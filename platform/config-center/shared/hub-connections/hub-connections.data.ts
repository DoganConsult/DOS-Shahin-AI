// ============================================
// Hub Connections & Shared Flows — Single Source of Truth
// Derived from docs/AGRC-OS-HUB-ARCHITECTURE.md
// ============================================

export interface HubLink {
  key: string;
  labelEn: string;
  labelAr: string;
  route: string;
  icon: string;
  color: string;
}

export interface SharedFlow {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  color: string;
  /** Ordered list of hub keys forming the flow chain */
  chain: string[];
}

export interface HubMeta {
  key: string;
  labelEn: string;
  labelAr: string;
  route: string;
  icon: string;
  color: string;
  phaseEn: string;
  phaseAr: string;
  agentId: string;
  connectedHubs: string[];
  flows: string[];
}

// ── Hub Registry ──────────────────────────────────────────────────────────────

export const HUB_REGISTRY: Record<string, HubMeta> = {
  'workspace': {
    key: 'workspace', labelEn: 'Workspace Home', labelAr: 'الصفحة الرئيسية',
    route: '/workspace-home', icon: 'pi-th-large', color: '#0d9488',
    phaseEn: 'Plan', phaseAr: 'التخطيط', agentId: 'A04',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle', 'policy-lifecycle', 'risk-to-remediation'],
  },
  'risk': {
    key: 'risk', labelEn: 'Risk Hub', labelAr: 'مركز المخاطر',
    route: '/risk-hub', icon: 'pi-exclamation-triangle', color: '#b45309',
    phaseEn: 'Assess', phaseAr: 'التقييم', agentId: 'A07',
    connectedHubs: ['workspace', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['risk-to-remediation', 'incident-response', 'vendor-onboarding'],
  },
  'governance': {
    key: 'governance', labelEn: 'Governance Hub', labelAr: 'مركز الحوكمة',
    route: '/governance-hub', icon: 'pi-building', color: '#1d4ed8',
    phaseEn: 'Plan', phaseAr: 'التخطيط', agentId: 'A08',
    connectedHubs: ['risk', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['policy-lifecycle'],
  },
  'compliance': {
    key: 'compliance', labelEn: 'Compliance', labelAr: 'الامتثال',
    route: '/compliance', icon: 'pi-shield', color: '#0891b2',
    phaseEn: 'Implement', phaseAr: 'التنفيذ', agentId: 'A06',
    connectedHubs: ['risk', 'governance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle', 'policy-lifecycle', 'risk-to-remediation'],
  },
  'audit': {
    key: 'audit', labelEn: 'Audit Hub', labelAr: 'مركز التدقيق',
    route: '/audit-hub', icon: 'pi-verified', color: '#059669',
    phaseEn: 'Assure', phaseAr: 'التأكيد', agentId: 'A10',
    connectedHubs: ['risk', 'governance', 'compliance', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle'],
  },
  'evidence': {
    key: 'evidence', labelEn: 'Evidence Hub', labelAr: 'مركز الأدلة',
    route: '/evidence-hub', icon: 'pi-folder-open', color: '#15803d',
    phaseEn: 'Implement', phaseAr: 'التنفيذ', agentId: 'A05',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle', 'incident-response'],
  },
  'framework': {
    key: 'framework', labelEn: 'Framework Hub', labelAr: 'مركز الأطر',
    route: '/framework-hub', icon: 'pi-th-large', color: '#1d4ed8',
    phaseEn: 'Implement', phaseAr: 'التنفيذ', agentId: 'A03',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle', 'policy-lifecycle'],
  },
  'vendor': {
    key: 'vendor', labelEn: 'Vendor Hub', labelAr: 'مركز الموردين',
    route: '/vendor-hub', icon: 'pi-truck', color: '#7c3aed',
    phaseEn: 'Assess', phaseAr: 'التقييم', agentId: 'A09',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['vendor-onboarding'],
  },
  'workflow': {
    key: 'workflow', labelEn: 'Workflow Hub', labelAr: 'مركز سير العمل',
    route: '/workflow-hub', icon: 'pi-sitemap', color: '#0369a1',
    phaseEn: 'Improve', phaseAr: 'التحسين', agentId: 'A08',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['policy-lifecycle', 'incident-response', 'ai-assisted'],
  },
  'incident': {
    key: 'incident', labelEn: 'Incident Hub', labelAr: 'مركز الحوادث',
    route: '/incident-hub', icon: 'pi-bolt', color: 'var(--error)',
    phaseEn: 'Operate', phaseAr: 'التشغيل', agentId: 'A06',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['incident-response', 'risk-to-remediation'],
  },
  'privacy': {
    key: 'privacy', labelEn: 'Privacy Hub', labelAr: 'مركز الخصوصية',
    route: '/privacy-hub', icon: 'pi-eye-slash', color: '#9333ea',
    phaseEn: 'Operate', phaseAr: 'التشغيل', agentId: 'A08',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: [],
  },
  'intelligence': {
    key: 'intelligence', labelEn: 'Intelligence Hub', labelAr: 'مركز الاستخبارات',
    route: '/intelligence-hub', icon: 'pi-globe', color: '#0d9488',
    phaseEn: 'Assure', phaseAr: 'التأكيد', agentId: 'A03',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle'],
  },
  'operations': {
    key: 'operations', labelEn: 'Operations Hub', labelAr: 'مركز العمليات',
    route: '/operations-hub', icon: 'pi-calendar', color: '#0284c7',
    phaseEn: 'Operate', phaseAr: 'التشغيل', agentId: 'A08',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['risk-to-remediation', 'incident-response'],
  },
  'analytics': {
    key: 'analytics', labelEn: 'Analytics Hub', labelAr: 'مركز التحليلات',
    route: '/analytics-hub', icon: 'pi-chart-line', color: '#2563eb',
    phaseEn: 'Improve', phaseAr: 'التحسين', agentId: 'A10',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle'],
  },
  'reporting': {
    key: 'reporting', labelEn: 'Reports Hub', labelAr: 'مركز التقارير',
    route: '/reports-hub', icon: 'pi-file-pdf', color: '#0891b2',
    phaseEn: 'Improve', phaseAr: 'التحسين', agentId: 'A10',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle', 'incident-response'],
  },
  'connector': {
    key: 'connector', labelEn: 'Connector Hub', labelAr: 'مركز الاتصالات',
    route: '/connector-hub', icon: 'pi-link', color: '#7e22ce',
    phaseEn: 'Implement', phaseAr: 'التنفيذ', agentId: 'A01',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'team', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['assessment-cycle'],
  },
  'team': {
    key: 'team', labelEn: 'Team Hub', labelAr: 'مركز الفريق',
    route: '/team-hub', icon: 'pi-users', color: '#4f46e5',
    phaseEn: 'Account', phaseAr: 'الحسابات', agentId: 'A02',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'automation', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: [],
  },
  'automation': {
    key: 'automation', labelEn: 'Automation Hub', labelAr: 'مركز الأتمتة',
    route: '/automation-hub', icon: 'pi-play-circle', color: '#ea580c',
    phaseEn: 'Improve', phaseAr: 'التحسين', agentId: 'A06',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'ai-suite', 'advanced', 'admin', 'knowledge'],
    flows: ['ai-assisted'],
  },
  'ai-suite': {
    key: 'ai-suite', labelEn: 'AI Suite', labelAr: 'مجموعة الذكاء الاصطناعي',
    route: '/ai-suite', icon: 'pi-microchip-ai', color: '#7c3aed',
    phaseEn: 'Improve', phaseAr: 'التحسين', agentId: 'A04',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'advanced', 'admin', 'knowledge'],
    flows: ['ai-assisted'],
  },
  'advanced': {
    key: 'advanced', labelEn: 'Advanced Hub', labelAr: 'مركز متقدم',
    route: '/advanced-hub', icon: 'pi-objects-column', color: '#4338ca',
    phaseEn: 'Improve', phaseAr: 'التحسين', agentId: 'A07',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'admin', 'knowledge'],
    flows: [],
  },
  'admin': {
    key: 'admin', labelEn: 'Admin Hub', labelAr: 'مركز الإدارة',
    route: '/admin-hub', icon: 'pi-sliders-h', color: '#475569',
    phaseEn: 'Account', phaseAr: 'الحسابات', agentId: 'A02',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'knowledge'],
    flows: [],
  },
  'knowledge': {
    key: 'knowledge', labelEn: 'Knowledge Hub', labelAr: 'مركز المعرفة',
    route: '/knowledge-hub', icon: 'pi-book', color: '#15803d',
    phaseEn: 'Plan', phaseAr: 'التخطيط', agentId: 'A03',
    connectedHubs: ['risk', 'governance', 'compliance', 'audit', 'evidence', 'framework', 'vendor', 'workflow', 'incident', 'privacy', 'intelligence', 'operations', 'analytics', 'reporting', 'connector', 'team', 'automation', 'ai-suite', 'advanced', 'admin'],
    flows: [],
  },
};

// ── Shared Flows ──────────────────────────────────────────────────────────────

export const SHARED_FLOWS: SharedFlow[] = [
  {
    id: 'risk-to-remediation',
    nameEn: 'Risk to Remediation',
    nameAr: 'المخاطر إلى المعالجة',
    icon: 'pi-exclamation-triangle',
    color: '#ef4444',
    chain: ['risk', 'operations', 'incident', 'evidence', 'compliance'],
  },
  {
    id: 'policy-lifecycle',
    nameEn: 'Policy Lifecycle',
    nameAr: 'دورة حياة السياسة',
    icon: 'pi-file-edit',
    color: '#3b82f6',
    chain: ['governance', 'workflow', 'framework', 'compliance', 'evidence', 'audit'],
  },
  {
    id: 'assessment-cycle',
    nameEn: 'Assessment Cycle',
    nameAr: 'دورة التقييم',
    icon: 'pi-clipboard',
    color: '#0891b2',
    chain: ['intelligence', 'framework', 'compliance', 'evidence', 'connector', 'audit', 'reporting', 'analytics'],
  },
  {
    id: 'incident-response',
    nameEn: 'Incident Response',
    nameAr: 'الاستجابة للحوادث',
    icon: 'pi-bolt',
    color: 'var(--error)',
    chain: ['incident', 'operations', 'workflow', 'risk', 'evidence', 'reporting'],
  },
  {
    id: 'vendor-onboarding',
    nameEn: 'Vendor Onboarding',
    nameAr: 'تأهيل الموردين',
    icon: 'pi-truck',
    color: '#7c3aed',
    chain: ['vendor', 'risk', 'compliance', 'evidence', 'automation', 'operations'],
  },
  {
    id: 'ai-assisted',
    nameEn: 'AI-Assisted GRC',
    nameAr: 'GRC بمساعدة الذكاء الاصطناعي',
    icon: 'pi-microchip-ai',
    color: '#8b5cf6',
    chain: ['ai-suite', 'framework', 'compliance', 'risk', 'reporting', 'operations', 'automation'],
  },
];

// ── Helper Functions ──────────────────────────────────────────────────────────

export function getHubMeta(hubKey: string): HubMeta | undefined {
  return HUB_REGISTRY[hubKey];
}

export function getConnectedHubs(hubKey: string): HubLink[] {
  const hub = HUB_REGISTRY[hubKey];
  if (!hub) return [];
  return hub.connectedHubs
    .map(k => HUB_REGISTRY[k])
    .filter((h): h is HubMeta => !!h)
    .map(h => ({
      key: h.key,
      labelEn: h.labelEn,
      labelAr: h.labelAr,
      route: h.route,
      icon: h.icon,
      color: h.color,
    }));
}

export function getHubFlows(hubKey: string): SharedFlow[] {
  const hub = HUB_REGISTRY[hubKey];
  if (!hub) return [];
  return SHARED_FLOWS.filter(f => hub.flows.includes(f.id));
}

export function getFlowHubChain(flow: SharedFlow): HubLink[] {
  return flow.chain
    .map(k => HUB_REGISTRY[k])
    .filter((h): h is HubMeta => !!h)
    .map(h => ({
      key: h.key,
      labelEn: h.labelEn,
      labelAr: h.labelAr,
      route: h.route,
      icon: h.icon,
      color: h.color,
    }));
}
