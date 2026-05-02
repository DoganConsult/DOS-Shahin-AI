import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScopeFilterService {
  private readonly _filters = signal<Record<string, string>>({});
  readonly filters = computed(() => this._filters());

  setFilter(key: string, value: string): void {
    this._filters.update(f => ({ ...f, [key]: value }));
  }

  clearFilter(key: string): void {
    this._filters.update(f => { const { [key]: _, ...rest } = f; return rest; });
  }

  clearAll(): void {
    this._filters.set({});
  }
}
