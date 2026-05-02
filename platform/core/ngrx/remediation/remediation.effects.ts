import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { RemediationApiService } from '../../../features/remediation/services/remediation-api.service';
import { RemediationActions } from './remediation.actions';

@Injectable()
export class RemediationEffects {
  private actions$ = inject(Actions);
  private api = inject(RemediationApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RemediationActions.loadDashboard, RemediationActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((dashboard) => RemediationActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(RemediationActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadTasks$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RemediationActions.loadTasks, RemediationActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => RemediationActions.tasksLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(RemediationActions.tasksLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
