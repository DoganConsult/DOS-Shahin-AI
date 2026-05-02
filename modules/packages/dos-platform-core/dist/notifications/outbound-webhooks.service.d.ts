export interface OutboundWebhookInput {
    name: string;
    url: string;
    eventTypes: string[];
    secret?: string;
    enabled?: boolean;
}
export interface OutboundWebhookRecord extends OutboundWebhookInput {
    webhookId: string;
    tenantId: string;
    createdAt: string;
}
export interface WebhookDeliveryAttempt {
    deliveryId: string;
    webhookId: string;
    tenantId: string;
    eventType: string;
    statusCode: number | null;
    ok: boolean;
    error: string | null;
    deliveredAt: string;
}
export declare function registerWebhook(tenantId: string, input: OutboundWebhookInput): Promise<OutboundWebhookRecord>;
export declare function listWebhooks(tenantId: string): Promise<OutboundWebhookRecord[]>;
export declare function deleteWebhook(tenantId: string, webhookId: string): Promise<void>;
export declare function dispatchEvent(tenantId: string, eventType: string, payload: Record<string, unknown>): Promise<Array<{
    webhookId: string;
    ok: boolean;
    statusCode: number | null;
}>>;
export declare function getWebhookDeliveryLog(tenantId: string, webhookId: string, limit?: number): Promise<WebhookDeliveryAttempt[]>;
