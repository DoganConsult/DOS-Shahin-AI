import { Injectable, signal, computed } from '@angular/core';
import type { RiskEntityContract, RiskStatus } from '../contracts/risk.contracts';

@Injectable({ providedIn: 'root' })
export class RiskState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _risks = signal<RiskEntityContract[]>([]);
  private readonly _selectedRiskId = signal<string | null>(null);
  private readonly _filterStatus = signal<RiskStatus | null>(null);
  private readonly _filterZone = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly risks = this._risks.asReadonly();
  readonly selectedRiskId = this._selectedRiskId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly filterZone = this._filterZone.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._risks().length === 0);
  readonly totalCount = computed(() => this._risks().length);
  readonly selectedRisk = computed(() => this._risks().find(r => r.riskId === this._selectedRiskId()) ?? null);
  readonly criticalCount = computed(() => this._risks().filter(r => r.likelihood >= 4 && r.impact >= 4).length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setRisks(v: RiskEntityContract[]): void { this._risks.set(v); }
  selectRisk(id: string | null): void { this._selectedRiskId.set(id); }
  setFilterStatus(v: RiskStatus | null): void { this._filterStatus.set(v); }
  setFilterZone(v: string | null): void { this._filterZone.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._risks.set([]);
    this._selectedRiskId.set(null);
    this._filterStatus.set(null);
    this._filterZone.set(null);
  }
}
