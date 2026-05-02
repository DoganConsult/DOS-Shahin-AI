import { Injectable, signal, computed } from '@angular/core';
import type { LeadershipInsightContract, LeadershipInsightStatus } from '../contracts/proactive-leadership.contracts';

@Injectable({ providedIn: 'root' })
export class ProactiveLeadershipState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _insights = signal<LeadershipInsightContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly insights = this._insights.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._insights().length === 0);
  readonly totalCount = computed(() => this._insights().length);
  readonly selected = computed(() => this._insights().find(i => i.insightId === this._selectedId()) ?? null);
  readonly pendingReviewCount = computed(() => this._insights().filter(i => i.status === 'generated').length);
  readonly actionedRate = computed(() => {
    const total = this._insights().length;
    return total ? this._insights().filter(i => i.status === 'actioned').length / total : 0;
  });

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setInsights(v: LeadershipInsightContract[]): void { this._insights.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._insights.set([]);
    this._selectedId.set(null);
  }
}
