import { Injectable, signal, computed } from '@angular/core';
import type { ActionItemContract, ActionStatus, ActionPriority } from '../contracts/action.contracts';

@Injectable({ providedIn: 'root' })
export class ActionState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _actions = signal<ActionItemContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<ActionStatus | null>(null);
  private readonly _filterPriority = signal<ActionPriority | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actions = this._actions.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly filterPriority = this._filterPriority.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._actions().length === 0);
  readonly totalCount = computed(() => this._actions().length);
  readonly selected = computed(() => this._actions().find(a => a.actionId === this._selectedId()) ?? null);
  readonly overdueCount = computed(() => this._actions().filter(a => a.isOverdue).length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setActions(v: ActionItemContract[]): void { this._actions.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: ActionStatus | null): void { this._filterStatus.set(v); }
  setFilterPriority(v: ActionPriority | null): void { this._filterPriority.set(v); }

  reset(): void { this._loading.set(false); this._error.set(null); this._actions.set([]); this._selectedId.set(null); this._filterStatus.set(null); this._filterPriority.set(null); }
}
