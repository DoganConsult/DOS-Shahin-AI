import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EvidenceState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedEvidenceId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedEvidenceId = this._selectedEvidenceId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  selectEvidence(id: string | null): void { this._selectedEvidenceId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._selectedEvidenceId.set(null);
  }
}
