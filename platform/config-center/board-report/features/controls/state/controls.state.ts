import { Injectable, signal, computed } from '@angular/core';
import type { ControlContract, ControlStatus, ControlCategory } from '../contracts/controls.contracts';

@Injectable({ providedIn: 'root' })
export class ControlsState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _controls = signal<ControlContract[]>([]);
  private readonly _selectedControlId = signal<string | null>(null);
  private readonly _filterStatus = signal<ControlStatus | null>(null);
  private readonly _filterCategory = signal<ControlCategory | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly controls = this._controls.asReadonly();
  readonly selectedControlId = this._selectedControlId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly filterCategory = this._filterCategory.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._controls().length === 0);
  readonly totalCount = computed(() => this._controls().length);
  readonly selectedControl = computed(() => this._controls().find(c => c.controlId === this._selectedControlId()) ?? null);
  readonly ineffectiveCount = computed(() => this._controls().filter(c => c.designEffectiveness === 'ineffective' || c.operatingEffectiveness === 'ineffective').length);
  readonly activeCount = computed(() => this._controls().filter(c => c.status === 'active').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setControls(v: ControlContract[]): void { this._controls.set(v); }
  selectControl(id: string | null): void { this._selectedControlId.set(id); }
  setFilterStatus(v: ControlStatus | null): void { this._filterStatus.set(v); }
  setFilterCategory(v: ControlCategory | null): void { this._filterCategory.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._controls.set([]);
    this._selectedControlId.set(null);
    this._filterStatus.set(null);
    this._filterCategory.set(null);
  }
}
