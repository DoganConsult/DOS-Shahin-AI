import { Injectable, signal, computed } from '@angular/core';
import type { GovernanceRitualContract, GovernanceRitualStatus } from '../contracts/governance-os.contracts';
@Injectable({ providedIn: 'root' })
export class GovernanceOsState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _rituals = signal<GovernanceRitualContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly rituals = this._rituals.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._rituals().length === 0);
  readonly selected = computed(() => this._rituals().find(r => r.ritualId === this._selectedId()) ?? null);
  readonly overdueCount = computed(() => this._rituals().filter(r => r.status === 'overdue').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setRituals(v: GovernanceRitualContract[]): void { this._rituals.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  reset(): void { this._loading.set(false); this._error.set(null); this._rituals.set([]); this._selectedId.set(null); }
}
