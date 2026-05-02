import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ComplianceState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedFrameworkId = signal<string | null>(null);
  private readonly _filterStatus = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedFrameworkId = this._selectedFrameworkId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  selectFramework(id: string | null): void { this._selectedFrameworkId.set(id); }
  setFilterStatus(status: string | null): void { this._filterStatus.set(status); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._selectedFrameworkId.set(null);
    this._filterStatus.set(null);
  }
}
