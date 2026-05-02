import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { FoundationApiService } from '../services/foundation-api.service';
import { FoundationActions } from './foundation.actions';

@Injectable()
export class FoundationEffects {
  private actions$ = inject(Actions);
  private api = inject(FoundationApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(FoundationActions.loadDashboard, FoundationActions.loadAll),
      switchMap(() =>
        this.api.getOverviewData().pipe(
          map((dashboard) => FoundationActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(FoundationActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadConfigs$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(FoundationActions.loadConfigs, FoundationActions.loadAll),
      switchMap(() =>
        this.api.getLookups().pipe(
          map((data: any) => FoundationActions.configsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(FoundationActions.configsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
