import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { IssuesApiService } from '../../../features/issues/services/issues-api.service';
import { IssuesActions } from './issues.actions';

@Injectable()
export class IssuesEffects {
  private actions$ = inject(Actions);
  private api = inject(IssuesApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(IssuesActions.loadDashboard, IssuesActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => IssuesActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(IssuesActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(IssuesActions.loadItems, IssuesActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => IssuesActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(IssuesActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
