import { Injectable, signal, computed } from '@angular/core';
import type { GovAiSignalContract, GovAiSignalStatus } from '../contracts/governance-ai.contracts';
@Injectable({ providedIn: 'root' })
export class GovernanceAiState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _signals = signal<GovAiSignalContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly signals = this._signals.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._signals().length === 0);
  readonly selected = computed(() => this._signals().find(s => s.signalId === this._selectedId()) ?? null);
  readonly pendingCount = computed(() => this._signals().filter(s => ['detected', 'analyzing'].includes(s.status)).length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setSignals(v: GovAiSignalContract[]): void { this._signals.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  reset(): void { this._loading.set(false); this._error.set(null); this._signals.set([]); this._selectedId.set(null); }
}
