import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { NotificationsApiService } from '@app/core/services/api-clients/notifications-api.service';
import { NotificationActions, AppNotificationDto } from './notification.actions';

@Injectable()
export class NotificationEffects {
  private actions$ = inject(Actions);
  private api = inject(NotificationsApiService);

  loadHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.loadHistory),
      switchMap(() =>
        this.api.list().pipe(
          map((notifications: any[]) => NotificationActions.historyLoaded({
            notifications: (notifications || []).map((n: any) => ({
              id: n.id ?? n['id'],
              type: n.type ?? n['type'] ?? '',
              title: n.title ?? n['title'] ?? '',
              body: n.message ?? n.body ?? n['message'] ?? n['body'] ?? '',
              read: n.read ?? n['read'] ?? false,
              createdAt: n.createdAt ?? n['createdAt'] ?? '',
              entityType: n.entityType ?? n['entityType'],
              entityId: n.entityId ?? n['entityId'],
              link: n.link ?? n['link'],
            }) as AppNotificationDto),
          })),
          catchError((err) => of(NotificationActions.historyLoadFailed({ error: err?.message || 'Failed to load notifications' }))),
        ),
      ),
    ),
  );

  markRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.markRead),
      switchMap(({ id }) =>
        this.api.markRead(id).pipe(
          map(() => NotificationActions.markReadSuccess({ id })),
          catchError((err) => {
            console.error(`[Notification] markRead failed for ${id}:`, err?.message);
            return of(NotificationActions.markReadSuccess({ id }));
          }),
        ),
      ),
    ),
  );

  markAllRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.markAllRead),
      switchMap(() =>
        this.api.markAllRead().pipe(
          map(() => NotificationActions.markAllReadSuccess()),
          catchError((err) => {
            console.error('[Notification] markAllRead failed:', err?.message);
            return of(NotificationActions.markAllReadSuccess());
          }),
        ),
      ),
    ),
  );
}
