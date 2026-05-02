import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { QiyasApiService } from '../../../features/qiyas/services/qiyas-api.service';
import { QiyasActions } from './qiyas.actions';

@Injectable()
export class QiyasEffects {
  private actions$ = inject(Actions);
  private api = inject(QiyasApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(QiyasActions.loadDashboard, QiyasActions.loadAll),
      switchMap(() =>
        this.api.getSummary().pipe(
          map((dashboard) => QiyasActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(QiyasActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(QiyasActions.loadItems, QiyasActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => QiyasActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(QiyasActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
