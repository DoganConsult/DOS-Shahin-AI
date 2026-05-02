import { Injectable, signal, computed } from '@angular/core';
import type { DashboardDefinitionContract, DashboardStatus } from '../contracts/dashboard.contracts';
@Injectable({ providedIn: 'root' })
export class DashboardState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _dashboards = signal<DashboardDefinitionContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<DashboardStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly dashboards = this._dashboards.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._dashboards().length === 0);
  readonly totalCount = computed(() => this._dashboards().length);
  readonly selected = computed(() => this._dashboards().find(d => d.dashboardId === this._selectedId()) ?? null);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setDashboards(v: DashboardDefinitionContract[]): void { this._dashboards.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: DashboardStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._dashboards.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
