import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { PortalsApiService } from '../../../features/portals/services/portals-api.service';
import { PortalsActions } from './portals.actions';

@Injectable()
export class PortalsEffects {
  private actions$ = inject(Actions);
  private api = inject(PortalsApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(PortalsActions.loadDashboard, PortalsActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => PortalsActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(PortalsActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(PortalsActions.loadItems, PortalsActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => PortalsActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(PortalsActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
