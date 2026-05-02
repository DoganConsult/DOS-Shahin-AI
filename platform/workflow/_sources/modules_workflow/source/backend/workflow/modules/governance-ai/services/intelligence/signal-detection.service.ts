export async function runSignalScan(_tenantId: string): Promise<{ signals_created: number; errors: string[] }> {
  return { signals_created: 0, errors: [] };
}
