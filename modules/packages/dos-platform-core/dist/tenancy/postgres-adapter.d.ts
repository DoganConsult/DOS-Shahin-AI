/**
 * Real PlatformTenancy implementation backed by public.tenants.
 *
 * Registered via setTenancyHandler() at service bootstrap so any module
 * or service code calling getProvisionedTenants() from
 * @dos/platform-core/tenancy hits this single source of truth.
 *
 * "Provisioned" = a tenant whose schema exists and is eligible for
 * scheduled jobs / event fanout. We exclude tenants that have been
 * soft-disabled, but include 'onboarding' so the provisioning pipeline
 * itself can run (seeding data for a tenant still in onboarding).
 */
import { type PlatformTenancy, type ProvisionedTenant } from './tenancy';
export declare class PostgresTenancyAdapter implements PlatformTenancy {
    getProvisionedTenants(): Promise<ProvisionedTenant[]>;
}
/**
 * Register the canonical Postgres tenancy adapter with @dos/platform-core.
 * Idempotent — safe to call from multiple entry points.
 */
export declare function registerTenancyAdapter(): void;
