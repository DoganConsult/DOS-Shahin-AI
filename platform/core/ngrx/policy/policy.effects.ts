import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { PolicyApiService } from '../../../features/policy/services/policy-api.service';
import { PolicyActions } from './policy.actions';

@Injectable()
export class PolicyEffects {
  private actions$ = inject(Actions);
  private api = inject(PolicyApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(PolicyActions.loadDashboard, PolicyActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((dashboard) => PolicyActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(PolicyActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(PolicyActions.loadItems, PolicyActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => PolicyActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(PolicyActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
