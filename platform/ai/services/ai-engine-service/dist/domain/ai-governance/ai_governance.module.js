import { registerModule } from '@dos/module-sdk';
import { AI_GOVERNANCE_PERMISSIONS, AI_GOVERNANCE_ROLES, AI_GOVERNANCE_ACTIONS } from './security/ai-governance.security';
import { AI_GOVERNANCE_APPROVAL_MATRIX } from './security/ai-governance.approval-matrix';
import { AI_GOVERNANCE_OWNERSHIP_RULES } from './security/ai-governance.ownership';
import { AI_GOVERNANCE_SOD_RULES } from './security/ai-governance.sod';
export const AI_GOVERNANCE_MANIFEST = {
    code: 'ai-governance',
    version: '1.0.0',
    aliases: [],
    nameEn: 'AI Governance',
    nameAr: 'حوكمة الذكاء الاصطناعي',
    descriptionEn: 'AI model registry, bias monitoring, compliance tracking, privacy impact, and supply chain risk for AI systems.',
    descriptionAr: 'سجل نماذج الذكاء الاصطناعي ومراقبة التحيز وتتبع الامتثال وتقييم تأثير الخصوصية ومخاطر سلسلة التوريد.',
    tier: 'product',
    category: 'governance',
    routeBase: '/api/ai-governance',
    eventNamespace: 'ai-governance',
    tablePrefix: 'ai_gov_',
    ownedTables: [
        'ai_gov_model_registry', 'ai_gov_risk_assessments', 'ai_gov_bias_reports',
        'ai_gov_compliance_checks', 'ai_gov_privacy_impacts', 'ai_gov_supply_chain',
        'ai_gov_audit_log', 'ai_gov_monitoring_alerts',
    ],
    sharedTables: [],
    referencedTables: ['audit_trail', 'risks', 'policies'],
    aggregateRoots: ['ai_gov_model_registry'],
    publishedEvents: [
        'ai-governance.model.registered', 'ai-governance.model.updated',
        'ai-governance.risk.assessed', 'ai-governance.bias.detected',
        'ai-governance.compliance.checked', 'ai-governance.privacy.assessed',
        'ai-governance.supply_chain.evaluated',
    ],
    consumedEvents: [
        'ai.agent.completed', 'ai.agent.failed',
        'risk.record.created', 'compliance.gap.detected',
    ],
    hardDeps: [],
    softDeps: ['ai', 'risk', 'compliance'],
    installable: true,
    provisioningOrder: 8,
    licensingTier: 'enterprise',
    visibility: 'product',
    adminSurfaces: ['model-registry', 'bias-monitoring', 'ai-compliance'],
    securityPermissions: AI_GOVERNANCE_PERMISSIONS,
    securityRoles: AI_GOVERNANCE_ROLES,
    securityActions: AI_GOVERNANCE_ACTIONS,
    approvalRules: AI_GOVERNANCE_APPROVAL_MATRIX,
    ownershipRules: AI_GOVERNANCE_OWNERSHIP_RULES,
    sodRules: AI_GOVERNANCE_SOD_RULES,
};
registerModule(AI_GOVERNANCE_MANIFEST);
//# sourceMappingURL=ai_governance.module.js.map