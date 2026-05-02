import { Injectable, signal, computed } from '@angular/core';
import type { RecordContract, RecordStatus } from '../contracts/records.contracts';
@Injectable({ providedIn: 'root' })
export class RecordsState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _records = signal<RecordContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<RecordStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly records = this._records.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._records().length === 0);
  readonly totalCount = computed(() => this._records().length);
  readonly selected = computed(() => this._records().find(r => r.recordId === this._selectedId()) ?? null);
  readonly legalHoldCount = computed(() => this._records().filter(r => r.status === 'legal_hold').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setRecords(v: RecordContract[]): void { this._records.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: RecordStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._records.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
