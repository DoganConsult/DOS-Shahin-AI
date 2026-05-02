import { Injectable, signal, computed } from '@angular/core';
import type { AssetContract, AssetStatus, AssetType } from '../contracts/asset.contracts';

@Injectable({ providedIn: 'root' })
export class AssetState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _assets = signal<AssetContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<AssetStatus | null>(null); private readonly _filterType = signal<AssetType | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly assets = this._assets.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly(); readonly filterType = this._filterType.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._assets().length === 0);
  readonly totalCount = computed(() => this._assets().length);
  readonly selected = computed(() => this._assets().find(a => a.assetId === this._selectedId()) ?? null);
  readonly criticalCount = computed(() => this._assets().filter(a => a.classification === 'critical').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setAssets(v: AssetContract[]): void { this._assets.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: AssetStatus | null): void { this._filterStatus.set(v); } setFilterType(v: AssetType | null): void { this._filterType.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._assets.set([]); this._selectedId.set(null); this._filterStatus.set(null); this._filterType.set(null); }
}
