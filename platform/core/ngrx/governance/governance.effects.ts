import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { GovernanceApiService } from '@app/api';
import { GovernanceActions, GovernanceOverviewDto } from './governance.actions';

@Injectable()
export class GovernanceEffects {
  private actions$ = inject(Actions);
  private api = inject(GovernanceApiService);

  loadOverview$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GovernanceActions.loadOverview, GovernanceActions.loadAll),
      switchMap(() =>
        this.api.getOverview().pipe(
          map((overview) => GovernanceActions.overviewLoaded({ overview: overview as unknown as GovernanceOverviewDto })),
          catchError((err) => of(GovernanceActions.overviewLoadFailed({ error: err?.message || 'Failed to load governance overview' }))),
        ),
      ),
    ),
  );

  loadPolicies$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GovernanceActions.loadPolicies, GovernanceActions.loadAll),
      switchMap(() =>
        this.api.getPolicies().pipe(
          map((policies) => GovernanceActions.policiesLoaded({ policies: (policies || []) as any })),
          catchError((err) => of(GovernanceActions.policiesLoadFailed({ error: err?.message || 'Failed to load policies' }))),
        ),
      ),
    ),
  );

  loadCommittees$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GovernanceActions.loadCommittees, GovernanceActions.loadAll),
      switchMap(() =>
        this.api.getCommittees().pipe(
          map((committees) => GovernanceActions.committeesLoaded({ committees: (committees || []) as any })),
          catchError((err) => of(GovernanceActions.committeesLoadFailed({ error: err?.message || 'Failed to load committees' }))),
        ),
      ),
    ),
  );
}
