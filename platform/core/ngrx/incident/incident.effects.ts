import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { IncidentApiService } from '../../../features/incident/services/incident-api.service';
import { IncidentActions } from './incident.actions';

@Injectable()
export class IncidentEffects {
  private actions$ = inject(Actions);
  private api = inject(IncidentApiService);

  loadIncidents$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IncidentActions.loadIncidents, IncidentActions.loadAll),
      switchMap(() =>
        this.api.getIncidents().pipe(
          map((data: any) => IncidentActions.incidentsLoaded({ incidents: (Array.isArray(data) ? data : data?.incidents ?? []) as any })),
          catchError((err) => of(IncidentActions.incidentsLoadFailed({ error: err?.message || 'Failed to load incidents' }))),
        ),
      ),
    ),
  );

  loadNearMisses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IncidentActions.loadNearMisses, IncidentActions.loadAll),
      switchMap(() =>
        this.api.getNearMisses().pipe(
          map((nearMisses) => IncidentActions.nearMissesLoaded({ nearMisses: (nearMisses || []) as any })),
          catchError((err) => of(IncidentActions.nearMissesLoadFailed({ error: err?.message || 'Failed to load near misses' }))),
        ),
      ),
    ),
  );

  loadTrends$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IncidentActions.loadTrends, IncidentActions.loadAll),
      switchMap(() =>
        this.api.getTrends().pipe(
          map((trends) => IncidentActions.trendsLoaded({ trends: trends as Record<string, unknown> })),
          catchError((err) => of(IncidentActions.trendsLoadFailed({ error: err?.message || 'Failed to load incident trends' }))),
        ),
      ),
    ),
  );
}
