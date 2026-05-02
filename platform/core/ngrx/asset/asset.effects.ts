import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AssetApiService } from '../../../features/asset/services/asset-api.service';
import { AssetActions } from './asset.actions';

@Injectable()
export class AssetEffects {
  private actions$ = inject(Actions);
  private api = inject(AssetApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AssetActions.loadDashboard, AssetActions.loadAll),
      switchMap(() =>
        this.api.getHomeKpis().pipe(
          map((dashboard) => AssetActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(AssetActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AssetActions.loadItems, AssetActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => AssetActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(AssetActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
