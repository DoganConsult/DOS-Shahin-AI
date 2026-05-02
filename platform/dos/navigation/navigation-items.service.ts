import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import type { NavItem } from '../../core/platform/navigation/navigation.models';

/**
 * NavigationItemsService — loads dynamic navigation items from the backend.
 * DOS owns navigation and shell composition (Patch 1, Patch 10).
 */
@Injectable({ providedIn: 'root' })
export class NavigationItemsService {
  private readonly _items = signal<NavItem[]>([]);
  private readonly _error = signal<string | null>(null);
  private readonly _loading = signal(false);

  readonly items = computed(() => this._items());
  readonly error = computed(() => this._error());
  readonly loading = computed(() => this._loading());

  constructor(private http: HttpClient) {}

  async loadNavItems(module: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const items = await this.http
        .get<NavItem[]>(`${environment.apiUrl}/platform/navigation/items`, { params: { module } })
        .toPromise();
      this._items.set(items ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load navigation items';
      this._error.set(message);
      this._items.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  async refresh(module: string): Promise<void> {
    return this.loadNavItems(module);
  }
}
