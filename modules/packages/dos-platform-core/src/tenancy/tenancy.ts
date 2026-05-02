export interface ProvisionedTenant {
  tenant_id: string;
  settings?: any;
}

export interface PlatformTenancy {
  getProvisionedTenants(): Promise<ProvisionedTenant[]>;
}

let _tenancy: PlatformTenancy | null = null;

export function setTenancyHandler(impl: PlatformTenancy): void {
  _tenancy = impl;
}

export async function getProvisionedTenants(): Promise<ProvisionedTenant[]> {
  if (!_tenancy) {
    throw new Error('PlatformTenancy not initialized. Call setTenancyHandler() first.');
  }
  return _tenancy.getProvisionedTenants();
}
