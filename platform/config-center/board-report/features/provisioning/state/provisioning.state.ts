import { Injectable, signal, computed } from '@angular/core';
import type { ProvisioningJobContract, ProvisioningJobStatus } from '../contracts/provisioning.contracts';
@Injectable({ providedIn: 'root' })
export class ProvisioningState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _jobs = signal<ProvisioningJobContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<ProvisioningJobStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly jobs = this._jobs.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._jobs().length === 0);
  readonly totalCount = computed(() => this._jobs().length);
  readonly selected = computed(() => this._jobs().find(j => j.jobId === this._selectedId()) ?? null);
  readonly failedCount = computed(() => this._jobs().filter(j => j.status === 'failed').length);
  readonly activeCount = computed(() => this._jobs().filter(j => ['queued', 'validating', 'running', 'waiting'].includes(j.status)).length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setJobs(v: ProvisioningJobContract[]): void { this._jobs.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: ProvisioningJobStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._jobs.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
