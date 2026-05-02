import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ExceptionApiService } from '../../../features/exception/services/exception-api.service';
import { ExceptionActions } from './exception.actions';

@Injectable()
export class ExceptionEffects {
  private actions$ = inject(Actions);
  private api = inject(ExceptionApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ExceptionActions.loadDashboard, ExceptionActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((dashboard) => ExceptionActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(ExceptionActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ExceptionActions.loadItems, ExceptionActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => ExceptionActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(ExceptionActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
