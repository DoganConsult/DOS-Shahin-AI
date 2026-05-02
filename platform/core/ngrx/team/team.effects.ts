import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TeamApiService } from '../../../features/team/services/team-api.service';
import { TeamActions } from './team.actions';

@Injectable()
export class TeamEffects {
  private actions$ = inject(Actions);
  private api = inject(TeamApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(TeamActions.loadDashboard, TeamActions.loadAll),
      switchMap(() =>
        this.api.getDashboard().pipe(
          map((dashboard) => TeamActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(TeamActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadMembers$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(TeamActions.loadMembers, TeamActions.loadAll),
      switchMap(() =>
        this.api.list().pipe(
          map((data: any) => TeamActions.membersLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(TeamActions.membersLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
