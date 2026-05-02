import { Injectable, signal, computed } from '@angular/core';
import type { ConnectorContract, ConnectorStatus } from '../contracts/integrations.contracts';
@Injectable({ providedIn: 'root' })
export class IntegrationsState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _connectors = signal<ConnectorContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<ConnectorStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly connectors = this._connectors.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._connectors().length === 0);
  readonly totalCount = computed(() => this._connectors().length);
  readonly selected = computed(() => this._connectors().find(c => c.connectorId === this._selectedId()) ?? null);
  readonly errorCount = computed(() => this._connectors().filter(c => c.status === 'error').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setConnectors(v: ConnectorContract[]): void { this._connectors.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: ConnectorStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._connectors.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
