import { Injectable, signal, computed } from '@angular/core';
import type { WidgetDefinitionContract, WidgetStatus } from '../contracts/widgets.contracts';

@Injectable({ providedIn: 'root' })
export class WidgetsState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _widgets = signal<WidgetDefinitionContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly widgets = this._widgets.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._widgets().length === 0);
  readonly totalCount = computed(() => this._widgets().length);
  readonly selected = computed(() => this._widgets().find(w => w.widgetId === this._selectedId()) ?? null);
  readonly activeCount = computed(() => this._widgets().filter(w => w.status === 'active').length);
  readonly deprecatedCount = computed(() => this._widgets().filter(w => w.status === 'deprecated').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setWidgets(v: WidgetDefinitionContract[]): void { this._widgets.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._widgets.set([]);
    this._selectedId.set(null);
  }
}
