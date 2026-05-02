export interface EmailDeliveryResult {
    success: boolean;
    attempts: number;
    error?: string;
}
export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
}
export interface UpsertEmailTemplateInput {
    templateKey: string;
    nameEn: string;
    nameAr?: string;
    subjectEn: string;
    subjectAr?: string;
    bodyHtmlEn: string;
    bodyHtmlAr?: string;
    bodyTextEn?: string;
    bodyTextAr?: string;
    variables?: unknown[];
    category?: string;
    createdBy?: string;
}
export interface PlatformNotifications {
    sendEmail(to: string | string[], subject: string, body: string, opts?: {
        from?: string;
        html?: boolean;
    }): Promise<void>;
    sendTemplatedEmail(to: string | string[], templateId: string, variables: Record<string, unknown>): Promise<void>;
    sendEmailWithAttachments(to: string | string[], subject: string, body: string, attachments: EmailAttachment[]): Promise<void>;
    renderEmailTemplate(templateId: string, variables: Record<string, unknown>): Promise<string>;
    renderInvitationEmail(variables: Record<string, unknown>): Promise<string>;
    listEmailTemplates?(tenantId: string): Promise<Record<string, unknown>[]>;
    upsertEmailTemplate?(tenantId: string, data: UpsertEmailTemplateInput): Promise<unknown>;
    getEmailSendLog?(tenantId: string, limit?: number): Promise<Record<string, unknown>[]>;
}
/**
 * Event-bus channels emitted when no in-process PlatformNotifications
 * provider is registered. notification-service subscribes to these and
 * forwards to the real delivery.service pipeline (Graph API → SMTP).
 */
export declare const NOTIFICATIONS_SEND_EMAIL_EVENT: "notifications.send-email";
export declare const NOTIFICATIONS_SEND_TEMPLATED_EVENT: "notifications.send-templated";
export declare function setNotificationProvider(impl: PlatformNotifications): void;
export declare function clearNotificationProvider(): void;
export declare function sendEmail(to: string | string[], subject: string, body: string, opts?: {
    from?: string;
    html?: boolean;
}): Promise<void>;
export declare function sendTemplatedEmail(to: string | string[], templateId: string, variables: Record<string, unknown>): Promise<void>;
export declare function sendEmailWithAttachments(to: string | string[], subject: string, body: string, attachments: EmailAttachment[]): Promise<void>;
export declare function renderEmailTemplate(templateId: string, variables: Record<string, unknown>): Promise<string>;
export declare function renderInvitationEmail(variables: Record<string, unknown>): Promise<string>;
export declare function listEmailTemplates(tenantId: string): Promise<Record<string, unknown>[]>;
export declare function upsertEmailTemplate(tenantId: string, data: UpsertEmailTemplateInput): Promise<unknown>;
export declare function getEmailSendLog(tenantId: string, limit?: number): Promise<Record<string, unknown>[]>;
