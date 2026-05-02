import { ServiceClient } from '@dos/service-client';

const tenantClient = new ServiceClient({
  baseUrl: process.env['TENANT_SERVICE_URL'] || 'http://127.0.0.1:4002',
  timeout: 5000,
  retries: 2,
});

export interface TenantInfo {
  tenantId: string;
  name: string;
  status: string;
  plan: string;
}

export async function getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  try {
    const response = await tenantClient.get<TenantInfo>(`/api/tenants/${tenantId}`);
    if (!response.ok) return null;
    return response.data as TenantInfo;
  } catch {
    return null;
  }
}

export async function validateTenantActive(tenantId: string): Promise<boolean> {
  const tenant = await getTenantInfo(tenantId);
  return tenant?.status === 'active';
}
