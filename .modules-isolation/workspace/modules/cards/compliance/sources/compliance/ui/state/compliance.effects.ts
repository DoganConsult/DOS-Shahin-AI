import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ComplianceFeatureApiService } from '@app/features/compliance/services/compliance-api.service';
import { ComplianceActions } from './compliance.actions';

@Injectable()
export class ComplianceEffects {
  private actions$ = inject(Actions);
  private api = inject(ComplianceFeatureApiService);

  loadOverview$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ComplianceActions.loadOverview, ComplianceActions.loadAll),
      switchMap(() =>
        this.api.getOverview().pipe(
          map((overview) => ComplianceActions.overviewLoaded({ overview })),
          catchError((err) => of(ComplianceActions.overviewLoadFailed({ error: err?.message || 'Failed to load compliance overview' }))),
        ),
      ),
    ),
  );

  loadFrameworks$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ComplianceActions.loadFrameworks, ComplianceActions.loadAll),
      switchMap((action) =>
        this.api.getFrameworks('regulator' in action ? action.regulator : undefined).pipe(
          map((frameworks) => ComplianceActions.frameworksLoaded({ frameworks })),
          catchError((err) => of(ComplianceActions.frameworksLoadFailed({ error: err?.message || 'Failed to load frameworks' }))),
        ),
      ),
    ),
  );

  loadGaps$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ComplianceActions.loadGaps, ComplianceActions.loadAll),
      switchMap(() =>
        this.api.getGaps().pipe(
          map((data: any) => ComplianceActions.gapsLoaded({ gaps: (data?.['items'] ?? data?.['gaps'] ?? data ?? []) as any })),
          catchError((err) => of(ComplianceActions.gapsLoadFailed({ error: err?.message || 'Failed to load gaps' }))),
        ),
      ),
    ),
  );

  loadRegulatoryChanges$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(ComplianceActions.loadRegulatoryChanges, ComplianceActions.loadAll),
      switchMap(() =>
        this.api.getRegulatoryChanges().pipe(
          map((data) => ComplianceActions.regulatoryChangesLoaded({ changes: (Array.isArray(data) ? data : []) as any })),
          catchError((err) => of(ComplianceActions.regulatoryChangesLoadFailed({ error: err?.message || 'Failed to load regulatory changes' }))),
        ),
      ),
    ),
  );
}
