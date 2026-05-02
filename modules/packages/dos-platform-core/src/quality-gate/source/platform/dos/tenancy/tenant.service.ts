export { SYSTEM_TENANT } from '@dos/platform-core';
export { tenantSchema } from '@dos/db';
export const tenantService = {
  resolve: async (_tenantId: string) => ({ id: '', name: '', schema: '' }),
  list: async () => [],
};
