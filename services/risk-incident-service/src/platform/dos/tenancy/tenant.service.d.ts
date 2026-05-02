export { SYSTEM_TENANT } from '@dos/platform-core';
export { tenantSchema } from '@dos/db';
export declare const tenantService: {
    resolve: (_tenantId: string) => Promise<{
        id: string;
        name: string;
        schema: string;
    }>;
    list: () => Promise<never[]>;
};
