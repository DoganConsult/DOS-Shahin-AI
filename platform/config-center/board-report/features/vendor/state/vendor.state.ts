import { Injectable, signal, computed } from '@angular/core';
import type { VendorContract, VendorStatus } from '../contracts/vendor.contracts';

@Injectable({ providedIn: 'root' })
export class VendorState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _vendors = signal<VendorContract[]>([]);
  private readonly _selectedVendorId = signal<string | null>(null);
  private readonly _filterStatus = signal<VendorStatus | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly vendors = this._vendors.asReadonly();
  readonly selectedVendorId = this._selectedVendorId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._vendors().length === 0);
  readonly totalCount = computed(() => this._vendors().length);
  readonly selectedVendor = computed(() => this._vendors().find(v => v.vendorId === this._selectedVendorId()) ?? null);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setVendors(v: VendorContract[]): void { this._vendors.set(v); }
  selectVendor(id: string | null): void { this._selectedVendorId.set(id); }
  setFilterStatus(v: VendorStatus | null): void { this._filterStatus.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._vendors.set([]);
    this._selectedVendorId.set(null);
    this._filterStatus.set(null);
  }
}
