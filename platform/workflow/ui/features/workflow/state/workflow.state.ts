import { Injectable, signal, computed } from '@angular/core';

export interface WorkflowStateSnapshot {
  loading: boolean;
  error: string | null;
  selectedWorkflowId: string | null;
  filterStatus: string | null;
}

@Injectable({ providedIn: 'root' })
export class WorkflowState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedWorkflowId = signal<string | null>(null);
  private readonly _filterStatus = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedWorkflowId = this._selectedWorkflowId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  selectWorkflow(id: string | null): void { this._selectedWorkflowId.set(id); }
  setFilterStatus(status: string | null): void { this._filterStatus.set(status); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._selectedWorkflowId.set(null);
    this._filterStatus.set(null);
  }
}
