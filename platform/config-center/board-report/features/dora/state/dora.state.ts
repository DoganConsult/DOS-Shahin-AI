import { Injectable, signal, computed } from '@angular/core';
import type { DoraObligationContract, DoraObligationStatus, DoraPillar } from '../contracts/dora.contracts';
@Injectable({ providedIn: 'root' })
export class DoraState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _obligations = signal<DoraObligationContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<DoraObligationStatus | null>(null); private readonly _filterPillar = signal<DoraPillar | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly obligations = this._obligations.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly(); readonly filterPillar = this._filterPillar.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._obligations().length === 0);
  readonly totalCount = computed(() => this._obligations().length);
  readonly selected = computed(() => this._obligations().find(o => o.obligationId === this._selectedId()) ?? null);
  readonly nonCompliantCount = computed(() => this._obligations().filter(o => o.status === 'non_compliant').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setObligations(v: DoraObligationContract[]): void { this._obligations.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: DoraObligationStatus | null): void { this._filterStatus.set(v); } setFilterPillar(v: DoraPillar | null): void { this._filterPillar.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._obligations.set([]); this._selectedId.set(null); this._filterStatus.set(null); this._filterPillar.set(null); }
}
