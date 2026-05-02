import { Injectable, signal, computed } from '@angular/core';
import type { PolicyContract, PolicyStatus } from '../contracts/policy.contracts';

@Injectable({ providedIn: 'root' })
export class PolicyState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _policies = signal<PolicyContract[]>([]);
  private readonly _selectedPolicyId = signal<string | null>(null);
  private readonly _filterStatus = signal<PolicyStatus | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly policies = this._policies.asReadonly();
  readonly selectedPolicyId = this._selectedPolicyId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._policies().length === 0);
  readonly totalCount = computed(() => this._policies().length);
  readonly selectedPolicy = computed(() => this._policies().find(p => p.policyId === this._selectedPolicyId()) ?? null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setPolicies(v: PolicyContract[]): void { this._policies.set(v); }
  selectPolicy(id: string | null): void { this._selectedPolicyId.set(id); }
  setFilterStatus(v: PolicyStatus | null): void { this._filterStatus.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._policies.set([]);
    this._selectedPolicyId.set(null);
    this._filterStatus.set(null);
  }
}
