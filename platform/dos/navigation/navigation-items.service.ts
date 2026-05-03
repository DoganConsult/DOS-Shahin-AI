import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { NavItem } from '../../core/platform/navigation/navigation.models';

@Injectable({ providedIn: 'root' })
export class NavigationItemsService {
  private readonly _items = signal<NavItem[]>([]);
  private readonly _error = signal<string | null>(null);
  private readonly _loading = signal(false);

  readonly items = computed(() => this._items());
  readonly error = computed(() => this._error());
  readonly loading = computed(() => this._loading());

  constructor(private readonly http: HttpClient) { }

  async loadNavItems(module: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const items = await firstValueFrom(
        this.http.get<NavItem[]>(`${environment.apiUrl}/platform/navigation/items`, {
          params: { module },
        }),
      );

      this._items.set(items ?? []);
    } catch (err) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load navigation items');
      this._items.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  refresh(module: string): Promise<void> {
    return this.loadNavItems(module);
  }
}