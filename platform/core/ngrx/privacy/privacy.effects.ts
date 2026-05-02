import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { PrivacyApiService } from '../../../features/privacy/services/privacy-api.service';
import { PrivacyActions } from './privacy.actions';

@Injectable()
export class PrivacyEffects {
  private actions$ = inject(Actions);
  private api = inject(PrivacyApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(PrivacyActions.loadDashboard, PrivacyActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => PrivacyActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(PrivacyActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadDsrs$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(PrivacyActions.loadDsrs, PrivacyActions.loadAll),
      switchMap(() =>
        this.api.listDsrs().pipe(
          map((data: any) => PrivacyActions.dsrsLoaded({ dsrs: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(PrivacyActions.dsrsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
