import { Injectable, signal, computed } from '@angular/core';
import type { ReportDefinitionContract, ReportStatus } from '../contracts/reports.contracts';

@Injectable({ providedIn: 'root' })
export class ReportsState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _reports = signal<ReportDefinitionContract[]>([]);
  private readonly _selectedReportId = signal<string | null>(null);
  private readonly _filterStatus = signal<ReportStatus | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly reports = this._reports.asReadonly();
  readonly selectedReportId = this._selectedReportId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._reports().length === 0);
  readonly totalCount = computed(() => this._reports().length);
  readonly selectedReport = computed(() => this._reports().find(r => r.reportId === this._selectedReportId()) ?? null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setReports(v: ReportDefinitionContract[]): void { this._reports.set(v); }
  selectReport(id: string | null): void { this._selectedReportId.set(id); }
  setFilterStatus(v: ReportStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._reports.set([]); this._selectedReportId.set(null); this._filterStatus.set(null); }
}
