/**
 * HG5 — Tenant bootstrap seed hook.
 *
 * Creates the minimum viable foundation footprint for a new tenant so the
 * workspace home renders non-empty cards on first login:
 *   - 1 default organization
 *   - 1 root business unit
 *   - 4 default positions (CEO, CFO, CTO, COO)
 *   - Tenant-owner role assignment (functional role 'tenant_owner' if present)
 *
 * Invoked by tenant-service/src/domain/provisioning/module-kickstart.service.ts
 * when the 'foundation' module is activated for a tenant.
 *
 * Idempotent — safe to re-run; all INSERTs are ON CONFLICT DO NOTHING.
 */
export interface FoundationBootstrapInput {
    tenantId: string;
    ownerUserId: string;
    organizationNameEn?: string;
    organizationNameAr?: string;
}
export interface FoundationBootstrapResult {
    tenantId: string;
    organizationId: string;
    businessUnitId: string;
    positionIds: string[];
    ownerRoleAssigned: boolean;
    alreadyBootstrapped: boolean;
}
export declare function bootstrapFoundationDefaults(input: FoundationBootstrapInput): Promise<FoundationBootstrapResult>;
