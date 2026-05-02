import { Injectable, signal, computed } from '@angular/core';
import type { ReportDefinitionContract, ReportStatus } from '../contracts/reporting.contracts';

@Injectable({ providedIn: 'root' })
export class ReportingState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _reports = signal<ReportDefinitionContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly reports = this._reports.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._reports().length === 0);
  readonly totalCount = computed(() => this._reports().length);
  readonly selected = computed(() => this._reports().find(r => r.reportId === this._selectedId()) ?? null);
  readonly overdueCount = computed(() => this._reports().filter(r => r.nextScheduledAt && new Date(r.nextScheduledAt) < new Date()).length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setReports(v: ReportDefinitionContract[]): void { this._reports.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._reports.set([]);
    this._selectedId.set(null);
  }
}
