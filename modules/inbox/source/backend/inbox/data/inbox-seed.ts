import { INBOX_SLA_DEFAULTS } from './inbox-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface InboxSeedTemplate {
  code: string;
  nameEn: string;
  nameAr: string;
  data: Record<string, unknown>;
}

export interface InboxSeedSlaPolicies {
  messageType: string;
  priorityLevel: string;
  responseTargetHours: number;
  escalationHours: number;
}

export interface InboxSeedRoutingRule {
  name: string;
  messageType: string;
  priority: string;
  strategy: string;
  targetRole?: string;
}

export interface InboxSeedData {
  defaultConfigs: Record<string, unknown>;
  defaultTemplates: InboxSeedTemplate[];
  slaPolicies: InboxSeedSlaPolicies[];
  defaultRoutingRules: InboxSeedRoutingRule[];
  defaultDigestConfig: Record<string, unknown>;
  channels: Array<{ code: string; labelEn: string; labelAr: string; enabled: boolean }>;
  messageTypes: Array<{ code: string; labelEn: string; labelAr: string; icon: string }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getInboxSeedData(): InboxSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'inbox',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: 90,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: true,
      workflowEnabled: true,
      maxItemsPerPage: 50,
      digestEnabled: true,
      broadcastEnabled: true,
      routingEnabled: true,
      threadingEnabled: true,
      starringEnabled: true,
      priorityScoringEnabled: true,
      slaTrackingEnabled: true,
    },
    defaultTemplates: [
      { code: 'inbox_task_assignment', nameEn: 'Task Assignment', nameAr: 'تكليف مهمة', data: { version: 1, fields: ['assignee', 'due_date', 'priority'], layout: 'action_required' } },
      { code: 'inbox_approval_request', nameEn: 'Approval Request', nameAr: 'طلب اعتماد', data: { version: 1, fields: ['entity_type', 'entity_id', 'action_url'], layout: 'approval' } },
      { code: 'inbox_alert', nameEn: 'Alert Notification', nameAr: 'إشعار تنبيه', data: { version: 1, fields: ['severity', 'source_module', 'description'], layout: 'alert' } },
      { code: 'inbox_system_notice', nameEn: 'System Notice', nameAr: 'إشعار النظام', data: { version: 1, fields: ['notice_type', 'effective_date'], layout: 'info' } },
      { code: 'inbox_digest', nameEn: 'Digest Summary', nameAr: 'ملخص يومي', data: { version: 1, fields: ['period', 'summary_groups'], layout: 'digest' } },
      { code: 'inbox_broadcast', nameEn: 'Broadcast Message', nameAr: 'رسالة بث عام', data: { version: 1, fields: ['scope', 'expires_at'], layout: 'broadcast' } },
      { code: 'inbox_escalation', nameEn: 'Escalation Notice', nameAr: 'إشعار تصعيد', data: { version: 1, fields: ['original_assignee', 'escalation_reason', 'sla_breach_hours'], layout: 'escalation' } },
      { code: 'inbox_workflow_step', nameEn: 'Workflow Step', nameAr: 'خطوة سير عمل', data: { version: 1, fields: ['workflow_id', 'step_name', 'action_options'], layout: 'workflow' } },
    ],
    slaPolicies: [
      { messageType: 'approval', priorityLevel: 'critical', responseTargetHours: INBOX_SLA_DEFAULTS.critical, escalationHours: 0.5 },
      { messageType: 'approval', priorityLevel: 'high', responseTargetHours: INBOX_SLA_DEFAULTS.high, escalationHours: 2 },
      { messageType: 'approval', priorityLevel: 'medium', responseTargetHours: INBOX_SLA_DEFAULTS.medium, escalationHours: 12 },
      { messageType: 'approval', priorityLevel: 'low', responseTargetHours: INBOX_SLA_DEFAULTS.low, escalationHours: 48 },
      { messageType: 'task', priorityLevel: 'critical', responseTargetHours: 2, escalationHours: 1 },
      { messageType: 'task', priorityLevel: 'high', responseTargetHours: 8, escalationHours: 4 },
      { messageType: 'task', priorityLevel: 'medium', responseTargetHours: 48, escalationHours: 24 },
      { messageType: 'alert', priorityLevel: 'critical', responseTargetHours: 0.5, escalationHours: 0.25 },
      { messageType: 'alert', priorityLevel: 'high', responseTargetHours: 2, escalationHours: 1 },
      { messageType: 'notification', priorityLevel: 'medium', responseTargetHours: 72, escalationHours: 48 },
    ],
    defaultRoutingRules: [
      { name: 'Approval Direct', messageType: 'approval', priority: 'all', strategy: 'direct' },
      { name: 'Alert to Risk Owners', messageType: 'alert', priority: 'critical', strategy: 'role_based', targetRole: 'risk_owner' },
      { name: 'System Broadcasts', messageType: 'announcement', priority: 'all', strategy: 'role_based', targetRole: 'all' },
      { name: 'Task Load Balance', messageType: 'task', priority: 'medium', strategy: 'load_balanced' },
    ],
    defaultDigestConfig: {
      defaultFrequency: 'daily',
      defaultSendAt: '08:00',
      includeReadByDefault: false,
      groupByModuleByDefault: true,
      maxItemsPerDigest: 50,
      digestSubjectTemplate: 'Your {{period}} GRC inbox digest — {{unreadCount}} unread',
    },
    channels: [
      { code: 'in_app', labelEn: 'In-App', labelAr: 'داخل التطبيق', enabled: true },
      { code: 'email', labelEn: 'Email', labelAr: 'بريد إلكتروني', enabled: true },
      { code: 'sms', labelEn: 'SMS', labelAr: 'رسالة نصية', enabled: false },
      { code: 'push', labelEn: 'Push Notification', labelAr: 'إشعار فوري', enabled: false },
      { code: 'broadcast', labelEn: 'Broadcast', labelAr: 'بث عام', enabled: true },
    ],
    messageTypes: [
      { code: 'task', labelEn: 'Task', labelAr: 'مهمة', icon: 'pi-check-square' },
      { code: 'approval', labelEn: 'Approval', labelAr: 'اعتماد', icon: 'pi-verified' },
      { code: 'alert', labelEn: 'Alert', labelAr: 'تنبيه', icon: 'pi-exclamation-triangle' },
      { code: 'notification', labelEn: 'Notification', labelAr: 'إشعار', icon: 'pi-bell' },
      { code: 'announcement', labelEn: 'Announcement', labelAr: 'إعلان', icon: 'pi-megaphone' },
      { code: 'system', labelEn: 'System', labelAr: 'نظام', icon: 'pi-cog' },
      { code: 'escalation', labelEn: 'Escalation', labelAr: 'تصعيد', icon: 'pi-arrow-up' },
      { code: 'workflow', labelEn: 'Workflow Step', labelAr: 'خطوة سير عمل', icon: 'pi-sitemap' },
    ],
  };
}

export async function seedInboxModule(tenantId: string, schema: string): Promise<void> {
  const data = getInboxSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['inbox', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const sla of data.slaPolicies) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_sla_policies (message_type, priority_level, response_target_hours, escalation_hours)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (message_type, priority_level) DO NOTHING`,
      [sla.messageType, sla.priorityLevel, sla.responseTargetHours, sla.escalationHours],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  for (const tmpl of data.defaultTemplates) {
    await safeQuery(
      `INSERT INTO "${schema}".inbox_templates (code, name_en, name_ar, template_data, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code, tenant_id) DO NOTHING`,
      [tmpl.code, tmpl.nameEn, tmpl.nameAr, JSON.stringify(tmpl.data), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}
