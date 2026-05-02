import { z } from 'zod';
const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);
export const NotificationCreateSchema = z.object({
    recipient_user_id: z.string().min(1).max(64),
    category: z.string().min(1).max(60),
    severity: z.enum(['info', 'success', 'warning', 'error', 'critical']).optional(),
    title_key: z.string().max(150).nullable().optional(),
    body_key: z.string().max(200).nullable().optional(),
    payload: z.record(z.unknown()).optional(),
    link_url: z.string().nullable().optional(),
    source_event_id: z.string().max(120).nullable().optional(),
    expires_at: z.string().datetime().nullable().optional(),
});
export const NotificationPreferenceSchema = z.object({
    channel: z.enum(['in_app', 'email', 'sms', 'push', 'webhook']),
    category: z.string().min(1).max(60),
    enabled: z.boolean().optional(),
    digest_window: z.enum(['instant', 'hourly', 'daily', 'weekly']).optional(),
});
export const InboxViewSchema = z.object({
    view_key: z.string().min(1).max(150),
    name_key: z.string().max(150).nullable().optional(),
    filters: z.record(z.unknown()).optional(),
    is_default: z.boolean().optional(),
    is_active: z.boolean().optional(),
});
export const InboxRuleSchema = z.object({
    user_id: z.string().max(64).nullable().optional(),
    rule_key: z.string().min(1).max(150),
    match_expression: z.record(z.unknown()).optional(),
    action: z.record(z.unknown()).optional(),
    priority: z.number().int().min(0).max(10000).optional(),
    is_enabled: z.boolean().optional(),
});
export const InboxSnoozeSchema = z.object({
    notification_id: UUID,
    snooze_until: z.string().datetime(),
    reason: z.string().nullable().optional(),
});
export const InboxAssignmentSchema = z.object({
    notification_id: UUID,
    assignee_user_id: z.string().min(1).max(64),
    note: z.string().nullable().optional(),
});
//# sourceMappingURL=notification.schemas.js.map