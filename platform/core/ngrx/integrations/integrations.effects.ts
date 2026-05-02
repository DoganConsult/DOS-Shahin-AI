import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { IntegrationsApiService } from '../../../features/integrations/services/integrations-api.service';
import { IntegrationsActions } from './integrations.actions';

@Injectable()
export class IntegrationsEffects {
  private actions$ = inject(Actions);
  private api = inject(IntegrationsApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(IntegrationsActions.loadDashboard, IntegrationsActions.loadAll),
      switchMap(() =>
        this.api.getConnectorHealth().pipe(
          map((dashboard) => IntegrationsActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(IntegrationsActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(IntegrationsActions.loadItems, IntegrationsActions.loadAll),
      switchMap(() =>
        this.api.listConnectors().pipe(
          map((data: any) => IntegrationsActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(IntegrationsActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
