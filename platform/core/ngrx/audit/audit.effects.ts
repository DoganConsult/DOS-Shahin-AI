import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuditApiService } from '@app/api';
import { AuditActions } from './audit.actions';

@Injectable()
export class AuditEffects {
  private actions$ = inject(Actions);
  private api = inject(AuditApiService);

  loadOverview$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuditActions.loadOverview, AuditActions.loadAll),
      switchMap(() =>
        this.api.getAuditOverview().pipe(
          map((overview) => AuditActions.overviewLoaded({ overview: overview as any })),
          catchError((err) => of(AuditActions.overviewLoadFailed({ error: err?.message || 'Failed to load audit overview' }))),
        ),
      ),
    ),
  );

  loadPlans$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuditActions.loadPlans, AuditActions.loadAll),
      switchMap(() =>
        this.api.getAuditPlans().pipe(
          map((plans) => AuditActions.plansLoaded({ plans: (Array.isArray(plans) ? plans : []) as any })),
          catchError((err) => of(AuditActions.plansLoadFailed({ error: err?.message || 'Failed to load audit plans' }))),
        ),
      ),
    ),
  );

  loadFindings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuditActions.loadFindings, AuditActions.loadAll),
      switchMap(() =>
        this.api.getAuditFindings().pipe(
          map((findings) => AuditActions.findingsLoaded({ findings: (Array.isArray(findings) ? findings : []) as any })),
          catchError((err) => of(AuditActions.findingsLoadFailed({ error: err?.message || 'Failed to load audit findings' }))),
        ),
      ),
    ),
  );
}
