import { Injectable, signal, computed } from '@angular/core';
import type { ProcessingActivityContract, PrivacyStatus } from '../contracts/privacy.contracts';
@Injectable({ providedIn: 'root' })
export class PrivacyState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _activities = signal<ProcessingActivityContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<PrivacyStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly activities = this._activities.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._activities().length === 0);
  readonly totalCount = computed(() => this._activities().length);
  readonly selected = computed(() => this._activities().find(a => a.activityId === this._selectedId()) ?? null);
  readonly nonCompliantCount = computed(() => this._activities().filter(a => a.status === 'non_compliant').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setActivities(v: ProcessingActivityContract[]): void { this._activities.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: PrivacyStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._activities.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
