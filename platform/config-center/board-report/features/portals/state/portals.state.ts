import { Injectable, signal, computed } from '@angular/core';
import type { PortalContract, PortalStatus } from '../contracts/portals.contracts';
@Injectable({ providedIn: 'root' })
export class PortalsState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _portals = signal<PortalContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<PortalStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly portals = this._portals.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._portals().length === 0);
  readonly totalCount = computed(() => this._portals().length);
  readonly selected = computed(() => this._portals().find(p => p.portalId === this._selectedId()) ?? null);
  readonly publishedCount = computed(() => this._portals().filter(p => p.status === 'published').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setPortals(v: PortalContract[]): void { this._portals.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: PortalStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._portals.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
