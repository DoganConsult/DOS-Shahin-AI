import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { BcpApiService } from '../../../features/bcp/services/bcp-api.service';
import { BcpActions } from './bcp.actions';

@Injectable()
export class BcpEffects {
  private actions$ = inject(Actions);
  private api = inject(BcpApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(BcpActions.loadDashboard, BcpActions.loadAll),
      switchMap(() =>
        this.api.getCrisisDashboard().pipe(
          map((dashboard) => BcpActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(BcpActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadPlans$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(BcpActions.loadPlans, BcpActions.loadAll),
      switchMap(() =>
        this.api.getBCPPlans().pipe(
          map((data: any) => BcpActions.plansLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(BcpActions.plansLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
