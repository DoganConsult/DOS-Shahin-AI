import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { RecordsApiService } from '../../../features/records/services/records-api.service';
import { RecordsActions } from './records.actions';

@Injectable()
export class RecordsEffects {
  private actions$ = inject(Actions);
  private api = inject(RecordsApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RecordsActions.loadDashboard, RecordsActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => RecordsActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(RecordsActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RecordsActions.loadItems, RecordsActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => RecordsActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(RecordsActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
