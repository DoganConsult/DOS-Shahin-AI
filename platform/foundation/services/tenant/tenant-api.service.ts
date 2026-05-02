import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Tenant Types
export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'decommissioned' | 'deleted';
export type TenantPlan = 'starter' | 'professional' | 'enterprise' | 'custom';
export type IsolationMode = 'strict' | 'permissive';

export interface TenantRecord {
  tenant_id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  domain: string | null;
  logo_url: string | null;
  config: Record<string, unknown>;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  activated_at: string | null;
  metadata: Record<string, unknown>;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: TenantPlan;
  domain?: string;
  logoUrl?: string;
  ownerUserId: string;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TenantFilters {
  status?: TenantStatus;
  plan?: TenantPlan;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface TenantListResponse {
  data: TenantRecord[];
  total: number;
}

export interface TenantStatusRecord {
  tenant_id: string;
  status: TenantStatus;
  last_transition_at: string;
  last_transition_by: string | null;
  last_transition_reason: string | null;
}

export interface StatusTransitionRecord {
  transition_id: string;
  tenant_id: string;
  from_status: TenantStatus;
  to_status: TenantStatus;
  transitioned_by: string;
  reason: string | null;
  transitioned_at: string;
}

export interface BoundaryConfig {
  isolation_mode: IsolationMode;
  allow_cross_tenant_read: boolean;
  allow_cross_tenant_write: boolean;
  allowed_partner_tenant_ids: string[];
  max_resources_per_type: Record<string, number>;
}

export interface ResourceCounts {
  tenant_id: string;
  counts: Record<string, number>;
  total: number;
  counted_at: string;
}

export interface QuotaValidation {
  allowed: boolean;
  resource_type: string;
  current_count: number;
  max_allowed: number;
  remaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class TenantApiService {
  private readonly baseUrl = '/api/platform/dos/tenancy';

  constructor(private http: HttpClient) {}

  // === Tenant Service Methods ===

  /**
   * Fetch a single tenant record by ID
   */
  getTenant(tenantId: string): Observable<TenantRecord | null> {
    return this.http.get<TenantRecord>(`${this.baseUrl}/tenants/${tenantId}`).pipe(
      catchError(error => {
        if (error.status === 404) return null;
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new tenant record
   */
  createTenant(input: CreateTenantInput): Observable<TenantRecord> {
    return this.http.post<TenantRecord>(`${this.baseUrl}/tenants`, input);
  }

  /**
   * Update an existing tenant record
   */
  updateTenant(tenantId: string, updates: Partial<TenantRecord>): Observable<TenantRecord | null> {
    return this.http.put<TenantRecord>(`${this.baseUrl}/tenants/${tenantId}`, updates).pipe(
      catchError(error => {
        if (error.status === 404) return null;
        return throwError(() => error);
      })
    );
  }

  /**
   * Soft-delete a tenant
   */
  deleteTenant(tenantId: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/tenants/${tenantId}`);
  }

  /**
   * List tenants with filters
   */
  listTenants(filters: TenantFilters = {}): Observable<TenantListResponse> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.plan) params = params.set('plan', filters.plan);
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
    if (filters.limit) params = params.set('limit', Math.min(filters.limit, 500).toString());
    if (filters.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<TenantListResponse>(`${this.baseUrl}/tenants`, { params });
  }

  /**
   * Look up tenant by slug
   */
  getTenantBySlug(slug: string): Observable<TenantRecord | null> {
    return this.http.get<TenantRecord>(`${this.baseUrl}/tenants/by-slug/${slug}`).pipe(
      catchError(error => {
        if (error.status === 404) return null;
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate tenant access for user
   */
  validateTenantAccess(tenantId: string, userId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/tenants/${tenantId}/access/${userId}`);
  }

  // === Tenant Status Service Methods ===

  /**
   * Get current tenant status
   */
  getTenantStatus(tenantId: string): Observable<TenantStatusRecord | null> {
    return this.http.get<TenantStatusRecord>(`${this.baseUrl}/status/${tenantId}`).pipe(
      catchError(error => {
        if (error.status === 404) return null;
        return throwError(() => error);
      })
    );
  }

  /**
   * Activate a tenant
   */
  activateTenant(tenantId: string, activatedBy: string): Observable<TenantStatusRecord> {
    return this.http.post<TenantStatusRecord>(`${this.baseUrl}/status/${tenantId}/activate`, {
      activatedBy
    });
  }

  /**
   * Suspend a tenant
   */
  suspendTenant(tenantId: string, reason: string, suspendedBy: string): Observable<TenantStatusRecord> {
    return this.http.post<TenantStatusRecord>(`${this.baseUrl}/status/${tenantId}/suspend`, {
      reason,
      suspendedBy
    });
  }

  /**
   * Reactivate a suspended tenant
   */
  reactivateTenant(tenantId: string, reactivatedBy: string): Observable<TenantStatusRecord> {
    return this.http.post<TenantStatusRecord>(`${this.baseUrl}/status/${tenantId}/reactivate`, {
      reactivatedBy
    });
  }

  /**
   * Decommission a tenant
   */
  decommissionTenant(tenantId: string, decommissionedBy: string): Observable<TenantStatusRecord> {
    return this.http.post<TenantStatusRecord>(`${this.baseUrl}/status/${tenantId}/decommission`, {
      decommissionedBy
    });
  }

  /**
   * Get tenant status history
   */
  getTenantStatusHistory(tenantId: string): Observable<StatusTransitionRecord[]> {
    return this.http.get<StatusTransitionRecord[]>(`${this.baseUrl}/status/${tenantId}/history`);
  }

  /**
   * Check if transition to target status is allowed
   */
  canTransitionTo(tenantId: string, targetStatus: TenantStatus): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/status/${tenantId}/can-transition/${targetStatus}`);
  }

  // === Tenant Boundary Service Methods ===

  /**
   * Get tenant boundary configuration
   */
  getTenantBoundaryConfig(tenantId: string): Observable<BoundaryConfig> {
    return this.http.get<BoundaryConfig>(`${this.baseUrl}/boundaries/${tenantId}/config`);
  }

  /**
   * Update tenant boundary configuration
   */
  updateTenantBoundaryConfig(tenantId: string, config: BoundaryConfig): Observable<BoundaryConfig> {
    return this.http.put<BoundaryConfig>(`${this.baseUrl}/boundaries/${tenantId}/config`, config);
  }

  /**
   * Get tenant resource counts
   */
  getTenantResourceCounts(tenantId: string): Observable<ResourceCounts> {
    return this.http.get<ResourceCounts>(`${this.baseUrl}/boundaries/${tenantId}/counts`);
  }

  /**
   * Validate tenant quota for resource type
   */
  validateTenantQuota(tenantId: string, resourceType: string): Observable<QuotaValidation> {
    return this.http.get<QuotaValidation>(`${this.baseUrl}/boundaries/${tenantId}/quota/${resourceType}`);
  }

  /**
   * Check if tenant isolation is enforced
   */
  isTenantIsolationEnforced(tenantId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/boundaries/${tenantId}/isolation`);
  }

  /**
   * Validate cross-tenant access
   */
  validateCrossTenantAccess(sourceTenantId: string, targetTenantId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/boundaries/${sourceTenantId}/cross-access/${targetTenantId}`);
  }

  // === Tenant Configuration Service Methods ===

  /**
   * Get tenant configuration
   */
  getTenantConfig(tenantId: string): Observable<Record<string, unknown> | null> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/config/${tenantId}`).pipe(
      catchError(error => {
        if (error.status === 404) return null;
        return throwError(() => error);
      })
    );
  }

  /**
   * Update tenant configuration
   */
  updateTenantConfig(tenantId: string, patch: Partial<Record<string, unknown>>, updatedBy: string): Observable<{
    config: Record<string, unknown>;
    sectorChanges?: { added: string[]; removed: string[]; packs: unknown[] };
  }> {
    return this.http.put(`${this.baseUrl}/config/${tenantId}`, {
      patch,
      updatedBy
    });
  }

  /**
   * Get tenant configuration history
   */
  getTenantConfigHistory(tenantId: string): Observable<Array<{
    versionNumber: number;
    config: Record<string, unknown>;
    changedBy: string;
    changedAt: string;
  }>> {
    return this.http.get<Array<{
      versionNumber: number;
      config: Record<string, unknown>;
      changedBy: string;
      changedAt: string;
    }>>(`${this.baseUrl}/config/${tenantId}/history`);
  }

  /**
   * Rollback tenant configuration
   */
  rollbackTenantConfig(tenantId: string, targetVersion: number): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/config/${tenantId}/rollback`, {
      targetVersion
    });
  }

  /**
   * Validate tenant configuration
   */
  validateTenantConfig(config: Partial<Record<string, unknown>>): Observable<{
    valid: boolean;
    errors?: string[];
  }> {
    return this.http.post<{
      valid: boolean;
      errors?: string[];
    }>(`${this.baseUrl}/config/validate`, { config });
  }

  // === Utility Methods ===

  /**
   * Get tenant display name with fallback
   */
  getTenantDisplayName(tenant: TenantRecord): string {
    return tenant.name || tenant.slug || tenant.tenant_id;
  }

  /**
   * Check if tenant is active
   */
  isTenantActive(tenant: TenantRecord): boolean {
    return tenant.status === 'active';
  }

  /**
   * Check if tenant can be activated
   */
  canActivateTenant(tenant: TenantRecord): boolean {
    return tenant.status === 'provisioning';
  }

  /**
   * Check if tenant can be suspended
   */
  canSuspendTenant(tenant: TenantRecord): boolean {
    return tenant.status === 'active';
  }

  /**
   * Check if tenant can be reactivated
   */
  canReactivateTenant(tenant: TenantRecord): boolean {
    return tenant.status === 'suspended';
  }

  /**
   * Check if tenant can be decommissioned
   */
  canDecommissionTenant(tenant: TenantRecord): boolean {
    return ['active', 'suspended'].includes(tenant.status);
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: TenantStatus): string {
    const colorMap: Record<TenantStatus, string> = {
      provisioning: 'orange',
      active: 'green',
      suspended: 'red',
      decommissioned: 'gray',
      deleted: 'black'
    };
    return colorMap[status] || 'gray';
  }

  /**
   * Get plan display name
   */
  getPlanDisplayName(plan: TenantPlan): string {
    const nameMap: Record<TenantPlan, string> = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise',
      custom: 'Custom'
    };
    return nameMap[plan] || plan;
  }
}
