import { Injectable, signal, computed } from '@angular/core';
import type { KsaObligationContract, KsaObligationStatus } from '../contracts/ksa-regulatory.contracts';

@Injectable({ providedIn: 'root' })
export class KsaRegulatoryState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _obligations = signal<KsaObligationContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _filterBody = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly obligations = this._obligations.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._obligations().length === 0);
  readonly totalCount = computed(() => this._obligations().length);
  readonly selected = computed(() => this._obligations().find(o => o.obligationId === this._selectedId()) ?? null);
  readonly nonCompliantCount = computed(() => this._obligations().filter(o => o.status === 'non_compliant').length);
  readonly remediationCount = computed(() => this._obligations().filter(o => o.status === 'remediation').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setObligations(v: KsaObligationContract[]): void { this._obligations.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterBody(v: string | null): void { this._filterBody.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._obligations.set([]);
    this._selectedId.set(null);
    this._filterBody.set(null);
  }
}
