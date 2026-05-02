import { Injectable, signal, computed } from '@angular/core';
import type { AdminSectionContract, AdminSectionStatus } from '../contracts/admin.contracts';
@Injectable({ providedIn: 'root' })
export class AdminState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _sections = signal<AdminSectionContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<AdminSectionStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly sections = this._sections.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._sections().length === 0);
  readonly totalCount = computed(() => this._sections().length);
  readonly selected = computed(() => this._sections().find(s => s.sectionId === this._selectedId()) ?? null);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setSections(v: AdminSectionContract[]): void { this._sections.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: AdminSectionStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._sections.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
