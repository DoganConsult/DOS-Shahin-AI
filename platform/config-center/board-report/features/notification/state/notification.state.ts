import { Injectable, signal, computed } from '@angular/core';
import type { NotificationContract, NotificationStatus } from '../contracts/notification.contracts';
@Injectable({ providedIn: 'root' })
export class NotificationState {
  private readonly _loading = signal(false); private readonly _error = signal<string | null>(null);
  private readonly _notifications = signal<NotificationContract[]>([]); private readonly _selectedId = signal<string | null>(null);
  private readonly _filterStatus = signal<NotificationStatus | null>(null);
  readonly loading = this._loading.asReadonly(); readonly error = this._error.asReadonly();
  readonly notifications = this._notifications.asReadonly(); readonly selectedId = this._selectedId.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._notifications().length === 0);
  readonly totalCount = computed(() => this._notifications().length);
  readonly selected = computed(() => this._notifications().find(n => n.notificationId === this._selectedId()) ?? null);
  readonly unreadCount = computed(() => this._notifications().filter(n => n.status === 'delivered').length);
  readonly failedCount = computed(() => this._notifications().filter(n => n.status === 'failed').length);
  setLoading(v: boolean): void { this._loading.set(v); } setError(v: string | null): void { this._error.set(v); }
  setNotifications(v: NotificationContract[]): void { this._notifications.set(v); } selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterStatus(v: NotificationStatus | null): void { this._filterStatus.set(v); }
  reset(): void { this._loading.set(false); this._error.set(null); this._notifications.set([]); this._selectedId.set(null); this._filterStatus.set(null); }
}
