import { Injectable, signal, computed } from '@angular/core';
import type { QiyasAssessmentContract, QiyasAssessmentStatus } from '../contracts/qiyas.contracts';
@Injectable({ providedIn: 'root' })
export class QiyasState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _assessments = signal<QiyasAssessmentContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<QiyasAssessmentStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly assessments = this._assessments.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._assessments().length === 0);
  readonly totalCount = computed(() => this._assessments().length);
  readonly selected = computed(() => this._assessments().find(a => a.assessmentId === this._selectedId()) ?? null);
  readonly latestScore = computed(() => { const published = this._assessments().filter(a => a.status === 'published').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); return published[0]?.overallScore ?? null; });
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setAssessments(v: QiyasAssessmentContract[]): void { this._assessments.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: QiyasAssessmentStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._assessments.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
