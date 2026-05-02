import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { InboxApiService } from '@app/features/inbox/services/inbox-api.service';
import { InboxActions } from './inbox.actions';

@Injectable()
export class InboxEffects {
  private actions$ = inject(Actions);
  private api = inject(InboxApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(InboxActions.loadDashboard, InboxActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => InboxActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(InboxActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadMessages$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(InboxActions.loadMessages, InboxActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => InboxActions.messagesLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(InboxActions.messagesLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
