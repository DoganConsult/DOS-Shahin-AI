import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { INTEGRATIONS_PERMISSIONS, INTEGRATIONS_ROLES, INTEGRATIONS_ACTIONS } from './security/integrations.security';
import { INTEGRATIONS_APPROVAL_MATRIX } from './security/integrations.approval-matrix';

export const INTEGRATIONS_MANIFEST: ModuleManifest = {
  code: 'integrations',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Integrations',
  nameAr: 'التكاملات',
  descriptionEn: 'Third-party connectors, webhooks, API keys, and OAuth token management.',
  descriptionAr: 'موصلات الطرف الثالث وخطافات الويب ومفاتيح API وإدارة رموز OAuth.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/integrations',
  eventNamespace: 'integrations',
  tablePrefix: 'integration_',
  ownedTables: [
    'integration_connectors', 'integration_configs', 'integration_sync_log',
    'integration_mappings', 'integration_webhooks', 'integration_api_keys',
    'integration_oauth_tokens', 'integration_schedules',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams'],
  aggregateRoots: ['integration_connectors', 'integration_configs', 'integration_webhooks'],
  publishedEvents: ['integrations.connector_activated', 'integrations.connector_deactivated', 'integrations.sync_completed', 'integrations.sync_failed'],
  consumedEvents: [],
  hardDeps: [],
  softDeps: ['foundation'],
  navId: 'integrations',
  navChildCount: 5,
  workflowTemplateCode: 'integration_connector_activation',
  workflowSlaHours: 72,
  automationLevel: 'semi',
  agentBinding: null,
  aiCapabilities: ['recommendations', 'anomaly_detection'],
  aiEnabled: true,
  featureFlags: ['integrations.webhooks', 'integrations.api_marketplace'],
  installable: true,
  provisioningOrder: 8,
  licensingTier: 'professional',
  visibility: 'internal',
  adminSurfaces: ['connector-registry', 'webhook-management', 'api-key-management', 'sync-schedules'],

  securityPermissions: INTEGRATIONS_PERMISSIONS,
  securityRoles: INTEGRATIONS_ROLES,
  securityActions: INTEGRATIONS_ACTIONS,
  approvalRules: INTEGRATIONS_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'integration_connectors', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'integrations.module_lead', canDelegate: true, delegateRoles: ['integrations.operator',], canReassign: true, reassignRoles: ['integrations.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
    { entityType: 'integration_webhooks', ownerField: 'created_by', reviewerField: null, approverField: 'approver_id', assigneeField: null, orgScopeField: 'org_id', defaultOwnerRole: 'integrations.module_lead', canDelegate: true, delegateRoles: ['integrations.operator'], canReassign: true, reassignRoles: ['integrations.module_lead', 'integrations.executive_owner'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'org' },
  ],
  sodRules: [
    { ruleCode: 'integrations.sod.connector_activator', descriptionEn: 'Connector creator cannot activate their own connector in production', descriptionAr: 'لا يمكن لمنشئ الموصل تفعيله في الإنتاج', conflictingRoles: [], conflictingActions: ['integrations.connector.create', 'integrations.connector.activate'], conflictingTransitions: ['draft->active'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 14, compensatingControls: ['security_review'], overrideAuthority: ['integrations.executive_owner'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'integrations.sod.key_creator_rotator', descriptionEn: 'API key creator cannot rotate their own keys without review', descriptionAr: 'لا يمكن لمنشئ مفتاح API تدوير مفاتيحه بدون مراجعة', conflictingRoles: [], conflictingActions: ['integrations.api_key.create', 'integrations.api_key.rotate'], conflictingTransitions: [], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: false, waiverMaxDays: null, compensatingControls: ['security_review'], overrideAuthority: ['integrations.executive_owner'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/integrations/services/connector.service'
};

registerModule(INTEGRATIONS_MANIFEST);
