export declare const notificationService: {
    send: (_tenantId: string, _notification: Record<string, unknown>) => Promise<void>;
    broadcast: (_tenantId: string, _message: Record<string, unknown>) => Promise<void>;
};
export declare function createNotification(_tenantId: string, _notification: Record<string, unknown>): Promise<void>;
