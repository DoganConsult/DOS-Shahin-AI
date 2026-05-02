

export async function syncAllConnections(_tenantId: string): Promise<any> {
  return { synced: 0, errors: [] };
}

export async function getConnectorStatus(_tenantId: string): Promise<any[]> {
  return [];
}
