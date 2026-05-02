/**
 * Event-bus channels emitted when no in-process PlatformNotifications
 * provider is registered. notification-service subscribes to these and
 * forwards to the real delivery.service pipeline (Graph API → SMTP).
 */
export const NOTIFICATIONS_SEND_EMAIL_EVENT = 'notifications.send-email';
export const NOTIFICATIONS_SEND_TEMPLATED_EVENT = 'notifications.send-templated';
let _notifications = null;
export function setNotificationProvider(impl) {
    _notifications = impl;
}
export function clearNotificationProvider() {
    _notifications = null;
}
function getNotifications() {
    return _notifications;
}
/**
 * Publish an email-send request to the platform event bus so
 * notification-service can deliver it. Imported lazily to avoid a hard
 * circular dep between the notifications and events modules at load time.
 */
async function publishEmailRequest(eventType, payload) {
    try {
        const { publish } = await import('../events/events.js');
        // Tenant id is not a first-class field on sendEmail; publish under a
        // synthetic 'platform' tenant for routing. Consumers look at the
        // payload, not the event's tenantId, for recipient(s).
        await publish(eventType, payload.tenantId ?? 'platform', payload);
    }
    catch (err) {
        // Bus unavailable (e.g., in CLI / tests). Re-throw with a clearer
        // error than the original port's "not initialized" so the caller
        // can distinguish bootstrap vs runtime issues.
        throw new Error(`[notifications] No in-process PlatformNotifications provider and event-bus fanout unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
}
export function sendEmail(to, subject, body, opts) {
    const impl = getNotifications();
    if (impl)
        return impl.sendEmail(to, subject, body, opts);
    return publishEmailRequest(NOTIFICATIONS_SEND_EMAIL_EVENT, { to, subject, body, opts });
}
export function sendTemplatedEmail(to, templateId, variables) {
    const impl = getNotifications();
    if (impl)
        return impl.sendTemplatedEmail(to, templateId, variables);
    return publishEmailRequest(NOTIFICATIONS_SEND_TEMPLATED_EVENT, {
        to,
        templateId,
        variables,
        tenantId: variables.tenantId,
    });
}
export function sendEmailWithAttachments(to, subject, body, attachments) {
    const impl = getNotifications();
    if (impl)
        return impl.sendEmailWithAttachments(to, subject, body, attachments);
    // Attachments can't be safely serialized across the event bus (binary
    // payloads inflate stream size, security concerns). Require in-process.
    throw new Error('[notifications] sendEmailWithAttachments requires an in-process PlatformNotifications provider (call setNotificationProvider() in the local service bootstrap).');
}
function requireInProcessImpl(op) {
    const impl = getNotifications();
    if (!impl) {
        throw new Error(`[notifications] ${op}() requires an in-process PlatformNotifications provider (call setNotificationProvider() in the local service bootstrap, or run this call inside notification-service).`);
    }
    return impl;
}
export function renderEmailTemplate(templateId, variables) {
    return requireInProcessImpl('renderEmailTemplate').renderEmailTemplate(templateId, variables);
}
export function renderInvitationEmail(variables) {
    return requireInProcessImpl('renderInvitationEmail').renderInvitationEmail(variables);
}
export function listEmailTemplates(tenantId) {
    const impl = requireInProcessImpl('listEmailTemplates');
    if (!impl.listEmailTemplates) {
        throw new Error('listEmailTemplates() not supported by current PlatformNotifications implementation.');
    }
    return impl.listEmailTemplates(tenantId);
}
export function upsertEmailTemplate(tenantId, data) {
    const impl = requireInProcessImpl('upsertEmailTemplate');
    if (!impl.upsertEmailTemplate) {
        throw new Error('upsertEmailTemplate() not supported by current PlatformNotifications implementation.');
    }
    return impl.upsertEmailTemplate(tenantId, data);
}
export function getEmailSendLog(tenantId, limit) {
    const impl = requireInProcessImpl('getEmailSendLog');
    if (!impl.getEmailSendLog) {
        throw new Error('getEmailSendLog() not supported by current PlatformNotifications implementation.');
    }
    return impl.getEmailSendLog(tenantId, limit);
}
//# sourceMappingURL=notifications.js.map