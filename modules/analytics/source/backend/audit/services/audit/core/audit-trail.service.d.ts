export declare const auditTrail: {
    log: (_tenantId: string, _entry: Record<string, unknown>) => Promise<void>;
    query: (_tenantId: string, _filter: Record<string, unknown>) => Promise<never[]>;
};
export declare const recordAudit: {
    log: (_tenantId: string, _entry: Record<string, unknown>) => Promise<void>;
    query: (_tenantId: string, _filter: Record<string, unknown>) => Promise<never[]>;
};
