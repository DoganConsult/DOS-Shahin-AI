import { Injectable, signal, computed } from '@angular/core';
import type { IncidentContract, IncidentStatus, IncidentSeverity } from '../contracts/incident.contracts';

@Injectable({ providedIn: 'root' })
export class IncidentState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _incidents = signal<IncidentContract[]>([]);
  private readonly _selectedIncidentId = signal<string | null>(null);
  private readonly _filterStatus = signal<IncidentStatus | null>(null);
  private readonly _filterSeverity = signal<IncidentSeverity | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly incidents = this._incidents.asReadonly();
  readonly selectedIncidentId = this._selectedIncidentId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly filterSeverity = this._filterSeverity.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._incidents().length === 0);
  readonly totalCount = computed(() => this._incidents().length);
  readonly selectedIncident = computed(() => this._incidents().find(i => i.incidentId === this._selectedIncidentId()) ?? null);
  readonly criticalCount = computed(() => this._incidents().filter(i => i.severity === 'critical').length);
  readonly openCount = computed(() => this._incidents().filter(i => !['closed', 'archived'].includes(i.status)).length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setIncidents(v: IncidentContract[]): void { this._incidents.set(v); }
  selectIncident(id: string | null): void { this._selectedIncidentId.set(id); }
  setFilterStatus(v: IncidentStatus | null): void { this._filterStatus.set(v); }
  setFilterSeverity(v: IncidentSeverity | null): void { this._filterSeverity.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._incidents.set([]);
    this._selectedIncidentId.set(null);
    this._filterStatus.set(null);
    this._filterSeverity.set(null);
  }
}
