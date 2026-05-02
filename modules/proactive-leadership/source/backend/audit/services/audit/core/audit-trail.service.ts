export const auditTrail = {
  log: async (_tenantId: string, _entry: Record<string, unknown>) => {},
  query: async (_tenantId: string, _filter: Record<string, unknown>) => [],
};
export async function recordAudit(entry: { tenantId: string } & Record<string, unknown>): Promise<void> {
  const { tenantId, ...rest } = entry;
  await auditTrail.log(tenantId, rest);
}
