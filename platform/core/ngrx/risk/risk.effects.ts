import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, mergeMap } from 'rxjs/operators';
import { RiskApiService } from '@risk-module/ui/features/risk/services/risk-api.service';
import { RiskActions } from './risk.actions';

@Injectable()
export class RiskEffects {
  private actions$ = inject(Actions);
  private api = inject(RiskApiService);

  loadOverview$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadOverview, RiskActions.loadAll),
      switchMap(() =>
        this.api.getOverview().pipe(
          map((overview) => RiskActions.overviewLoaded({ overview })),
          catchError((err) => of(RiskActions.overviewLoadFailed({ error: err?.message || 'Failed to load risk overview' }))),
        ),
      ),
    ),
  );

  loadRegister$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadRegister),
      switchMap(({ params }) =>
        this.api.getRegister(params).pipe(
          map((data: any) => RiskActions.registerLoaded({ risks: data.risks, count: data.count })),
          catchError((err) => of(RiskActions.registerLoadFailed({ error: err?.message || 'Failed to load risk register' }))),
        ),
      ),
    ),
  );

  loadAllRegister$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadAll),
      switchMap(() =>
        this.api.getRegister().pipe(
          map((data: any) => RiskActions.registerLoaded({ risks: data.risks, count: data.count })),
          catchError((err) => of(RiskActions.registerLoadFailed({ error: err?.message || 'Failed to load risk register' }))),
        ),
      ),
    ),
  );

  loadHeatmap$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadHeatmap),
      switchMap((action) =>
        this.api.getHeatmap(action.mode).pipe(
          map((heatmap) => RiskActions.heatmapLoaded({ heatmap })),
          catchError((err) => of(RiskActions.heatmapLoadFailed({ error: err?.message || 'Failed to load heatmap' }))),
        ),
      ),
    ),
  );

  loadKRIs$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadKRIs),
      switchMap(() =>
        this.api.getKRIs().pipe(
          map((data: any) => RiskActions.kRIsLoaded({ kris: data.kris })),
          catchError((err) => of(RiskActions.kRIsLoadFailed({ error: err?.message || 'Failed to load KRIs' }))),
        ),
      ),
    ),
  );

  loadAllHeatmap$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadAll),
      switchMap(() =>
        this.api.getHeatmap('residual').pipe(
          map((heatmap) => RiskActions.heatmapLoaded({ heatmap })),
          catchError((err) => of(RiskActions.heatmapLoadFailed({ error: err?.message || 'Failed to load heatmap' }))),
        ),
      ),
    ),
  );

  loadAllKRIs$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.loadAll),
      switchMap(() =>
        this.api.getKRIs().pipe(
          map((data: any) => RiskActions.kRIsLoaded({ kris: data.kris })),
          catchError((err) => of(RiskActions.kRIsLoadFailed({ error: err?.message || 'Failed to load KRIs' }))),
        ),
      ),
    ),
  );

  updateRisk$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(RiskActions.updateRisk),
      mergeMap(({ riskId, patch }) =>
        this.api.updateRisk(riskId, patch).pipe(
          map((risk) => RiskActions.riskUpdated({ risk })),
          catchError((err) => of(RiskActions.riskUpdateFailed({ riskId, error: err?.message || 'Failed to update risk' }))),
        ),
      ),
    ),
  );
}
