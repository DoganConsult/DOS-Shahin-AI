/**
 * Phase 0.5 build-compat stub.
 *
 * risk-monitor.job.ts imports `getProvisionedTenants` from this location. The
 * legacy scheduler lived in the monolith and was not carried forward to the
 * service. Wave 2 will reintroduce real scheduling; for Wave 1 the function
 * returns an empty list so the job runs without touching any tenant.
 *
 * Risk is hidden from users in Wave 1, so an empty tenant list is safe.
 */

export interface ProvisionedTenant {
  tenant_id: string;
  schema: string;
}

export async function getProvisionedTenants(): Promise<ProvisionedTenant[]> {
  return [];
}
