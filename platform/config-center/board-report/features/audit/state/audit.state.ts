import { Injectable, signal, computed } from '@angular/core';
import type { AuditEngagementContract, AuditEngagementStatus } from '../contracts/audit.contracts';

@Injectable({ providedIn: 'root' })
export class AuditState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _engagements = signal<AuditEngagementContract[]>([]);
  private readonly _selectedEngagementId = signal<string | null>(null);
  private readonly _filterStatus = signal<AuditEngagementStatus | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly engagements = this._engagements.asReadonly();
  readonly selectedEngagementId = this._selectedEngagementId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._engagements().length === 0);
  readonly totalCount = computed(() => this._engagements().length);
  readonly selectedEngagement = computed(() => this._engagements().find(e => e.engagementId === this._selectedEngagementId()) ?? null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setEngagements(v: AuditEngagementContract[]): void { this._engagements.set(v); }
  selectEngagement(id: string | null): void { this._selectedEngagementId.set(id); }
  setFilterStatus(v: AuditEngagementStatus | null): void { this._filterStatus.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._engagements.set([]);
    this._selectedEngagementId.set(null);
    this._filterStatus.set(null);
  }
}
