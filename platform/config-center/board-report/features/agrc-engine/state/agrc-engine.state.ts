import { Injectable, signal, computed } from '@angular/core';
import type { EngineRuleContract, EngineRunStatus } from '../contracts/agrc-engine.contracts';
@Injectable({ providedIn: 'root' })
export class AgrcEngineState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _rules = signal<EngineRuleContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly rules = this._rules.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._rules().length === 0);
  readonly totalCount = computed(() => this._rules().length);
  readonly selected = computed(() => this._rules().find(r => r.ruleId === this._selectedId()) ?? null);
  readonly enabledCount = computed(() => this._rules().filter(r => r.enabled).length);
  readonly failedCount = computed(() => this._rules().filter(r => r.lastRunStatus === 'failed').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setRules(v: EngineRuleContract[]): void { this._rules.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  reset(): void { this._loading.set(false); this._error.set(null); this._rules.set([]); this._selectedId.set(null); }
}
