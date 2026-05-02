import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AdminApiService } from '../../../features/admin/services/admin-api.service';
import { AdminActions } from './admin.actions';

@Injectable()
export class AdminEffects {
  private actions$ = inject(Actions);
  private api = inject(AdminApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AdminActions.loadDashboard, AdminActions.loadAll),
      switchMap(() =>
        this.api.getSummary().pipe(
          map((dashboard) => AdminActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(AdminActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadTenants$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(AdminActions.loadTenants, AdminActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => AdminActions.tenantsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(AdminActions.tenantsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
