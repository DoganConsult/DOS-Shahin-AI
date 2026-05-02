import type { ModuleManifest } from '@dos/types';
import { registerModule } from '@dos/module-sdk';
import { NOTIFICATION_PERMISSIONS, NOTIFICATION_ROLES, NOTIFICATION_ACTIONS } from './security/notification.security';
import { NOTIFICATION_APPROVAL_MATRIX } from './security/notification.approval-matrix';
import { NOTIFICATION_PUBLISHED_EVENTS, NOTIFICATION_CONSUMED_EVENTS } from './events/notification.events';

export const NOTIFICATION_MANIFEST: ModuleManifest = {
  code: 'notification',
  version: '2.0.0',
  aliases: [],
  nameEn: 'Notifications',
  nameAr: 'الإشعارات',
  descriptionEn: 'Notification channels, delivery management, and subscription preferences.',
  descriptionAr: 'قنوات الإشعارات وإدارة التوصيل وتفضيلات الاشتراك.',
  tier: 'platform',
  category: 'platform',
  routeBase: '/api/notification',
  eventNamespace: 'notification',
  tablePrefix: 'notification_',
  ownedTables: [
    'notification_channels', 'notification_preferences', 'notification_queue',
    'notification_templates', 'notification_delivery_log', 'notification_subscriptions',
    'notification_digests',
  ],
  sharedTables: [],
  referencedTables: ['audit_trail', 'teams', 'users'],
  aggregateRoots: ['notification_channels', 'notification_queue', 'notification_templates'],
  publishedEvents: NOTIFICATION_PUBLISHED_EVENTS,
  consumedEvents: NOTIFICATION_CONSUMED_EVENTS,
  hardDeps: [],
  softDeps: ['foundation'],
  navId: 'notification',
  navChildCount: 4,
  workflowTemplateCode: 'notification_template_activation',
  workflowSlaHours: 24,
  automationLevel: 'full',
  agentBinding: null,
  aiCapabilities: ['recommendations', 'summarization'],
  aiEnabled: true,
  featureFlags: ['notification.email', 'notification.sms', 'notification.push'],
  installable: true,
  provisioningOrder: 4,
  licensingTier: 'starter',
  visibility: 'internal',
  adminSurfaces: ['notification-channels', 'notification-templates', 'delivery-settings'],

  securityPermissions: NOTIFICATION_PERMISSIONS,
  securityRoles: NOTIFICATION_ROLES,
  securityActions: NOTIFICATION_ACTIONS,
  approvalRules: NOTIFICATION_APPROVAL_MATRIX,
  ownershipRules: [
    { entityType: 'notification_template', ownerField: 'created_by', reviewerField: null, approverField: null, assigneeField: null, orgScopeField: null, defaultOwnerRole: 'notification.operator', canDelegate: false, delegateRoles: [], canReassign: true, reassignRoles: ['notification.module_lead'], requiresApproval: false, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'global' },
    { entityType: 'notification_channels', ownerField: 'created_by', reviewerField: null, approverField: 'approver_id', assigneeField: null, orgScopeField: null, defaultOwnerRole: 'notification.module_lead', canDelegate: true, delegateRoles: ['notification.operator'], canReassign: true, reassignRoles: ['notification.module_lead'], requiresApproval: true, creatorRights: 'full', externalVisible: false, rowLevelAccess: 'global' },
  ],
  sodRules: [
    { ruleCode: 'notification.sod.template_activator', descriptionEn: 'Template creator cannot activate their own critical notification template', descriptionAr: 'لا يمكن لمنشئ القالب تفعيل قالب الإشعارات الحساس الخاص به', conflictingRoles: [], conflictingActions: ['notification.template.create', 'notification.template.activate_critical'], conflictingTransitions: [], severity: 'medium', enforcement: 'warn', temporaryWaiverAllowed: true, waiverMaxDays: 90, compensatingControls: ['admin_review'], overrideAuthority: ['notification.module_lead'], auditObligations: ['log_sod_violation'] },
    { ruleCode: 'notification.sod.channel_config_activator', descriptionEn: 'Channel configurator cannot activate their own channel in production', descriptionAr: 'لا يمكن لمكوّن القناة تفعيل قناته في الإنتاج', conflictingRoles: [], conflictingActions: ['notification.channel.configure', 'notification.channel.activate'], conflictingTransitions: ['draft->active'], severity: 'high', enforcement: 'block', temporaryWaiverAllowed: true, waiverMaxDays: 14, compensatingControls: ['security_review'], overrideAuthority: ['notification.module_lead'], auditObligations: ['log_sod_violation'] },
  ],
    mcpServiceEntrypoint: 'modules/notification/services/notification.service'
};

registerModule(NOTIFICATION_MANIFEST);
