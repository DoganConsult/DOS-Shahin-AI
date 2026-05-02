import { Injectable, signal, computed } from '@angular/core';
import type { BcpPlanContract, BcpPlanStatus } from '../contracts/bcp.contracts';
@Injectable({ providedIn: 'root' })
export class BcpState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _plans = signal<BcpPlanContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<BcpPlanStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly plans = this._plans.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._plans().length === 0);
  readonly totalCount = computed(() => this._plans().length);
  readonly selected = computed(() => this._plans().find(p => p.planId === this._selectedId()) ?? null);
  readonly outdatedCount = computed(() => this._plans().filter(p => p.status === 'outdated').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setPlans(v: BcpPlanContract[]): void { this._plans.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: BcpPlanStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._plans.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
