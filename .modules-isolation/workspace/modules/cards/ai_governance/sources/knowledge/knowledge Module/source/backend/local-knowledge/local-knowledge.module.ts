import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { LOCAL_KNOWLEDGE_PERMISSIONS, LOCAL_KNOWLEDGE_ROLES, LOCAL_KNOWLEDGE_ACTIONS } from './security/local-knowledge.security';
import { LOCAL_KNOWLEDGE_APPROVAL_MATRIX } from './security/local-knowledge.approval-matrix';

export const LOCAL_KNOWLEDGE_MANIFEST: ModuleManifest = {
  code: 'local-knowledge',
  version: '1.0.0',
  aliases: [],
  nameEn: 'Local Knowledge Base',
  nameAr: 'قاعدة المعرفة المحلية',
  descriptionEn: 'Document ingestion, chunking, embedding, semantic search, and AI knowledge retrieval for tenant-scoped content.',
  descriptionAr: 'استيعاب المستندات والتقسيم والتضمين والبحث الدلالي واسترجاع المعرفة بالذكاء الاصطناعي.',
  tier: 'domain',
  category: 'advanced',
  routeBase: '/api/local-knowledge',
  eventNamespace: 'local_knowledge',
  tablePrefix: 'local_knowledge_',
  ownedTables: [
    'local_knowledge_documents', 'local_knowledge_chunks',
    'local_knowledge_embeddings', 'local_knowledge_sources',
    'local_knowledge_access_log',
  ],
  sharedTables: [],
  referencedTables: ['users', 'teams'],
  aggregateRoots: ['local_knowledge_documents'],
  publishedEvents: [
    'local_knowledge.document_ingested', 'local_knowledge.document_embedded',
    'local_knowledge.source_synced',
  ],
  consumedEvents: [],
  hardDeps: [],
  softDeps: ['ai'],
  navId: 'local-knowledge',
  navChildCount: 3,
  workflowTemplateCode: 'local_knowledge_document_review',
  workflowSlaHours: 168,
  automationLevel: 'full',
  agentBinding: 'A15',
  aiCapabilities: ['summarization', 'classification'],
  aiEnabled: true,
  featureFlags: ['local_knowledge.auto_embed', 'local_knowledge.semantic_search'],
  installable: true,
  provisioningOrder: 28,
  licensingTier: 'professional',
  visibility: 'internal',
  adminSurfaces: ['source-registry', 'ingestion-config'],

  securityPermissions: LOCAL_KNOWLEDGE_PERMISSIONS,
  securityRoles: LOCAL_KNOWLEDGE_ROLES,
  securityActions: LOCAL_KNOWLEDGE_ACTIONS,
  approvalRules: LOCAL_KNOWLEDGE_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'local_knowledge_documents', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'local-knowledge.module_lead', canDelegate: true, delegateRoles: ['local-knowledge.contributor',], canReassign: true, reassignRoles: ['local-knowledge.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'local_knowledge_sources', ownerField: 'created_by', reviewerField: 'reviewer_id', approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'local-knowledge.module_lead', canDelegate: true, delegateRoles: ['local-knowledge.contributor'], canReassign: true, reassignRoles: ['local-knowledge.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'local_knowledge.sod.uploader_approver', descriptionEn: 'Document uploader cannot approve their own document for production use', descriptionAr: 'لا يمكن لرافع المستند الموافقة على استخدامه في الإنتاج', conflictingRoles: [], conflictingActions: ['local_knowledge.document.upload', 'local_knowledge.document.approve'], conflictingTransitions: ['pending->embedded'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['local-knowledge.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'local_knowledge.sod.source_manager_embedder', descriptionEn: 'Source manager cannot trigger embedding of their own sources', descriptionAr: 'لا يمكن لمدير المصدر تشغيل تضمين مصادره', conflictingRoles: [], conflictingActions: ['local_knowledge.source.manage', 'local_knowledge.source.embed'], conflictingTransitions: ['synced->embedded'], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 30, compensatingControls: ['peer_review'], overrideAuthority: ['local-knowledge.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
};

registerModule(LOCAL_KNOWLEDGE_MANIFEST);
