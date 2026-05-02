export declare const enterpriseAuthzService: {
    checkPermission: (_tenantId: string, _userId: string, _permission: string) => Promise<boolean>;
    getRoles: (_tenantId: string, _userId: string) => Promise<string[]>;
    hasRole: (_tenantId: string, _userId: string, _role: string) => Promise<boolean>;
};
