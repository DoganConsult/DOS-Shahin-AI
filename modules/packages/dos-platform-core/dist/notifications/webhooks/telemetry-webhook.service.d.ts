export declare function processWebhook(tenantId: string, payload: Record<string, any>): Promise<Record<string, unknown>>;
export declare function authenticateWebhook(apiKey: string, rawBody: string, signature?: string): Promise<{
    tenantId: string;
    keyId: string;
    sourceName: string;
}>;
export declare function createWebhookApiKey(tenantId: string, keyName: string, sourceName: string, enableHmac?: boolean): Promise<Record<string, unknown>>;
export declare function listWebhookApiKeys(tenantId: string): Promise<Record<string, unknown>[]>;
export declare function revokeWebhookApiKey(tenantId: string, keyId: string): Promise<void>;
