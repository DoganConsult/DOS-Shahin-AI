import { Injectable, signal, computed } from '@angular/core';
import type { PackContract, PackStatus } from '../contracts/packs.contracts';

@Injectable({ providedIn: 'root' })
export class PacksState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _packs = signal<PackContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly packs = this._packs.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._packs().length === 0);
  readonly totalCount = computed(() => this._packs().length);
  readonly selected = computed(() => this._packs().find(p => p.packId === this._selectedId()) ?? null);
  readonly publishedCount = computed(() => this._packs().filter(p => p.status === 'published').length);
  readonly installedCount = computed(() => this._packs().filter(p => p.status === 'installed').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setPacks(v: PackContract[]): void { this._packs.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._packs.set([]);
    this._selectedId.set(null);
  }
}
