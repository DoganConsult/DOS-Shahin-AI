/**
 * NotificationStore — Centralized state for in-app notifications.
 *
 * Aggregates WebSocket events and API-fetched notification history
 * into a single reactive store consumed by notification bell, panels, etc.
 */
import { Injectable, inject, computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { WebSocketService, WSEvent } from '@app/websocket';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  link?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private ws = inject(WebSocketService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  /** All notifications (newest first) */
  private readonly _notifications = signal<AppNotification[]>([]);
  private _loaded = signal(false);

  readonly notifications = this._notifications.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);
  readonly recent = computed(() => this._notifications().slice(0, 20));

  constructor() {
    this.ws.reconnected$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this._loaded.set(false);
      this.loadHistory();
    });

    // Subscribe to real-time notifications from WebSocket
    this.ws.notifications$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: WSEvent) => {
      if (event.type !== 'notification.created' && event.type !== 'notification') return;
      const d = event.data as any;
      const notification: AppNotification = {
        id: d?.notificationId || d?.id || crypto.randomUUID(),
        type: d?.type || 'info',
        title: d?.title || 'Notification',
        body: d?.body || d?.message || '',
        read: false,
        createdAt: event.timestamp || new Date().toISOString(),
        entityType: d?.entityType,
        entityId: d?.entityId,
        link: d?.link,
      };
      this._notifications.update(list => [notification, ...list]);
    });
  }

  /** Load notification history from API */
  loadHistory(): void {
    if (this._loaded()) return;
    this.http.get<{ notifications: AppNotification[] }>('/api/notifications').subscribe({
      next: (res) => {
        const items = (res.notifications || []).map(n => ({ ...n, read: n.read ?? false }));
        this._notifications.set(items);
        this._loaded.set(true);
      },
      error: () => { this._loaded.set(true); },
    });
  }

  /** Mark a single notification as read */
  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.http.patch(`/api/notifications/${id}/read`, {}).subscribe({ error: () => {} });
  }

  /** Mark all as read */
  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.http.post('/api/notifications/mark-all-read', {}).subscribe({ error: () => {} });
  }

  /** Clear all notifications locally */
  clear(): void {
    this._notifications.set([]);
    this._loaded.set(false);
  }
}
