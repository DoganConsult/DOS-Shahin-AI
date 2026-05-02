import { z } from 'zod';
export const BootstrapQuerySchema = z.object({
    tenantId: z.string().min(1).max(64),
    userId: z.string().min(1).max(64),
    productCode: z.string().min(1).max(100).optional().nullable(),
    workspaceKey: z.string().min(1).max(120).optional(),
});
//# sourceMappingURL=bootstrap.schemas.js.map