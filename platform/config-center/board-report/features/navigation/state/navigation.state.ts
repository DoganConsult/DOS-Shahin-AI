import { Injectable, signal, computed } from '@angular/core';
import type { NavItemContract, NavItemStatus } from '../contracts/navigation.contracts';

@Injectable({ providedIn: 'root' })
export class NavigationState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _navItems = signal<NavItemContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly navItems = this._navItems.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._navItems().length === 0);
  readonly totalCount = computed(() => this._navItems().length);
  readonly selected = computed(() => this._navItems().find(n => n.navItemId === this._selectedId()) ?? null);
  readonly activeCount = computed(() => this._navItems().filter(n => n.status === 'active').length);
  readonly hiddenCount = computed(() => this._navItems().filter(n => n.status === 'hidden').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setNavItems(v: NavItemContract[]): void { this._navItems.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._navItems.set([]);
    this._selectedId.set(null);
  }
}
