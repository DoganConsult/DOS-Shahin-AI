export const enterpriseAuthzService = {
  checkPermission: async (_tenantId: string, _userId: string, _permission: string): Promise<boolean> => true,
  getRoles: async (_tenantId: string, _userId: string): Promise<string[]> => [],
  hasRole: async (_tenantId: string, _userId: string, _role: string): Promise<boolean> => true,
};
