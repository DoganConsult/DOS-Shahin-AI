import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GovernanceState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedBodyId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedBodyId = this._selectedBodyId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  selectBody(id: string | null): void { this._selectedBodyId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._selectedBodyId.set(null);
  }
}
