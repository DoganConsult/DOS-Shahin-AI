import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError, shareReplay } from 'rxjs/operators';
import { TenantApiService, TenantRecord, TenantStatus, TenantPlan, BoundaryConfig, ResourceCounts } from './tenant-api.service';

export interface TenantManagementState {
  tenants: TenantRecord[];
  selectedTenant: TenantRecord | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: TenantStatus;
    plan?: TenantPlan;
    searchTerm?: string;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface TenantDashboardData {
  tenant: TenantRecord;
  status: TenantStatus;
  boundaryConfig: BoundaryConfig;
  resourceCounts: ResourceCounts;
  quotaUtilization: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class TenantManagementService {
  private readonly initialState: TenantManagementState = {
    tenants: [],
    selectedTenant: null,
    loading: false,
    error: null,
    filters: {},
    pagination: {
      limit: 50,
      offset: 0,
      total: 0
    }
  };

  private readonly state$ = new BehaviorSubject<TenantManagementState>(this.initialState);
  private readonly refreshTrigger$ = new BehaviorSubject<void>(null);

  // Public observables for components to consume
  public readonly tenants$ = this.state$.pipe(
    map(state => state.tenants),
    shareReplay(1)
  );

  public readonly selectedTenant$ = this.state$.pipe(
    map(state => state.selectedTenant),
    shareReplay(1)
  );

  public readonly loading$ = this.state$.pipe(
    map(state => state.loading),
    shareReplay(1)
  );

  public readonly error$ = this.state$.pipe(
    map(state => state.error),
    shareReplay(1)
  );

  public readonly filters$ = this.state$.pipe(
    map(state => state.filters),
    shareReplay(1)
  );

  public readonly pagination$ = this.state$.pipe(
    map(state => state.pagination),
    shareReplay(1)
  );

  // Combined observable that triggers data refresh when filters or pagination changes
  private readonly dataRefresh$ = combineLatest([
    this.refreshTrigger$,
    this.filters$,
    this.pagination$
  ]).pipe(
    switchMap(() => this.loadTenants()),
    shareReplay(1)
  );

  constructor(private tenantApi: TenantApiService) {
    // Initialize data loading
    this.dataRefresh$.subscribe();
  }

  // === State Management ===

  private updateState(updates: Partial<TenantManagementState>): void {
    const currentState = this.state$.value;
    this.state$.next({ ...currentState, ...updates });
  }

  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  private setError(error: string | null): void {
    this.updateState({ error });
  }

  // === Data Loading ===

  private loadTenants(): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    const currentState = this.state$.value;

    return this.tenantApi.listTenants({
      ...currentState.filters,
      limit: currentState.pagination.limit,
      offset: currentState.pagination.offset
    }).pipe(
      tap(response => {
        this.updateState({
          tenants: response.data,
          pagination: { ...currentState.pagination, total: response.total },
          loading: false
        });
      }),
      catchError(error => {
        console.error('Failed to load tenants:', error);
        this.setError('Failed to load tenants. Please try again.');
        this.setLoading(false);
        return of(void 0);
      })
    );
  }

  // === Public API Methods ===

  /**
   * Refresh tenant list
   */
  public refreshTenants(): void {
    this.refreshTrigger$.next(null);
  }

  /**
   * Select a tenant
   */
  public selectTenant(tenant: TenantRecord | null): void {
    this.updateState({ selectedTenant: tenant });
  }

  /**
   * Update filters and refresh data
   */
  public updateFilters(filters: Partial<TenantManagementState['filters']>): void {
    const currentFilters = this.state$.value.filters;
    this.updateState({ 
      filters: { ...currentFilters, ...filters },
      pagination: { ...this.initialState.pagination } // Reset pagination when filters change
    });
    this.refreshTenants();
  }

  /**
   * Update pagination
   */
  public updatePagination(pagination: Partial<TenantManagementState['pagination']>): void {
    const currentPagination = this.state$.value.pagination;
    this.updateState({ pagination: { ...currentPagination, ...pagination } });
    this.refreshTenants();
  }

  /**
   * Create a new tenant
   */
  public createTenant(input: TenantApiService['CreateTenantInput']): Observable<TenantRecord> {
    this.setLoading(true);
    this.setError(null);

    return this.tenantApi.createTenant(input).pipe(
      tap(tenant => {
        console.log('Tenant created successfully:', tenant);
        this.refreshTenants(); // Refresh list after creation
      }),
      catchError(error => {
        console.error('Failed to create tenant:', error);
        const errorMessage = error.error?.message || 'Failed to create tenant. Please try again.';
        this.setError(errorMessage);
        this.setLoading(false);
        throw error;
      })
    );
  }

  /**
   * Update an existing tenant
   */
  public updateTenant(tenantId: string, updates: Partial<TenantRecord>): Observable<TenantRecord | null> {
    this.setLoading(true);
    this.setError(null);

    return this.tenantApi.updateTenant(tenantId, updates).pipe(
      tap(updatedTenant => {
        if (updatedTenant) {
          console.log('Tenant updated successfully:', updatedTenant);
          // Update selected tenant if it's the one being updated
          const currentSelected = this.state$.value.selectedTenant;
          if (currentSelected?.tenant_id === tenantId) {
            this.selectTenant(updatedTenant);
          }
        }
        this.refreshTenants(); // Refresh list after update
      }),
      catchError(error => {
        console.error('Failed to update tenant:', error);
        const errorMessage = error.error?.message || 'Failed to update tenant. Please try again.';
        this.setError(errorMessage);
        this.setLoading(false);
        throw error;
      })
    );
  }

  /**
   * Delete a tenant
   */
  public deleteTenant(tenantId: string): Observable<{ deleted: boolean }> {
    this.setLoading(true);
    this.setError(null);

    return this.tenantApi.deleteTenant(tenantId).pipe(
      tap(result => {
        if (result.deleted) {
          console.log('Tenant deleted successfully:', tenantId);
          // Clear selected tenant if it's the one being deleted
          const currentSelected = this.state$.value.selectedTenant;
          if (currentSelected?.tenant_id === tenantId) {
            this.selectTenant(null);
          }
        }
        this.refreshTenants(); // Refresh list after deletion
      }),
      catchError(error => {
        console.error('Failed to delete tenant:', error);
        const errorMessage = error.error?.message || 'Failed to delete tenant. Please try again.';
        this.setError(errorMessage);
        this.setLoading(false);
        throw error;
      })
    );
  }

  /**
   * Get comprehensive dashboard data for a tenant
   */
  public getTenantDashboardData(tenantId: string): Observable<TenantDashboardData> {
    return this.tenantApi.getTenant(tenantId).pipe(
      switchMap(tenant => {
        if (!tenant) {
          throw new Error('Tenant not found');
        }

        return combineLatest([
          this.tenantApi.getTenantStatus(tenantId),
          this.tenantApi.getTenantBoundaryConfig(tenantId),
          this.tenantApi.getTenantResourceCounts(tenantId)
        ]).pipe(
          map(([status, boundaryConfig, resourceCounts]) => ({
            tenant,
            status: status?.status || 'unknown',
            boundaryConfig,
            resourceCounts,
            quotaUtilization: this.calculateQuotaUtilization(boundaryConfig, resourceCounts)
          }))
        );
      }),
      catchError(error => {
        console.error('Failed to load tenant dashboard data:', error);
        throw error;
      })
    );
  }

  /**
   * Activate a tenant
   */
  public activateTenant(tenantId: string, activatedBy: string): Observable<void> {
    return this.tenantApi.activateTenant(tenantId, activatedBy).pipe(
      tap(() => {
        console.log('Tenant activated successfully:', tenantId);
        this.refreshTenants();
      }),
      catchError(error => {
        console.error('Failed to activate tenant:', error);
        throw error;
      })
    );
  }

  /**
   * Suspend a tenant
   */
  public suspendTenant(tenantId: string, reason: string, suspendedBy: string): Observable<void> {
    return this.tenantApi.suspendTenant(tenantId, reason, suspendedBy).pipe(
      tap(() => {
        console.log('Tenant suspended successfully:', tenantId);
        this.refreshTenants();
      }),
      catchError(error => {
        console.error('Failed to suspend tenant:', error);
        throw error;
      })
    );
  }

  /**
   * Reactivate a tenant
   */
  public reactivateTenant(tenantId: string, reactivatedBy: string): Observable<void> {
    return this.tenantApi.reactivateTenant(tenantId, reactivatedBy).pipe(
      tap(() => {
        console.log('Tenant reactivated successfully:', tenantId);
        this.refreshTenants();
      }),
      catchError(error => {
        console.error('Failed to reactivate tenant:', error);
        throw error;
      })
    );
  }

  /**
   * Decommission a tenant
   */
  public decommissionTenant(tenantId: string, decommissionedBy: string): Observable<void> {
    return this.tenantApi.decommissionTenant(tenantId, decommissionedBy).pipe(
      tap(() => {
        console.log('Tenant decommissioned successfully:', tenantId);
        this.refreshTenants();
      }),
      catchError(error => {
        console.error('Failed to decommission tenant:', error);
        throw error;
      })
    );
  }

  /**
   * Update tenant boundary configuration
   */
  public updateBoundaryConfig(tenantId: string, config: BoundaryConfig): Observable<void> {
    return this.tenantApi.updateTenantBoundaryConfig(tenantId, config).pipe(
      tap(() => {
        console.log('Boundary configuration updated successfully:', tenantId);
      }),
      catchError(error => {
        console.error('Failed to update boundary configuration:', error);
        throw error;
      })
    );
  }

  // === Utility Methods ===

  private calculateQuotaUtilization(boundaryConfig: BoundaryConfig, resourceCounts: ResourceCounts): Record<string, number> {
    const utilization: Record<string, number> = {};
    
    for (const [resourceType, maxAllowed] of Object.entries(boundaryConfig.max_resources_per_type)) {
      const currentCount = resourceCounts.counts[resourceType] || 0;
      utilization[resourceType] = maxAllowed > 0 ? (currentCount / maxAllowed) * 100 : 0;
    }
    
    return utilization;
  }

  /**
   * Get tenant statistics
   */
  public getTenantStatistics(): Observable<{
    total: number;
    active: number;
    provisioning: number;
    suspended: number;
    decommissioned: number;
    byPlan: Record<TenantPlan, number>;
  }> {
    return this.tenants$.pipe(
      map(tenants => {
        const stats = {
          total: tenants.length,
          active: 0,
          provisioning: 0,
          suspended: 0,
          decommissioned: 0,
          byPlan: {
            starter: 0,
            professional: 0,
            enterprise: 0,
            custom: 0
          } as Record<TenantPlan, number>
        };

        for (const tenant of tenants) {
          stats[tenant.status]++;
          stats.byPlan[tenant.plan]++;
        }

        return stats;
      })
    );
  }

  /**
   * Search tenants by term
   */
  public searchTenants(term: string): void {
    this.updateFilters({ searchTerm: term });
  }

  /**
   * Clear all filters
   */
  public clearFilters(): void {
    this.updateFilters({});
  }

  /**
   * Get current state (for debugging)
   */
  public getCurrentState(): TenantManagementState {
    return this.state$.value;
  }
}
