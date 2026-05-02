import { Injectable, signal, computed } from '@angular/core';
import type { RemediationContract, RemediationStatus, RemediationPriority } from '../contracts/remediation.contracts';

@Injectable({ providedIn: 'root' })
export class RemediationState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _remediations = signal<RemediationContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<RemediationStatus | null>(null);
  private readonly _filterPriority = signal<RemediationPriority | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly remediations = this._remediations.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly filterPriority = this._filterPriority.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._remediations().length === 0);
  readonly totalCount = computed(() => this._remediations().length);
  readonly selected = computed(() => this._remediations().find(r => r.remediationId === this._selectedId()) ?? null);
  readonly overdueCount = computed(() => this._remediations().filter(r => r.isOverdue).length);
  readonly blockedCount = computed(() => this._remediations().filter(r => r.status === 'blocked').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setRemediations(v: RemediationContract[]): void { this._remediations.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: RemediationStatus | null): void { this._filterStatus.set(v); }
  setFilterPriority(v: RemediationPriority | null): void { this._filterPriority.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._remediations.set([]);
    this._selectedId.set(null);
    this._filterStatus.set(null);
    this._filterPriority.set(null);
  }
}
