import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AnalyticsApiService } from '../../../features/analytics/services/analytics-api.service';
import { AnalyticsActions } from './analytics.actions';

@Injectable()
export class AnalyticsEffects {
  private actions$ = inject(Actions);
  private api = inject(AnalyticsApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AnalyticsActions.loadDashboard, AnalyticsActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => AnalyticsActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(AnalyticsActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
