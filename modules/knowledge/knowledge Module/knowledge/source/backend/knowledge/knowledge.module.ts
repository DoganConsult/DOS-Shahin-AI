import type { ModuleManifest, ModulePermission, ModuleRole, ModuleAction } from '@dos/types';
import { registerModule } from '@dos/module-sdk';

export const KNOWLEDGE_MANIFEST: ModuleManifest = {
  code: 'knowledge',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Knowledge Management',
  nameAr: 'إدارة المعرفة',
  descriptionEn: 'Knowledge article registry, categorization, search indexing, and cross-module knowledge linking.',
  descriptionAr: 'سجل مقالات المعرفة، التصنيف، فهرسة البحث، وربط المعرفة عبر الوحدات.',
  tier: 'cross-module',
  category: 'product',
  routeBase: '/api/knowledge',
  eventNamespace: 'knowledge',
  tablePrefix: 'knowledge_',
  ownedTables: [
    'knowledge_articles', 'knowledge_categories', 'knowledge_tags', 
    'knowledge_article_tags', 'knowledge_links'
  ],
  sharedTables: [],
  referencedTables: ['users', 'departments'],
  aggregateRoots: ['knowledge_articles'],
  publishedEvents: [
    'knowledge.article_created', 'knowledge.article_published', 'knowledge.article_archived'
  ],
  consumedEvents: [],
  hardDeps: ['foundation'],
  softDeps: ['workflow', 'local-knowledge', 'ai'],
  navId: 'knowledge',
  navChildCount: 3,
  workflowTemplateCode: 'knowledge_article_approval',
  workflowSlaHours: 72,
  automationLevel: 'semi',
  agentBinding: 'A-KNW',
  aiCapabilities: ['summarization', 'recommendations'],
  aiEnabled: true,
  featureFlags: ['knowledge.semantic_search'],
  installable: true,
  provisioningOrder: 15,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['knowledge-config'],

  securityPermissions: [
    { permissionCode: 'knowledge.article.read', resourceType: 'article', actionType: 'read', descriptionEn: 'Read Articles', descriptionAr: 'قراءة المقالات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'knowledge.article.write', resourceType: 'article', actionType: 'write', descriptionEn: 'Write Articles', descriptionAr: 'كتابة المقالات', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'knowledge.article.publish', resourceType: 'article', actionType: 'publish', descriptionEn: 'Publish Articles', descriptionAr: 'نشر المقالات', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'knowledge.article.archive', resourceType: 'article', actionType: 'archive', descriptionEn: 'Archive Articles', descriptionAr: 'أرشفة المقالات', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'knowledge.category.manage', resourceType: 'category', actionType: 'manage', descriptionEn: 'Manage Categories', descriptionAr: 'إدارة الفئات', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] }
  ] as ModulePermission[],
  securityRoles: [
    { roleCode: 'knowledge.reader', archetype: 'viewer', nameEn: 'Knowledge Reader', nameAr: 'قارئ المعرفة', descriptionEn: 'Knowledge Reader', descriptionAr: 'قارئ المعرفة', isDefault: true, isSystem: true, isGlobal: false, permissions: ['knowledge.article.read'], authorityLevel: 'optional', defaultScope: 'org' },
    { roleCode: 'knowledge.author', archetype: 'contributor', nameEn: 'Knowledge Author', nameAr: 'مؤلف المعرفة', descriptionEn: 'Knowledge Author', descriptionAr: 'مؤلف المعرفة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['knowledge.article.read', 'knowledge.article.write'], authorityLevel: 'optional', defaultScope: 'department' },
    { roleCode: 'knowledge.editor', archetype: 'approver', nameEn: 'Knowledge Editor', nameAr: 'محرر المعرفة', descriptionEn: 'Knowledge Editor', descriptionAr: 'محرر المعرفة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['knowledge.article.read', 'knowledge.article.write', 'knowledge.article.publish', 'knowledge.article.archive'], authorityLevel: 'required', defaultScope: 'department' },
    { roleCode: 'knowledge.admin', archetype: 'module_lead', nameEn: 'Knowledge Administrator', nameAr: 'مسؤول المعرفة', descriptionEn: 'Knowledge Admin', descriptionAr: 'مسؤول المعرفة', isDefault: false, isSystem: true, isGlobal: false, permissions: ['knowledge.article.read', 'knowledge.article.write', 'knowledge.article.publish', 'knowledge.article.archive', 'knowledge.category.manage'], authorityLevel: 'required', defaultScope: 'org' }
  ] as ModuleRole[],
  securityActions: [
    { actionCode: 'knowledge.article.read', labelEn: 'Read Article', labelAr: 'قراءة المقال', requiredPermissions: ['knowledge.article.read'], requiredAuthorityLevel: 'optional', sodSensitive: false, aiEnabled: true, aiBlocked: false, dangerLevel: 'safe', requiresWorkflow: false, requiresApproval: false, auditable: false, reversible: true, bulkSafe: true, externalExposure: false },
    { actionCode: 'knowledge.article.write', labelEn: 'Write Article', labelAr: 'كتابة المقال', requiredPermissions: ['knowledge.article.write'], requiredAuthorityLevel: 'optional', sodSensitive: false, aiEnabled: true, aiBlocked: false, dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, auditable: true, reversible: true, bulkSafe: false, externalExposure: false },
    { actionCode: 'knowledge.article.publish', labelEn: 'Publish Article', labelAr: 'نشر المقال', requiredPermissions: ['knowledge.article.publish'], requiredAuthorityLevel: 'required', sodSensitive: true, aiEnabled: false, aiBlocked: true, dangerLevel: 'moderate', requiresWorkflow: true, requiresApproval: true, auditable: true, reversible: true, bulkSafe: false, externalExposure: false },
    { actionCode: 'knowledge.article.archive', labelEn: 'Archive Article', labelAr: 'أرشفة المقال', requiredPermissions: ['knowledge.article.archive'], requiredAuthorityLevel: 'required', sodSensitive: true, aiEnabled: false, aiBlocked: true, dangerLevel: 'moderate', requiresWorkflow: false, requiresApproval: false, auditable: true, reversible: true, bulkSafe: false, externalExposure: false }
  ] as ModuleAction[],
  approvalRules: [],
  ownershipRules: [],
  sodRules: [
    { ruleCode: 'knowledge.sod.author_publisher', descriptionEn: 'Author cannot publish their own article', descriptionAr: 'لا يمكن للمؤلف نشر مقالته الخاصة', conflictingRoles: [], conflictingActions: ['knowledge.article.write', 'knowledge.article.publish'], conflictingTransitions: ['in_review->published'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: [], overrideAuthority: ['knowledge.admin'], auditObligations: ['log_sod_violation'] }
  ]
};

registerModule(KNOWLEDGE_MANIFEST);
