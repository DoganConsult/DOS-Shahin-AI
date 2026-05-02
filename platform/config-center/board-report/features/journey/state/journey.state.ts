import { Injectable, signal, computed } from '@angular/core';
import type { JourneyContract, JourneyStatus } from '../contracts/journey.contracts';
@Injectable({ providedIn: 'root' })
export class JourneyState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _journeys = signal<JourneyContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<JourneyStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly journeys = this._journeys.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._journeys().length === 0);
  readonly totalCount = computed(() => this._journeys().length);
  readonly selected = computed(() => this._journeys().find(j => j.journeyId === this._selectedId()) ?? null);
  readonly activeCount = computed(() => this._journeys().filter(j => j.status === 'in_progress').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setJourneys(v: JourneyContract[]): void { this._journeys.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: JourneyStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._journeys.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
