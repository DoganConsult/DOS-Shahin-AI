import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { EvidenceApiService } from '../../../features/evidence/services/evidence-api.service';
import { EvidenceActions } from './evidence.actions';

@Injectable()
export class EvidenceEffects {
  private actions$ = inject(Actions);
  private api = inject(EvidenceApiService);

  loadDashboard$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(EvidenceActions.loadDashboard, EvidenceActions.loadAll),
      switchMap(() =>
        this.api.getBreakdown().pipe(
          map((dashboard) => EvidenceActions.dashboardLoaded({ dashboard })),
          catchError((err) => of(EvidenceActions.dashboardLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );

  loadItems$ = createEffect((): any =>
    this.actions$.pipe(
      ofType(EvidenceActions.loadItems, EvidenceActions.loadAll),
      switchMap(() =>
        this.api.getEvidence().pipe(
          map((data: any) => EvidenceActions.itemsLoaded({ items: data.data || data.items || data, total: data.total ?? 0 })),
          catchError((err) => of(EvidenceActions.itemsLoadFailed({ error: err?.message || 'Failed' }))),
        ),
      ),
    ),
  );
}
