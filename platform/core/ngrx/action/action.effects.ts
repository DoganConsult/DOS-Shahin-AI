import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ActionApiService } from '../../../features/action/services/action-api.service';
import { ActionActions } from './action.actions';

@Injectable()
export class ActionEffects {
  private actions$ = inject(Actions);
  private api = inject(ActionApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ActionActions.loadDashboard, ActionActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((dashboard) => ActionActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(ActionActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ActionActions.loadItems, ActionActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => ActionActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(ActionActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
