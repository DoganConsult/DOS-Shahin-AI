export const auditTrail = {
  log: async (_tenantId: string, _entry: Record<string, unknown>) => {},
  query: async (_tenantId: string, _filter: Record<string, unknown>) => [],
};
export const recordAudit = auditTrail;
