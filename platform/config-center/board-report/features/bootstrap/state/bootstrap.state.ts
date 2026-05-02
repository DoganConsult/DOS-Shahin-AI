import { Injectable, signal, computed } from '@angular/core';
import type { BootstrapSessionContract, BootstrapStatus } from '../contracts/bootstrap.contracts';
@Injectable({ providedIn: 'root' })
export class BootstrapState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _sessions = signal<BootstrapSessionContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<BootstrapStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly sessions = this._sessions.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._sessions().length === 0);
  readonly totalCount = computed(() => this._sessions().length);
  readonly selected = computed(() => this._sessions().find(s => s.sessionId === this._selectedId()) ?? null);
  readonly failedCount = computed(() => this._sessions().filter(s => s.status === 'failed').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setSessions(v: BootstrapSessionContract[]): void { this._sessions.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: BootstrapStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._sessions.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
