import { Injectable, signal, computed } from '@angular/core';
import type { TrainingProgramContract, TrainingProgramStatus } from '../contracts/training.contracts';
@Injectable({ providedIn: 'root' })
export class TrainingState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _programs = signal<TrainingProgramContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<TrainingProgramStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly programs = this._programs.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._programs().length === 0);
  readonly totalCount = computed(() => this._programs().length);
  readonly selected = computed(() => this._programs().find(p => p.programId === this._selectedId()) ?? null);
  readonly activeCount = computed(() => this._programs().filter(p => p.status === 'active').length);
  readonly avgCompletionRate = computed(() => { const progs = this._programs(); return progs.length ? progs.reduce((sum, p) => sum + p.completionRate, 0) / progs.length : 0; });
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setPrograms(v: TrainingProgramContract[]): void { this._programs.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: TrainingProgramStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._programs.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
