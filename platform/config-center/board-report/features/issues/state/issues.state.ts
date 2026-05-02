import { Injectable, signal, computed } from '@angular/core';
import type { IssueContract, IssueStatus } from '../contracts/issues.contracts';
@Injectable({ providedIn: 'root' })
export class IssuesState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _issues = signal<IssueContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<IssueStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly issues = this._issues.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._issues().length === 0);
  readonly totalCount = computed(() => this._issues().length);
  readonly selected = computed(() => this._issues().find(i => i.issueId === this._selectedId()) ?? null);
  readonly openCount = computed(() => this._issues().filter(i => !['closed', 'archived'].includes(i.status)).length);
  readonly overdueCount = computed(() => this._issues().filter(i => i.isOverdue).length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setIssues(v: IssueContract[]): void { this._issues.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: IssueStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._issues.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
