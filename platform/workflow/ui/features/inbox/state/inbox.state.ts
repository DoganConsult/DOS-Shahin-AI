import { Injectable, signal, computed } from '@angular/core';
import type { InboxItemContract, InboxItemStatus } from '../contracts/inbox.contracts';
@Injectable({ providedIn: 'root' })
export class InboxState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _items = signal<InboxItemContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<InboxItemStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly items = this._items.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._items().length === 0);
  readonly totalCount = computed(() => this._items().length);
  readonly selected = computed(() => this._items().find(i => i.itemId === this._selectedId()) ?? null);
  readonly unreadCount = computed(() => this._items().filter(i => i.status === 'unread').length);
  readonly urgentCount = computed(() => this._items().filter(i => i.priority === 'urgent' && i.status === 'unread').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setItems(v: InboxItemContract[]): void { this._items.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: InboxItemStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._items.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
