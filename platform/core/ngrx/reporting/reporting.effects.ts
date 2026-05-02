import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ReportingApiService } from '../../../features/reporting/services/reporting-api.service';
import { ReportingActions } from './reporting.actions';

@Injectable()
export class ReportingEffects {
  private actions$ = inject(Actions);
  private api = inject(ReportingApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ReportingActions.loadDashboard, ReportingActions.loadAll),
      switchMap(() =>
        this.api.getSummary().pipe(
          map((dashboard) => ReportingActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(ReportingActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadReports$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ReportingActions.loadReports, ReportingActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => ReportingActions.reportsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(ReportingActions.reportsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
